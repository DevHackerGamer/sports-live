// __tests__/api/user-matches.test.js
const handler = require('../../../api/user-matches');
const { getUserMatchesCollection, getUsersInfoCollection } = require('../../../lib/mongodb');

// --- Mock MongoDB collections ---
jest.mock('../../../lib/mongodb.js', () => ({
  getUserMatchesCollection: jest.fn(),
  getUsersInfoCollection: jest.fn(),
}));

// Helper to mock req/res easily
const createMocks = (method, { query = {}, body = {} } = {}) => {
  const req = { method, query, body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    setHeader: jest.fn(),
    end: jest.fn(),
  };
  return { req, res };
};

describe('/api/user-matches', () => {
  let mockUserMatches;
  let mockUsers;

  beforeEach(() => {
    mockUserMatches = {
      find: jest.fn(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    mockUsers = {
      updateOne: jest.fn(),
    };

    getUserMatchesCollection.mockResolvedValue(mockUserMatches);
    getUsersInfoCollection.mockResolvedValue(mockUsers);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- GET ---
  it('should fetch user watchlist successfully', async () => {
    const fakeList = [
      { userId: 'user1', matchId: '101', addedAt: new Date() },
      { userId: 'user1', matchId: '102', addedAt: new Date() },
    ];
    mockUserMatches.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(fakeList) }),
    });

    const { req, res } = createMocks('GET', { query: { userId: 'user1' } });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: fakeList,
      total: fakeList.length,
    });
  });

  // --- POST ---
  it('should add match to user watchlist', async () => {
    mockUserMatches.findOne.mockResolvedValue(null);
    mockUserMatches.insertOne.mockResolvedValue({ insertedId: 'mock-id' });

    const { req, res } = createMocks('POST', {
      body: {
        userId: 'user1',
        matchId: '999',
        match: {
          homeTeam: { name: 'Arsenal' },
          awayTeam: { name: 'Chelsea' },
          competition: { name: 'Premier League' },
          utcDate: '2025-10-18T15:00:00Z',
          status: 'SCHEDULED',
        },
      },
    });

    await handler(req, res);

    expect(mockUserMatches.insertOne).toHaveBeenCalledTimes(1);
    expect(mockUsers.updateOne).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        id: 'mock-id',
        data: expect.objectContaining({
          userId: 'user1',
          matchId: '999',
          homeTeam: 'Arsenal',
          awayTeam: 'Chelsea',
          competition: 'Premier League',
        }),
      })
    );
  });

  it('should return 409 if match already exists in watchlist', async () => {
    mockUserMatches.findOne.mockResolvedValue({ matchId: '999' });

    const { req, res } = createMocks('POST', {
      body: { userId: 'user1', matchId: '999' },
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Match already in watchlist' });
  });

  it('should return 400 if userId or matchId missing on POST', async () => {
    const { req, res } = createMocks('POST', { body: { userId: '' } });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'userId and matchId are required' });
  });

  // --- DELETE ---
  it('should delete a match from user watchlist', async () => {
    mockUserMatches.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const { req, res } = createMocks('DELETE', {
      query: { userId: 'user1', matchId: '999' },
    });

    await handler(req, res);

    expect(mockUserMatches.deleteOne).toHaveBeenCalledWith({
      userId: 'user1',
      matchId: '999',
    });
    expect(mockUsers.updateOne).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, deleted: true });
  });

  it('should return 404 if watchlist item not found', async () => {
    mockUserMatches.deleteOne.mockResolvedValue({ deletedCount: 0 });

    const { req, res } = createMocks('DELETE', {
      query: { userId: 'user1', matchId: '888' },
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Watchlist item not found' });
  });

  // --- Invalid method ---
  it('should return 405 for unsupported methods', async () => {
    const { req, res } = createMocks('PUT');
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });
});