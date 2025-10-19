// /api/__tests__/matchLineups.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// --- Mock MongoDB helper ---
jest.mock('../../../lib/mongodb.js', () => ({
  getMatchLineupsCollection: jest.fn(),
}));

const { getMatchLineupsCollection } = require('../../../lib/mongodb');
const handler = require('../../../api/match-lineups'); // adjust path if needed
const { details } = require('framer-motion/client');

// --- Mock response helper ---
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
}

async function runHandler(req) {
  const res = mockResponse();
  await handler(req, res);
  return res;
}

// --- Test suite ---
describe('match-lineups API', () => {
  let mockCollection;

  beforeEach(() => {
    mockCollection = {
      find: jest.fn(() => ({ toArray: jest.fn() })),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    getMatchLineupsCollection.mockResolvedValue(mockCollection);
  });

  afterEach(() => jest.clearAllMocks());

  // ------------------- GET lineups -------------------
  it('GET returns lineups for a given matchId', async () => {
    const fakeLineups = [
      { matchId: 101, teamId: 1, teamName: 'Arsenal', players: [] },
      { matchId: 101, teamId: 2, teamName: 'Chelsea', players: [] },
    ];
    const toArrayMock = jest.fn().mockResolvedValue(fakeLineups);
    mockCollection.find.mockReturnValue({ toArray: toArrayMock });

    const req = { method: 'GET', query: { matchId: '101' } };
    const res = await runHandler(req);

    expect(getMatchLineupsCollection).toHaveBeenCalled();
    expect(mockCollection.find).toHaveBeenCalledWith({ matchId: 101 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeLineups);
  });

  it('GET missing matchId returns 400', async () => {
    const req = { method: 'GET', query: {} };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'matchId is required' });
  });

  // ------------------- POST lineups -------------------
  it('POST saves a valid lineup (string IDs)', async () => {
    const reqBody = {
      matchId: '200',
      teamId: '5',
      teamName: 'Liverpool',
      formation: '4-3-3',
    };
    mockCollection.updateOne.mockResolvedValue({});

    const req = { method: 'POST', query: {}, body: reqBody };
    const res = await runHandler(req);

    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      { matchId: 200, teamId: 5 },
      expect.objectContaining({
        $set: expect.objectContaining({
          matchId: 200,
          teamId: 5,
          teamName: 'Liverpool',
        }),
      }),
      { upsert: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Lineup saved',
        lineup: expect.objectContaining({
          teamName: 'Liverpool',
          matchId: 200,
          teamId: 5,
        }),
      })
    );
  });

  it('POST missing required fields returns 400', async () => {
    const req = { method: 'POST', query: {}, body: {} }; // add empty query
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'matchId, teamId, teamName required',
    });
  });

  // ------------------- DELETE lineups -------------------
  it('DELETE removes lineup for given matchId and teamId', async () => {
    mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const req = { method: 'DELETE', query: { matchId: '500', teamId: '25' } };
    const res = await runHandler(req);

    expect(mockCollection.deleteOne).toHaveBeenCalledWith({ matchId: 500, teamId: 25 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Lineup deleted' });
  });

  it('DELETE missing params returns 400', async () => {
    const req = { method: 'DELETE', query: { matchId: '10' } };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'matchId and teamId required',
    });
  });

  // ------------------- Method not allowed -------------------
  it('returns 405 for unsupported methods', async () => {
    const req = { method: 'PUT', query: {} };
    const res = await runHandler(req);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST', 'DELETE']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith(expect.stringMatching(/Method PUT Not Allowed/));
  });

  // ------------------- Internal server error -------------------
  it('Handles internal server error', async () => {
    getMatchLineupsCollection.mockRejectedValue(new Error('DB crashed'));

    const req = { method: 'GET', query: { matchId: '101' } };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      details: 'DB crashed',
    });
  });
});
