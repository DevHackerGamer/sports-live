// /api/__tests__/favoriteTeams.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

jest.mock('../../../lib/mongodb.js', () => ({
  getFavoriteTeamsCollection: jest.fn(),
  getUsersInfoCollection: jest.fn(),
}));

const { getFavoriteTeamsCollection, getUsersInfoCollection } = require('../../../lib/mongodb');
const handler = require('../../../api/favorite-teams'); 

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

describe('Favorite Teams API', () => {
  let mockFavCol, mockUsersCol;

  beforeEach(() => {
    mockFavCol = {
      find: jest.fn(),
      sort: jest.fn(),
      toArray: jest.fn(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    mockUsersCol = {
      updateOne: jest.fn(),
    };

    getFavoriteTeamsCollection.mockResolvedValue(mockFavCol);
    getUsersInfoCollection.mockResolvedValue(mockUsersCol);

    // default chain for find
    mockFavCol.find.mockReturnValue(mockFavCol);
    mockFavCol.sort.mockReturnValue(mockFavCol);
    mockFavCol.toArray.mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------- OPTIONS ----------------
  it('OPTIONS returns 200', async () => {
    const res = await runHandler({ method: 'OPTIONS', query: {} });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  // ---------------- GET ----------------
  it('GET favorite teams success', async () => {
    const favorites = [{ userId: 'u1', teamId: 1, teamName: 'TeamA' }];
    mockFavCol.toArray.mockResolvedValue(favorites);

    const res = await runHandler({ method: 'GET', query: { userId: 'u1' } });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      favorites,
      total: 1
    });
  });

  it('GET error', async () => {
    mockFavCol.toArray.mockRejectedValue(new Error('DB fail'));

    const res = await runHandler({ method: 'GET', query: { userId: 'u1' } });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch favorite teams' });
  });

  // ---------------- POST ----------------
  it('POST add favorite success', async () => {
    mockFavCol.findOne.mockResolvedValue(null);
    mockFavCol.insertOne.mockResolvedValue({ insertedId: 'f123' });

    const res = await runHandler({
      method: 'POST',
      body: { userId: 'u1', teamId: 1, teamName: 'TeamA' }
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      favoriteId: 'f123',
      favorite: expect.objectContaining({ teamName: 'TeamA' })
    }));
    expect(mockUsersCol.updateOne).toHaveBeenCalled();
  });

  it('POST missing fields', async () => {
    const res = await runHandler({ method: 'POST', body: { userId: 'u1' } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'userId, teamId, and teamName are required' });
  });

  it('POST duplicate team', async () => {
    mockFavCol.findOne.mockResolvedValue({});

    const res = await runHandler({ method: 'POST', body: { userId: 'u1', teamId: 1, teamName: 'TeamA' } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Team already in favorites' });
  });

  it('POST error', async () => {
    mockFavCol.findOne.mockResolvedValue(null);
    mockFavCol.insertOne.mockRejectedValue(new Error('Insert fail'));

    const res = await runHandler({ method: 'POST', body: { userId: 'u1', teamId: 1, teamName: 'TeamA' } });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to add favorite team' });
  });

  // ---------------- DELETE ----------------
  it('DELETE success', async () => {
    mockFavCol.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const res = await runHandler({ method: 'DELETE', query: { userId: 'u1', teamId: 1 } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, deleted: true });
    expect(mockUsersCol.updateOne).toHaveBeenCalled();
  });

  it('DELETE missing params', async () => {
    const res = await runHandler({ method: 'DELETE', query: { userId: 'u1' } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'userId and teamId are required' });
  });

  it('DELETE not found', async () => {
    mockFavCol.deleteOne.mockResolvedValue({ deletedCount: 0 });

    const res = await runHandler({ method: 'DELETE', query: { userId: 'u1', teamId: 1 } });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Favorite team not found' });
  });

  it('DELETE error', async () => {
    mockFavCol.deleteOne.mockRejectedValue(new Error('Delete fail'));
    const res = await runHandler({ method: 'DELETE', query: { userId: 'u1', teamId: 1 } });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to remove favorite team' });
  });

  // ---------------- Method not allowed ----------------
  it('Method not allowed', async () => {
    const res = await runHandler({ method: 'PATCH', query: {} });
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });
});