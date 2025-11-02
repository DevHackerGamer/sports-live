global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// ---- Mock MongoDB helpers ----
jest.mock('../../../lib/mongodb.js', () => ({
  getMatchCommentaryCollection: jest.fn(),
  getMatchCommentaryCollectionESPN: jest.fn(),
}));

const {
  getMatchCommentaryCollection,
  getMatchCommentaryCollectionESPN,
} = require('../../../lib/mongodb');

const handler = require('../../../api/match-commentary'); // adjust path if needed

// ---- Helper to mock response ----
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
}

// ---- Helper to run handler ----
async function runHandler(req) {
  const res = mockResponse();
  await handler(req, res);
  return res;
}

describe('match-commentary API', () => {
  let mockCollection;
  let mockCollectionESPN;

  beforeEach(() => {
    mockCollection = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      createIndex: jest.fn(),
    };
    mockCollectionESPN = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
      createIndex: jest.fn(),
    };
    getMatchCommentaryCollection.mockResolvedValue(mockCollection);
    getMatchCommentaryCollectionESPN.mockResolvedValue(mockCollectionESPN);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------- GET commentary ----------------
  it('GET without matchId returns 400', async () => {
    const res = await runHandler({ method: 'GET', query: {} });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing matchId parameter' });
  });

  it('GET returns commentary array (from ESPN collection)', async () => {
    const fakeCommentary = [{ time: "12'", text: 'Goal!' }];
    mockCollectionESPN.findOne.mockResolvedValue({
      matchId: '123',
      commentary: fakeCommentary,
    });
    mockCollection.findOne.mockResolvedValue(null);

    const res = await runHandler({ method: 'GET', query: { matchId: '123' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([{ time: "12'", text: 'Goal!' }])
    );
  });

  it('GET returns merged commentary from both collections', async () => {
    const legacyCommentary = [{ time: "5'", text: 'Foul' }];
    const espnCommentary = [{ time: "10'", text: 'Shot on goal' }];

    mockCollection.findOne.mockResolvedValue({
      matchId: '321',
      commentary: legacyCommentary,
    });
    mockCollectionESPN.findOne.mockResolvedValue({
      matchId: '321',
      commentary: espnCommentary,
    });

    const res = await runHandler({ method: 'GET', query: { matchId: '321' } });

    expect(mockCollection.updateOne).toHaveBeenCalled();
    expect(mockCollectionESPN.updateOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].length).toBeGreaterThan(0);
  });

  it('GET returns empty array if no docs found', async () => {
    mockCollection.findOne.mockResolvedValue(null);
    mockCollectionESPN.findOne.mockResolvedValue(null);

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
    mockCollectionESPN.findOne.mockResolvedValue(null);

    const res = await runHandler({ method: 'POST', body: { matchId: '123', newComment } });

    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      { matchId: '123' },
      expect.objectContaining({
        $push: { commentary: newComment },
        $set: expect.any(Object),
      }),
      { upsert: true }
    );
    expect(mockCollectionESPN.updateOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Commentary updated successfully' });
  });

  it('POST overwrites commentary array if overwrite=true', async () => {
    const commentary = [{ time: "1'", text: 'Kickoff' }];
    mockCollection.findOne.mockResolvedValue({ commentary });
    mockCollectionESPN.findOne.mockResolvedValue({ commentary });

    const res = await runHandler({
      method: 'POST',
      body: { matchId: '123', commentary, overwrite: true },
    });

    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      { matchId: '123' },
      expect.objectContaining({
        $set: expect.objectContaining({ commentary }),
      }),
      { upsert: true }
    );
    expect(mockCollectionESPN.updateOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Commentary updated successfully' });
  });

  it('POST without newComment or commentary array returns 400', async () => {
    const res = await runHandler({ method: 'POST', body: { matchId: '123' } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No newComment or commentary array provided',
    });
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
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  // ---------------- Internal server error ----------------
  it('Handles internal server error', async () => {
    getMatchCommentaryCollection.mockRejectedValue(new Error('DB down'));
    const res = await runHandler({ method: 'GET', query: { matchId: '123' } });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
