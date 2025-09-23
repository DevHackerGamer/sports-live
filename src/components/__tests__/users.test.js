global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const handler = require('../../../api/userFavorites');
const { getUsersCollection } = require('../../../lib/mongodb');
const { ObjectId } = require('mongodb');

jest.mock('../../../lib/mongodb.js', () => ({
  getUsersCollection: jest.fn(),
}));

// Mock Express-like req/res
function mockReqRes({ method = 'GET', url = '/api/users/u1/favorites', query = {}, body = {} } = {}) {
  const json = jest.fn();
  const end = jest.fn();
  const status = jest.fn(() => ({ json, end }));
  const setHeader = jest.fn();
  const res = { status, setHeader, end, json };
  const req = { method, url, query, body, headers: {} };
  return { req, res, json, status, setHeader, end };
}

describe('User Favorites API', () => {
  let mockUsers;

  beforeEach(() => {
    mockUsers = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };
    getUsersCollection.mockResolvedValue(mockUsers);
  });

  afterEach(() => jest.clearAllMocks());

  test('GET returns user favorites', async () => {
    mockUsers.findOne.mockResolvedValue({ userId: 'u1', favorites: ['Team A', 'Team B'] });
    const { req, res, json } = mockReqRes({ method: 'GET', url: '/api/users/u1/favorites' });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: ['Team A', 'Team B'],
      userId: 'u1'
    }));
  });

  test('GET returns empty array if user has no favorites', async () => {
    mockUsers.findOne.mockResolvedValue({ userId: 'u2' });
    const { req, res, json } = mockReqRes({ method: 'GET', url: '/api/users/u2/favorites' });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: [],
      userId: 'u2'
    }));
  });

  test('POST adds a favorite team', async () => {
    mockUsers.updateOne.mockResolvedValue({ matchedCount: 1 });
    const { req, res, json } = mockReqRes({
      method: 'POST',
      url: '/api/users/u1/favorites',
      body: { teamName: 'Team X' }
    });
    await handler(req, res);
    expect(mockUsers.updateOne).toHaveBeenCalledWith(
      { userId: 'u1' },
      expect.objectContaining({ $addToSet: { favorites: 'Team X' } }),
      { upsert: true }
    );
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Favorite team added successfully',
      teamName: 'Team X'
    }));
  });

  test('POST fails if teamName is missing', async () => {
    const { req, res, json } = mockReqRes({ method: 'POST', url: '/api/users/u1/favorites', body: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Team name is required' }));
  });

  test('DELETE removes a favorite team', async () => {
    mockUsers.updateOne.mockResolvedValue({ matchedCount: 1 });
    const { req, res, json } = mockReqRes({ method: 'DELETE', url: '/api/users/u1/favorites/Team%20X' });
    await handler(req, res);
    expect(mockUsers.updateOne).toHaveBeenCalledWith(
      { userId: 'u1' },
      expect.objectContaining({ $pull: { favorites: 'Team X' } })
    );
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Favorite team removed successfully',
      teamName: 'Team X'
    }));
  });

  test('DELETE returns 404 if user not found', async () => {
    mockUsers.updateOne.mockResolvedValue({ matchedCount: 0 });
    const { req, res, json } = mockReqRes({ method: 'DELETE', url: '/api/users/u99/favorites/Team%20X' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'User not found' }));
  });

  test('PUT updates user favorites', async () => {
    mockUsers.updateOne.mockResolvedValue({ matchedCount: 1 });
    const { req, res, json } = mockReqRes({
      method: 'PUT',
      url: '/api/users/u1/favorites',
      body: { favorites: ['Team A', 'Team B'] }
    });
    await handler(req, res);
    expect(mockUsers.updateOne).toHaveBeenCalledWith(
      { userId: 'u1' },
      expect.objectContaining({ $set: expect.objectContaining({ favorites: ['Team A', 'Team B'] }) }),
      { upsert: true }
    );
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'User favorites updated successfully',
      favorites: ['Team A', 'Team B']
    }));
  });

  test('PUT fails if favorites is not an array', async () => {
    const { req, res, json } = mockReqRes({ method: 'PUT', url: '/api/users/u1/favorites', body: { favorites: 'Team A' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Favorites must be an array' }));
  });

  test('method not allowed returns 405', async () => {
    const { req, res, end } = mockReqRes({ method: 'PATCH', url: '/api/users/u1/favorites' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(end).toHaveBeenCalled();
  });

  test('internal error returns 500', async () => {
    getUsersCollection.mockRejectedValue(new Error('DB fail'));
    const { req, res, json } = mockReqRes({ method: 'GET', url: '/api/users/u1/favorites' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'Internal server error' }));
  });
});
