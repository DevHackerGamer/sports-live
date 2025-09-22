global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const handler = require('../../../api/favoriteTeams');
const { getFavoriteTeamsCollection, getUsersInfoCollection } = require('../../../lib/mongodb');

jest.mock('../../../lib/mongodb.js', () => ({
  getFavoriteTeamsCollection: jest.fn(),
  getUsersInfoCollection: jest.fn(),
}));

// Mock Express-like req/res
function mockReqRes({ method = 'GET', url = '/api/favoriteTeams', query = {}, body = {} } = {}) {
  const json = jest.fn();
  const end = jest.fn();
  const status = jest.fn(() => ({ json, end }));
  const setHeader = jest.fn();
  const res = { status, setHeader, end, json };
  const req = { method, url, query, body, headers: {} };
  return { req, res, json, status, setHeader, end };
}

describe('Favorite Teams API', () => {
  let mockFavorites, mockUsers;

  beforeEach(() => {
    mockFavorites = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    mockUsers = {
      updateOne: jest.fn(),
    };
    getFavoriteTeamsCollection.mockResolvedValue(mockFavorites);
    getUsersInfoCollection.mockResolvedValue(mockUsers);
  });

  afterEach(() => jest.clearAllMocks());

  test('GET /api/favoriteTeams returns favorites', async () => {
    mockFavorites.toArray.mockResolvedValue([{ userId: 'u1', teamId: 1 }]);
    const { req, res, json } = mockReqRes({ method: 'GET', query: { userId: 'u1' } });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      favorites: [{ userId: 'u1', teamId: 1 }],
      total: 1
    }));
  });

  test('POST /api/favoriteTeams adds a favorite', async () => {
    mockFavorites.findOne.mockResolvedValue(null);
    mockFavorites.insertOne.mockResolvedValue({ insertedId: 'f1' });
    const { req, res, json } = mockReqRes({
      method: 'POST',
      body: { userId: 'u1', teamId: 1, teamName: 'Team A' }
    });
    await handler(req, res);
    expect(mockFavorites.insertOne).toHaveBeenCalled();
    expect(mockUsers.updateOne).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      favoriteId: 'f1'
    }));
  });

  test('POST fails if missing fields', async () => {
    const { req, res, json } = mockReqRes({ method: 'POST', body: { userId: 'u1' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'userId, teamId, and teamName are required' }));
  });

  test('POST fails if team already exists', async () => {
    mockFavorites.findOne.mockResolvedValue({ userId: 'u1', teamId: 1 });
    const { req, res, json } = mockReqRes({
      method: 'POST',
      body: { userId: 'u1', teamId: 1, teamName: 'Team A' }
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Team already in favorites' }));
  });

  test('DELETE /api/favoriteTeams removes a favorite', async () => {
    mockFavorites.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const { req, res, json } = mockReqRes({ method: 'DELETE', query: { userId: 'u1', teamId: 1 } });
    await handler(req, res);
    expect(mockFavorites.deleteOne).toHaveBeenCalled();
    expect(mockUsers.updateOne).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true, deleted: true }));
  });

  test('DELETE returns 404 if not found', async () => {
    mockFavorites.deleteOne.mockResolvedValue({ deletedCount: 0 });
    const { req, res, json } = mockReqRes({ method: 'DELETE', query: { userId: 'u1', teamId: 1 } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Favorite team not found' }));
  });

  test('method not allowed returns 405', async () => {
    const { req, res, end } = mockReqRes({ method: 'PUT' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(end).toHaveBeenCalled();
  });

  test('internal error returns 500', async () => {
    getFavoriteTeamsCollection.mockRejectedValue(new Error('DB fail'));
    const { req, res, json } = mockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Failed to fetch favorite teams' }));
  });
});
