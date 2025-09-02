// /api/__tests__/createMatch.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const { ObjectId } = require('mongodb');

// Mock MongoDB helpers
jest.mock('../../../lib/mongodb.js', () => ({
  getAdminMatchesCollection: jest.fn(),
}));

const { getAdminMatchesCollection } = require('../../../lib/mongodb');
const handler = require('../../../api/createdMatches'); // adjust path

// Helper to create mock response object
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
}

// Run handler
async function runHandler(req) {
  const res = mockResponse();
  await handler(req, res);
  return res;
}

describe('createdMatches API', () => {
  let mockCollection;

  beforeEach(() => {
    mockCollection = {
      find: jest.fn(),
      toArray: jest.fn(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    getAdminMatchesCollection.mockResolvedValue(mockCollection);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------- GET all matches ----------------
  it('GET all matches', async () => {
    const fakeMatches = [
      { homeTeam: { name: { en: 'TeamA' } }, awayTeam: { name: { en: 'TeamB' } }, competition: { name: { en: 'Comp' } }, createdByAdmin: true },
    ];
    mockCollection.find.mockReturnValue({ toArray: () => fakeMatches });

    const res = await runHandler({ method: 'GET', query: {} });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ teamA: 'TeamA', teamB: 'TeamB', competition: 'Comp' })
    ]));
  });

  // ---------------- GET single match ----------------
  it('GET single match', async () => {
    const match = { id: '123', createdByAdmin: true };
    mockCollection.findOne.mockResolvedValue(match);

    const res = await runHandler({ method: 'GET', query: { id: '123' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(match);
  });

  it('GET single match wrong id -> error checker', async () => {
    mockCollection.findOne.mockResolvedValue(null);

    const res = await runHandler({ method: 'GET', query: { id: '999' } });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Match not found' });
  });

  // ---------------- POST match ----------------
  it('POST valid match to the Admin created matchs', async () => {
    const req = {
      method: 'POST',
      query: {},
      body: { homeTeam: 'TeamA', awayTeam: 'TeamB', date: '2025-09-01', time: '18:00', competition: 'League' },
    };
    mockCollection.insertOne.mockResolvedValue({});

    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(201);
    const created = res.json.mock.calls[0][0];
    expect(created.homeTeam.name.en).toBe('TeamA');
    expect(created.awayTeam.name.en).toBe('TeamB');
    expect(created.competitionName).toBe('League');
    expect(created.createdByAdmin).toBe(true);
  });

  it('POST missing required fields', async () => {
    const req = { method: 'POST', query: {}, body: { homeTeam: 'TeamA' } };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
  });

  it('POST valid match (object teams, no competition)', async () => {
    const req = {
      method: 'POST',
      query: {},
      body: { homeTeam: { id: 'h1', name: { en: 'HomeTeam' } }, awayTeam: { id: 'a1', name: { en: 'AwayTeam' } }, date: '2025-09-01', time: '20:00' },
    };
    mockCollection.insertOne.mockResolvedValue({});

    const res = await runHandler(req);
    expect(res.status).toHaveBeenCalledWith(201);
    const created = res.json.mock.calls[0][0];
    expect(created.homeTeam.name.en).toBe('HomeTeam');
    expect(created.competition.name.en).toBe('Unknown Competition');
  });

  // ---------------- DELETE match ----------------
  it('DELETE success from th admin created matches', async () => {
    mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const res = await runHandler({ method: 'DELETE', query: { id: new ObjectId().toString() } });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Match deleted successfully' });
  });

  it('DELETE invalid id in Admin created matches', async () => {
    const res = await runHandler({ method: 'DELETE', query: { id: 'bad-id' } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid id format' });
  });

  it('DELETE not found', async () => {
    mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });
    const res = await runHandler({ method: 'DELETE', query: { id: new ObjectId().toString() } });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Match not found' });
  });

  // ---------------- Method not allowed ----------------
  it('Method not allowed', async () => {
    const req = { method: 'PUT', query: {} };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith(expect.stringMatching(/Method PUT Not Allowed/));
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST', 'DELETE']);
  });

  // ---------------- Internal server error ----------------
  it('Handles internal server error', async () => {
    getAdminMatchesCollection.mockRejectedValue(new Error('DB down'));
    const req = { method: 'GET', query: {} };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error', details: 'DB down' });
  });
});
 