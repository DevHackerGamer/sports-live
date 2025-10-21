// /api/__tests__/footballNews.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// --- Mock MongoDB helper ---
jest.mock('../../../lib/mongodb.js', () => ({
  getFootballNewsCollection: jest.fn(),
}));

const { getFootballNewsCollection } = require('../../../lib/mongodb');
const handler = require('../../../api/football-news'); 

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
describe('football-news API', () => {
  let mockCollection;
  let mockCursor;

  beforeEach(() => {
    mockCursor = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
    };

    mockCollection = {
      find: jest.fn(() => mockCursor),
      deleteMany: jest.fn(),
    };

    getFootballNewsCollection.mockResolvedValue(mockCollection);
  });

  afterEach(() => jest.clearAllMocks());

  // ------------------- GET all news -------------------
  it('GET all football news (no league filter)', async () => {
    const fakeNews = [
      { title: 'Premier League title race heats up', leagueCode: 'EPL' },
      { title: 'Serie A top 4 battle continues', leagueCode: 'SA' },
    ];
    mockCursor.toArray.mockResolvedValue(fakeNews);

    const req = { method: 'GET', query: {} };
    const res = await runHandler(req);

    expect(getFootballNewsCollection).toHaveBeenCalled();
    expect(mockCollection.find).toHaveBeenCalledWith({});
    expect(mockCursor.sort).toHaveBeenCalledWith({ published: -1 });
    expect(mockCursor.limit).toHaveBeenCalledWith(20);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeNews);
  });

  // ------------------- GET with leagueCode filter -------------------
  it('GET football news filtered by leagueCode', async () => {
    const fakeNews = [
      { title: 'Arsenal beat City', leagueCode: 'EPL' },
    ];
    mockCursor.toArray.mockResolvedValue(fakeNews);

    const req = { method: 'GET', query: { leagueCode: 'EPL', limit: '10' } };
    const res = await runHandler(req);

    expect(mockCollection.find).toHaveBeenCalledWith({ leagueCode: 'EPL' });
    expect(mockCursor.limit).toHaveBeenCalledWith(10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeNews);
  });

  // ------------------- GET returns empty array -------------------
  it('GET returns empty array if no news found', async () => {
    mockCursor.toArray.mockResolvedValue([]);

    const req = { method: 'GET', query: {} };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  // ------------------- DELETE all news -------------------
  it('DELETE all news (no league filter)', async () => {
    mockCollection.deleteMany.mockResolvedValue({ deletedCount: 5 });

    const req = { method: 'DELETE', query: {} };
    const res = await runHandler(req);

    expect(mockCollection.deleteMany).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deletedCount: 5 });
  });

  // ------------------- DELETE by leagueCode -------------------
  it('DELETE news filtered by leagueCode', async () => {
    mockCollection.deleteMany.mockResolvedValue({ deletedCount: 2 });

    const req = { method: 'DELETE', query: { leagueCode: 'EPL' } };
    const res = await runHandler(req);

    expect(mockCollection.deleteMany).toHaveBeenCalledWith({ leagueCode: 'EPL' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deletedCount: 2 });
  });

  // ------------------- Method not allowed -------------------
  it('returns 405 for unsupported methods', async () => {
    const req = { method: 'POST', query: {} };
    const res = await runHandler(req);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'DELETE']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method POST not allowed' });
  });

  // ------------------- Internal server error -------------------
  it('Handles internal server error', async () => {
    getFootballNewsCollection.mockRejectedValue(new Error('DB down'));

    const req = { method: 'GET', query: {} };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
