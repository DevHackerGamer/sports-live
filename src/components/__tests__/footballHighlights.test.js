// /api/__tests__/footballHighlights.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// --- Mock MongoDB helper ---
jest.mock('../../../lib/mongodb.js', () => ({
  getFootballHighlightsCollection: jest.fn(),
}));

const { getFootballHighlightsCollection } = require('../../../lib/mongodb');
const handler = require('../../../api/football-highlights'); // adjust path as needed

// --- Mock response utility ---
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
describe('footballHighlights API', () => {
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
    };

    getFootballHighlightsCollection.mockResolvedValue(mockCollection);
  });

  afterEach(() => jest.clearAllMocks());

  // ------------------- GET all highlights -------------------
  it('GET all football highlights (no league filter)', async () => {
    const fakeHighlights = [
      { title: 'Arsenal vs Chelsea 4-2', leagueName: 'Premier League' },
      { title: 'Inter vs Milan 3-1', leagueName: 'Serie A' },
    ];

    mockCursor.toArray.mockResolvedValue(fakeHighlights);

    const req = { method: 'GET', query: {} };
    const res = await runHandler(req);

    expect(getFootballHighlightsCollection).toHaveBeenCalled();
    expect(mockCollection.find).toHaveBeenCalledWith({});
    expect(mockCursor.sort).toHaveBeenCalledWith({ publishedAt: -1 });
    expect(mockCursor.limit).toHaveBeenCalledWith(12);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeHighlights);
  });

  // ------------------- GET highlights filtered by league -------------------
  it('GET highlights filtered by leagueName', async () => {
    const fakeHighlights = [
      { title: 'Liverpool vs City 2-2', leagueName: 'Premier League' },
    ];

    mockCursor.toArray.mockResolvedValue(fakeHighlights);

    const req = { method: 'GET', query: { leagueName: 'Premier League' } };
    const res = await runHandler(req);

    expect(mockCollection.find).toHaveBeenCalledWith({ leagueName: 'Premier League' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeHighlights);
  });

  // ------------------- GET empty highlights list -------------------
  it('GET returns empty array if no highlights found', async () => {
    mockCursor.toArray.mockResolvedValue([]);

    const req = { method: 'GET', query: {} };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  // ------------------- Handles internal server error -------------------
  it('Handles internal server error gracefully', async () => {
    getFootballHighlightsCollection.mockRejectedValue(new Error('DB down'));

    const req = { method: 'GET', query: {} };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch highlights' });
  });
});
