// /api/__tests__/users.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

jest.mock('../../../lib/mongodb.js', () => ({
  getUsersCollection: jest.fn(),
}));

const { getUsersCollection } = require('../../../lib/mongodb');
const handler = require('../../../api/users'); // adjust path

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

describe('users API - favorites', () => {
  let mockUsersCol;

  beforeEach(() => {
    mockUsersCol = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };
    getUsersCollection.mockResolvedValue(mockUsersCol);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------- OPTIONS ----------------
  it('OPTIONS returns 200', async () => {
    const res = await runHandler({ method: 'OPTIONS', url: '/api/users/123/favorites' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  // ---------------- GET ----------------
  it('GET user favorites success', async () => {
    mockUsersCol.findOne.mockResolvedValue({ favorites: ['TeamA', 'TeamB'] });
    const res = await runHandler({ method: 'GET', url: '/api/users/123/favorites' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: ['TeamA', 'TeamB'],
      userId: '123',
    });
  });

  it('GET user favorites error', async () => {
    mockUsersCol.findOne.mockRejectedValue(new Error('DB fail'));
    const res = await runHandler({ method: 'GET', url: '/api/users/123/favorites' });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Failed to fetch user favorites',
    }));
  });

  // ---------------- POST ----------------
  it('POST add favorite team success', async () => {
    mockUsersCol.updateOne.mockResolvedValue({ matchedCount: 1 });
    const res = await runHandler({
      method: 'POST',
      url: '/api/users/123/favorites',
      body: { teamName: 'TeamX' },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Favorite team added successfully',
      teamName: 'TeamX',
    });
  });

  it('POST missing teamName', async () => {
    const res = await runHandler({ method: 'POST', url: '/api/users/123/favorites', body: {} });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Team name is required',
    });
  });

  it('POST error', async () => {
    mockUsersCol.updateOne.mockRejectedValue(new Error('DB fail'));
    const res = await runHandler({ method: 'POST', url: '/api/users/123/favorites', body: { teamName: 'X' } });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Failed to add favorite team',
    }));
  });

  // ---------------- PUT ----------------
  it('PUT update favorites success', async () => {
    mockUsersCol.updateOne.mockResolvedValue({ matchedCount: 1 });
    const res = await runHandler({
      method: 'PUT',
      url: '/api/users/123/favorites',
      body: { favorites: ['TeamA', 'TeamB'] },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'User favorites updated successfully',
      favorites: ['TeamA', 'TeamB'],
    });
  });

  it('PUT invalid favorites', async () => {
    const res = await runHandler({ method: 'PUT', url: '/api/users/123/favorites', body: { favorites: 'not-array' } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Favorites must be an array',
    });
  });

  it('PUT error', async () => {
    mockUsersCol.updateOne.mockRejectedValue(new Error('DB fail'));
    const res = await runHandler({ method: 'PUT', url: '/api/users/123/favorites', body: { favorites: [] } });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Failed to update user favorites',
    }));
  });

  // ---------------- DELETE ----------------
  it('DELETE favorite success', async () => {
    mockUsersCol.updateOne.mockResolvedValue({ matchedCount: 1 });
    const res = await runHandler({ method: 'DELETE', url: '/api/users/123/favorites/TeamA' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Favorite team removed successfully',
      teamName: 'TeamA',
    });
  });

  it('DELETE missing teamName', async () => {
    const res = await runHandler({ method: 'DELETE', url: '/api/users/123/favorites' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Team name is required for deletion',
    });
  });

  it('DELETE user not found', async () => {
    mockUsersCol.updateOne.mockResolvedValue({ matchedCount: 0 });
    const res = await runHandler({ method: 'DELETE', url: '/api/users/123/favorites/TeamA' });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'User not found',
    });
  });

  it('DELETE error', async () => {
    mockUsersCol.updateOne.mockRejectedValue(new Error('DB fail'));
    const res = await runHandler({ method: 'DELETE', url: '/api/users/123/favorites/TeamA' });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Failed to remove favorite team',
    }));
  });

  // ---------------- Method not allowed ----------------
  it('Method not allowed', async () => {
    const res = await runHandler({ method: 'PATCH', url: '/api/users/123/favorites' });
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Method not allowed',
    });
  });
});