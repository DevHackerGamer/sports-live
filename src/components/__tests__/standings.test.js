global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const handler = require('../../../api/standings');
const { getStandingsCollection, getTeamsCollection } = require('../../../lib/mongodb');

jest.mock('../../../lib/mongodb.js', () => ({
  getStandingsCollection: jest.fn(),
  getTeamsCollection: jest.fn(),
}));

jest.mock('../../../lib/auth', () => ({
  isAdmin: jest.fn(),
}));
const { isAdmin } = require('../../../lib/auth');

// Mock Express-like req/res
function mockReqRes({ method = 'GET', url = '/api/standings', query = {}, body = {} } = {}) {
  const json = jest.fn();
  const end = jest.fn();
  const status = jest.fn(() => ({ json, end }));
  const setHeader = jest.fn();
  const res = { status, setHeader, end, json };
  const req = { method, url, query, body, headers: {} };
  return { req, res, json, status, setHeader, end };
}

describe('Standings API', () => {
  let mockStandings, mockTeams;

  beforeEach(() => {
    mockStandings = {
      find: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    mockTeams = {
      find: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
    };
    getStandingsCollection.mockResolvedValue(mockStandings);
    getTeamsCollection.mockResolvedValue(mockTeams);
    isAdmin.mockResolvedValue(true);
  });

  afterEach(() => jest.clearAllMocks());

  test('OPTIONS request returns 200', async () => {
    const { req, res, end } = mockReqRes({ method: 'OPTIONS' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(end).toHaveBeenCalled();
  });

  test('GET /api/standings returns enriched standings', async () => {
    mockStandings.toArray.mockResolvedValue([
      { _id: 'BL1-2025', standings: [{ table: [{ team: { id: 1 } }] }] }
    ]);
    mockTeams.toArray.mockResolvedValue([{ id: 1, crest: 'crest-1' }]);

    const { req, res, json } = mockReqRes({ method: 'GET', query: { limit: '1' } });
    await handler(req, res);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      count: 1,
      data: expect.any(Array),
      filters: expect.any(Object)
    }));

    const result = json.mock.calls[0][0];
    expect(result.data[0].standings[0].table[0].team.crest).toBe('crest-1');
  });

  test('GET /api/standings/:id returns single document', async () => {
    mockStandings.findOne.mockResolvedValue({ _id: 'BL1-2025' });
    const { req, res, json } = mockReqRes({ url: '/api/standings/BL1-2025' });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { _id: 'BL1-2025' } }));
  });

  test('GET /api/standings/:id returns 404 if not found', async () => {
    mockStandings.findOne.mockResolvedValue(null);
    const { req, res, json } = mockReqRes({ url: '/api/standings/NOTFOUND' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('POST /api/standings creates document', async () => {
    mockStandings.insertOne.mockResolvedValue({ insertedId: 'newId' });
    const { req, res, json } = mockReqRes({ method: 'POST', body: { competition: 'BL1' } });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true, id: 'newId' }));
  });

  test('PUT /api/standings/:id updates document', async () => {
    mockStandings.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const { req, res, json } = mockReqRes({ method: 'PUT', url: '/api/standings/BL1-2025', body: { type: 'HOME' } });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true, modified: true }));
  });

  test('PUT /api/standings/:id returns 404 if no document matched', async () => {
    mockStandings.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
    const { req, res, json } = mockReqRes({ method: 'PUT', url: '/api/standings/BL1-404', body: { type: 'AWAY' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('DELETE /api/standings/:id removes document', async () => {
    mockStandings.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const { req, res, json } = mockReqRes({ method: 'DELETE', url: '/api/standings/BL1-2025' });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true, deleted: true }));
  });

  test('DELETE /api/standings/:id returns 404 if nothing deleted', async () => {
    mockStandings.deleteOne.mockResolvedValue({ deletedCount: 0 });
    const { req, res, json } = mockReqRes({ method: 'DELETE', url: '/api/standings/NONE' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('forbidden if not admin', async () => {
    isAdmin.mockResolvedValue(false);
    const { req, res, json } = mockReqRes({ method: 'POST', body: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('method not allowed returns 405', async () => {
    const { req, res, json } = mockReqRes({ method: 'PATCH' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('internal error returns 500', async () => {
    getStandingsCollection.mockRejectedValue(new Error('DB fail'));
    const { req, res, json } = mockReqRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  // -------- EXTRA FILTER + EDGE CASE TESTS --------

  test('GET applies competition and season filters correctly', async () => {
    const { req, res, json } = mockReqRes({
      method: 'GET',
      query: { competition: 'BL1', season: '2025' },
    });
    await handler(req, res);
    expect(mockStandings.find).toHaveBeenCalledWith(expect.objectContaining({
      competition: expect.any(RegExp),
      season: '2025',
    }));
    expect(json).toHaveBeenCalled();
  });

  test('GET with numeric filter id does not use regex', async () => {
    const { req, res } = mockReqRes({
      method: 'GET',
      query: { competition: '1234' },
    });
    await handler(req, res);
    const arg = mockStandings.find.mock.calls[0][0];
    expect(typeof arg.competition).toBe('number');
  });

  test('GET with invalid limit falls back to default', async () => {
    const { req, res } = mockReqRes({ method: 'GET', query: { limit: 'abc' } });
    await handler(req, res);
    expect(mockStandings.limit).toHaveBeenCalledWith(100);
  });

  test('GET enriches standings but preserves existing crest', async () => {
    mockStandings.toArray.mockResolvedValue([
      { _id: 'BL1-2025', standings: [{ table: [{ team: { id: 1, crest: 'already' } }] }] }
    ]);
    mockTeams.toArray.mockResolvedValue([{ id: 1, crest: 'crest-1' }]);

    const { req, res, json } = mockReqRes({ method: 'GET' });
    await handler(req, res);
    const result = json.mock.calls[0][0];
    expect(result.data[0].standings[0].table[0].team.crest).toBe('already');
  });

  test('GET enriches standings but leaves crest undefined if not found', async () => {
    mockStandings.toArray.mockResolvedValue([
      { _id: 'BL1-2025', standings: [{ table: [{ team: { id: 99 } }] }] }
    ]);
    mockTeams.toArray.mockResolvedValue([{ id: 1, crest: 'crest-1' }]);

    const { req, res, json } = mockReqRes({ method: 'GET' });
    await handler(req, res);
    const result = json.mock.calls[0][0];
    expect(result.data[0].standings[0].table[0].team.crest).toBeUndefined();
  });
});
