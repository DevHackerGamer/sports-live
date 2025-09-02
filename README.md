global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const handler = require('../../../api/matches');
const { getMatchesCollection, getTeamsCollection } = require('../../../lib/mongodb');
const { ObjectId } = require('mongodb');

jest.mock('../../../lib/mongodb.js', () => ({
  getMatchesCollection: jest.fn(),
  getTeamsCollection: jest.fn(),
}));

// ✅ Correct path for isAdmin
jest.mock('../../../lib/auth', () => ({
  isAdmin: jest.fn(),
}));
const { isAdmin } = require('../../../lib/auth');

// Utility to make a mock Express-like req/res
function mockReqRes({ method = 'GET', url = '/api/matches', query = {}, body = {} } = {}) {
  const json = jest.fn();
  const end = jest.fn();
  const status = jest.fn(() => ({ json, end }));
  const setHeader = jest.fn();
  const res = { status, setHeader, end, json };
  const req = { method, url, query, body, headers: {} };
  return { req, res, json, status, setHeader, end };
}

describe('matches API handler', () => {
  let mockMatches, mockTeams;

  beforeEach(() => {
    mockMatches = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };
    mockTeams = {
      find: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
    };
    getMatchesCollection.mockResolvedValue(mockMatches);
    getTeamsCollection.mockResolvedValue(mockTeams);
    isAdmin.mockResolvedValue(true);
  });

  afterEach(() => jest.clearAllMocks());

  test('OPTIONS returns 200', async () => {
    const { req, res, end } = mockReqRes({ method: 'OPTIONS' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(end).toHaveBeenCalled();
  });

  test('GET /api/matches returns enriched matches', async () => {
    mockMatches.toArray.mockResolvedValue([
      { id: 1, homeTeam: { id: 100 }, awayTeam: { name: 'Team A' } },
    ]);
    mockTeams.toArray.mockResolvedValue([
      { id: 100, name: 'Home', crest: 'crest-home' },
      { name: 'Team A', crest: 'crest-away' },
    ]);

    const { req, res, json } = mockReqRes({
      method: 'GET',
      url: '/api/matches',
      query: { limit: '1', competition: 'PL' },
    });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.any(Array),
      count: 1,
    }));
    expect(mockMatches.find).toHaveBeenCalledWith(expect.objectContaining({
      'competition.name': expect.any(RegExp),
    }));
    // Check crest enrichment
    const result = json.mock.calls[0][0];
    expect(result.data[0].homeTeam.crest).toBe('crest-home');
    expect(result.data[0].awayTeam.crest).toBe('crest-away');
  });

  test('GET /api/matches/:id returns match', async () => {
    mockMatches.findOne.mockResolvedValue({ id: 2 });
    const { req, res, json } = mockReqRes({ url: '/api/matches/2' });
    await handler(req, res);
    expect(mockMatches.findOne).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ data: { id: 2 } }));
  });

  test('GET /api/matches/:id/events returns events', async () => {
    mockMatches.findOne.mockResolvedValue({ id: 2, events: [{ id: 'e1' }] });
    const { req, res, json } = mockReqRes({ url: '/api/matches/2/events' });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      data: [{ id: 'e1' }],
    }));
  });

  test('GET returns 404 if match not found', async () => {
    mockMatches.findOne.mockResolvedValue(null);
    const { req, res, json } = mockReqRes({ url: '/api/matches/99' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('POST /api/matches/:id/events adds event', async () => {
    mockMatches.findOne.mockResolvedValue({ id: 2 });
    mockMatches.updateOne.mockResolvedValue({ modifiedCount: 1 });
    const { req, res, json } = mockReqRes({
      method: 'POST',
      url: '/api/matches/2/events',
      body: { type: 'goal', team: 'Home' },
    });
    await handler(req, res);
    expect(mockMatches.updateOne).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('POST forbidden if not admin', async () => {
    isAdmin.mockResolvedValue(false);
    const { req, res, json } = mockReqRes({ method: 'POST', url: '/api/matches/2/events' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('PUT /api/matches/:id updates match', async () => {
    mockMatches.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const { req, res, json } = mockReqRes({
      method: 'PUT',
      url: '/api/matches/2',
      body: { referee: 'John' },
    });
    await handler(req, res);
    expect(mockMatches.updateOne).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('PUT /api/matches/:id/events/:eventId updates event', async () => {
    mockMatches.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const { req, res, json } = mockReqRes({
      method: 'PUT',
      url: '/api/matches/2/events/ev1',
      body: { description: 'Update' },
    });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('DELETE /api/matches/:id/events/:eventId removes event', async () => {
    mockMatches.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const { req, res, json } = mockReqRes({
      method: 'DELETE',
      url: '/api/matches/2/events/ev1',
    });
    await handler(req, res);
    expect(mockMatches.updateOne).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('method not allowed returns 405', async () => {
    const { req, res, json } = mockReqRes({ method: 'PATCH' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('internal error returns 500', async () => {
    getMatchesCollection.mockRejectedValue(new Error('DB fail'));
    const { req, res, json } = mockReqRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
