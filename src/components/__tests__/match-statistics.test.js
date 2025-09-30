// __tests__/matchStatistics.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const { ObjectId } = require('mongodb');
jest.mock('../../../lib/mongodb', () => ({
  getDatabase: jest.fn(),
}));

const { getDatabase } = require('../../../lib/mongodb');
const handler = require('../../../api/match-statistics');

// Helper to mock response object
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
}

async function runHandler(req) {
  const res = mockResponse();
  await handler(req, res);
  return res;
}

describe('match-statistics API', () => {
  let mockDb, statsCollection, matchesCollection;

  beforeEach(() => {
    statsCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    matchesCollection = {
      findOne: jest.fn(),
    };
    mockDb = {
      collection: jest.fn((name) => {
        if (name === 'Match_Statistics') return statsCollection;
        if (name === 'Match_Info') return matchesCollection;
        throw new Error('Unknown collection');
      }),
    };
    getDatabase.mockResolvedValue(mockDb);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------- GET ----------------------
  it('GET match statistics by matchId (existing)', async () => {
    const mockStats = {
      matchId: 'abc123',
      possession: { home: 60, away: 40 },
    };
    statsCollection.findOne.mockResolvedValue(mockStats);

    const res = await runHandler({ method: 'GET', query: { matchId: 'abc123' } });

    expect(statsCollection.findOne).toHaveBeenCalledWith({ matchId: 'abc123' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockStats);
  });

  it('GET returns default stats if none exist', async () => {
    statsCollection.findOne.mockResolvedValue(null);

    const res = await runHandler({ method: 'GET', query: { matchId: 'abc123' } });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      matchId: 'abc123',
      possession: { home: 50, away: 50 },
    }));
  });

  it('GET with missing matchId returns error', async () => {
    const res = await runHandler({ method: 'GET', query: {} });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'matchId parameter is required' });
  });

  // ---------------------- POST ----------------------
  it('POST creates new statistics for valid match', async () => {
    matchesCollection.findOne.mockResolvedValue({ id: 'abc123' });
    statsCollection.findOne.mockResolvedValue(null);
    statsCollection.insertOne.mockResolvedValue({ insertedId: 'new-id' });

    const req = {
      method: 'POST',
      body: {
        matchId: 'abc123',
        possession: { home: 55, away: 45 },
        shotsOnTarget: { home: 2, away: 1 },
      },
    };

    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      _id: 'new-id',
      matchId: 'abc123',
      possession: { home: 55, away: 45 },
      shotsOnTarget: { home: 2, away: 1 },
    }));
  });

  it('POST returns 409 if stats already exist', async () => {
    matchesCollection.findOne.mockResolvedValue({ id: 'abc123' });
    statsCollection.findOne.mockResolvedValue({ matchId: 'abc123' });

    const res = await runHandler({
      method: 'POST',
      body: { matchId: 'abc123' }
    });

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Statistics already exist for this match' });
  });

  it('POST with non-existing match returns 404', async () => {
    matchesCollection.findOne.mockResolvedValue(null);

    const res = await runHandler({
      method: 'POST',
      body: { matchId: 'nonexistent' }
    });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Match not found' });
  });

  it('POST with missing matchId returns error', async () => {
    const res = await runHandler({
      method: 'POST',
      body: {}
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'matchId is required' });
  });

  // ---------------------- PUT ----------------------
  it('PUT updates existing statistics', async () => {
    statsCollection.updateOne.mockResolvedValue({ modifiedCount: 1, upsertedCount: 0 });
    statsCollection.findOne.mockResolvedValue({ matchId: 'abc123', possession: { home: 70, away: 30 } });

    const req = {
      method: 'PUT',
      body: {
        matchId: 'abc123',
        possession: { home: 70, away: 30 }
      }
    };

    const res = await runHandler(req);

    expect(statsCollection.updateOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      matchId: 'abc123',
      possession: { home: 70, away: 30 }
    }));
  });

  it('PUT with missing matchId returns error', async () => {
    const res = await runHandler({
      method: 'PUT',
      body: {}
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'matchId is required' });
  });

  // ---------------------- DELETE ----------------------
  it('DELETE deletes statistics by matchId', async () => {
    statsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const res = await runHandler({ method: 'DELETE', query: { matchId: 'abc123' } });

    expect(statsCollection.deleteOne).toHaveBeenCalledWith({ matchId: 'abc123' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Match statistics deleted successfully' });
  });

  it('DELETE non-existent stats returns 404', async () => {
    statsCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });

    const res = await runHandler({ method: 'DELETE', query: { matchId: 'not-there' } });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Statistics not found for this match' });
  });

  it('DELETE with missing matchId returns error', async () => {
    const res = await runHandler({ method: 'DELETE', query: {} });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'matchId parameter is required' });
  });

  // ---------------------- OTHER METHODS ----------------------
  it('returns 405 for unsupported methods', async () => {
    const req = { method: 'PATCH', query: {} };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  });

  // ---------------------- INTERNAL ERROR ----------------------
  it('handles internal server error', async () => {
    getDatabase.mockRejectedValue(new Error('DB down'));
    const res = await runHandler({ method: 'GET', query: { matchId: 'abc123' } });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
