global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock MongoDB helpers
jest.mock('../../../lib/mongodb.js', () => ({
  getMatchCommentaryCollection: jest.fn(),
}));

const { getMatchCommentaryCollection } = require('../../../lib/mongodb');
const handler = require('../../../api/match-commentary'); // adjust path

// Helper to mock response object
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
}

// Helper to run handler
async function runHandler(req) {
  const res = mockResponse();
  await handler(req, res);
  return res;
}

describe('match-commentary API', () => {
  let mockCollection;

  beforeEach(() => {
    mockCollection = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    getMatchCommentaryCollection.mockResolvedValue(mockCollection);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------- GET commentary ----------------
  it('GET without matchId returns 400', async () => {
    const res = await runHandler({ method: 'GET', query: {} });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing matchId parameter' });
  });

  it('GET returns commentary array', async () => {
    const fakeCommentary = [{ time: "12'", text: 'Goal!' }];
    mockCollection.findOne.mockResolvedValue({ matchId: '123', commentary: fakeCommentary });

    const res = await runHandler({ method: 'GET', query: { matchId: '123' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeCommentary);
  });

  it('GET returns empty array if no doc', async () => {
    mockCollection.findOne.mockResolvedValue(null);

    const res = await runHandler({ method: 'GET', query: { matchId: '999' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  // ---------------- POST commentary ----------------
  it('POST without matchId returns 400', async () => {
    const res = await runHandler({ method: 'POST', body: {} });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing matchId in request body' });
  });

  it('POST appends newComment if provided', async () => {
    const newComment = { time: "45'", text: 'Half-time!' };
    mockCollection.findOne.mockResolvedValue(null);

    const res = await runHandler({ method: 'POST', body: { matchId: '123', newComment } });

    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      { matchId: '123' },
      expect.objectContaining({ $push: { commentary: newComment } }),
      { upsert: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Commentary updated successfully' });
  });

  it('POST overwrites commentary array if overwrite=true', async () => {
    const commentary = [{ time: "1'", text: 'Kickoff' }];
    mockCollection.findOne.mockResolvedValue({ commentary });

    const res = await runHandler({ method: 'POST', body: { matchId: '123', commentary, overwrite: true } });

    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      { matchId: '123' },
      expect.objectContaining({ $set: expect.objectContaining({ commentary }) }),
      { upsert: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Commentary updated successfully' });
  });

  it('POST without newComment or commentary array returns 400', async () => {
    const res = await runHandler({ method: 'POST', body: { matchId: '123' } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No newComment or commentary array provided' });
  });

  // ---------------- DELETE commentary ----------------
  it('DELETE without matchId returns 400', async () => {
    const res = await runHandler({ method: 'DELETE', query: {} });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing matchId parameter' });
  });

  it('DELETE valid request deletes commentary', async () => {
    const res = await runHandler({ method: 'DELETE', query: { matchId: '123' } });

    expect(mockCollection.deleteOne).toHaveBeenCalledWith({ matchId: '123' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Commentary deleted' });
  });

  // ---------------- Method not allowed ----------------
  it('Unsupported method returns 405', async () => {
    const res = await runHandler({ method: 'PUT', query: {} });
    expect(res.status).toHaveBeenCalledWith(405);
  });

  // ---------------- Internal server error ----------------
  it('Handles internal server error', async () => {
    getMatchCommentaryCollection.mockRejectedValue(new Error('DB down'));
    const res = await runHandler({ method: 'GET', query: { matchId: '123' } });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
