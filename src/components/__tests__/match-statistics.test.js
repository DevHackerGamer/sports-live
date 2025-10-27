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
  let mockDb, statsCollection, statsCollectionESPN, matchesCollection;

  beforeEach(() => {
    statsCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      createIndex: jest.fn(),
    };
    
    statsCollectionESPN = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
      createIndex: jest.fn(),
    };
    
    matchesCollection = {
      findOne: jest.fn(),
    };
    
    mockDb = {
      collection: jest.fn((name) => {
        if (name === 'Match_Statistics') return statsCollection;
        if (name === 'Match_Statistics_ESPN') return statsCollectionESPN;
        if (name === 'Match_Info') return matchesCollection;
        throw new Error(`Unknown collection: ${name}`);
      }),
    };
    getDatabase.mockResolvedValue(mockDb);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------- GET ----------------------
  describe('GET match statistics', () => {
    it('GET statistics from ESPN collection first', async () => {
      const mockStats = {
        matchId: 'abc123',
        possession: { home: 60, away: 40 },
      };
      statsCollectionESPN.findOne.mockResolvedValue(mockStats);

      const res = await runHandler({ method: 'GET', query: { matchId: 'abc123' } });

      expect(statsCollectionESPN.findOne).toHaveBeenCalledWith({ matchId: 'abc123' });
      expect(statsCollection.findOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStats);
    });

    it('GET falls back to regular collection when ESPN is empty', async () => {
      const mockStats = {
        matchId: 'abc123',
        possession: { home: 55, away: 45 },
      };
      statsCollectionESPN.findOne.mockResolvedValue(null);
      statsCollection.findOne.mockResolvedValue(mockStats);

      const res = await runHandler({ method: 'GET', query: { matchId: 'abc123' } });

      expect(statsCollectionESPN.findOne).toHaveBeenCalledWith({ matchId: 'abc123' });
      expect(statsCollection.findOne).toHaveBeenCalledWith({ matchId: 'abc123' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStats);
    });

    it('GET returns default stats if none exist in either collection', async () => {
      statsCollectionESPN.findOne.mockResolvedValue(null);
      statsCollection.findOne.mockResolvedValue(null);

      const res = await runHandler({ method: 'GET', query: { matchId: 'abc123' } });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        matchId: 'abc123',
        possession: { home: 50, away: 50 },
        shotsOnTarget: { home: 0, away: 0 },
        shotsOffTarget: { home: 0, away: 0 },
      }));
    });

    it('GET sanitizes ESPN statistics data', async () => {
      const espnStats = {
        matchId: 'espn123',
        possession: { 
          home: { displayValue: '60%' }, 
          away: { value: '40' } 
        },
        shotsOnTarget: { 
          home: { displayValue: '5' }, 
          away: '3' 
        },
        passAccuracy: {
          home: '85%',
          away: 78
        }
      };
      statsCollectionESPN.findOne.mockResolvedValue(espnStats);

      const res = await runHandler({ method: 'GET', query: { matchId: 'espn123' } });

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.possession.home).toBe(60);
      expect(response.possession.away).toBe(40);
      expect(response.shotsOnTarget.home).toBe(5);
      expect(response.shotsOnTarget.away).toBe(3);
    });

    it('GET normalizes possession to 100%', async () => {
      const stats = {
        matchId: 'pos123',
        possession: { home: 30, away: 40 } // Total 70%
      };
      statsCollectionESPN.findOne.mockResolvedValue(stats);

      const res = await runHandler({ method: 'GET', query: { matchId: 'pos123' } });

      const response = res.json.mock.calls[0][0];
      expect(response.possession.home + response.possession.away).toBe(100);
    });

    it('GET with missing matchId returns error', async () => {
      const res = await runHandler({ method: 'GET', query: {} });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'matchId parameter is required' });
    });
  });

  // ---------------------- POST ----------------------
  describe('POST match statistics', () => {
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

    it('POST validates match exists with ObjectId', async () => {
      const matchId = new ObjectId().toString();
      matchesCollection.findOne.mockResolvedValue({ _id: new ObjectId(matchId) });
      statsCollection.findOne.mockResolvedValue(null);
      statsCollection.insertOne.mockResolvedValue({ insertedId: 'new-id' });

      const req = {
        method: 'POST',
        body: {
          matchId: matchId,
          possession: { home: 50, away: 50 },
        },
      };

      const res = await runHandler(req);

      expect(matchesCollection.findOne).toHaveBeenCalledWith({
        $or: [
          { _id: expect.any(ObjectId) },
          { id: matchId },
          { _id: matchId }
        ]
      });
      expect(res.status).toHaveBeenCalledWith(201);
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

    it('POST validates statistics structure', async () => {
      matchesCollection.findOne.mockResolvedValue({ id: 'abc123' });
      statsCollection.findOne.mockResolvedValue(null);
      statsCollection.insertOne.mockResolvedValue({ insertedId: 'new-id' });

      const req = {
        method: 'POST',
        body: {
          matchId: 'abc123',
          possession: { home: 150, away: -10 }, // Should be clamped to 0-100
          shotsOnTarget: { home: -5, away: 'invalid' }, // Should be clamped to 0
        },
      };

      const res = await runHandler(req);

      expect(res.status).toHaveBeenCalledWith(201);
      const insertedData = statsCollection.insertOne.mock.calls[0][0];
      expect(insertedData.possession.home).toBe(100);
      expect(insertedData.possession.away).toBe(0);
      expect(insertedData.shotsOnTarget.home).toBe(0);
      expect(insertedData.shotsOnTarget.away).toBe(0);
    });
  });

  // ---------------------- PUT ----------------------
  describe('PUT match statistics', () => {
    it('PUT updates statistics in both collections', async () => {
      statsCollection.updateOne.mockResolvedValue({ modifiedCount: 1, upsertedCount: 0 });
      statsCollectionESPN.updateOne.mockResolvedValue({ modifiedCount: 1, upsertedCount: 0 });
      statsCollection.findOne.mockResolvedValue({ 
        matchId: 'abc123', 
        possession: { home: 70, away: 30 } 
      });

      const req = {
        method: 'PUT',
        body: {
          matchId: 'abc123',
          possession: { home: 70, away: 30 }
        }
      };

      const res = await runHandler(req);

      expect(statsCollection.updateOne).toHaveBeenCalledWith(
        { matchId: 'abc123' },
        { $set: expect.objectContaining({ matchId: 'abc123' }) },
        { upsert: true }
      );
      expect(statsCollectionESPN.updateOne).toHaveBeenCalledWith(
        { matchId: 'abc123' },
        { $set: expect.objectContaining({ matchId: 'abc123' }) },
        { upsert: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('PUT creates new statistics if none exist (upsert)', async () => {
      statsCollection.updateOne.mockResolvedValue({ modifiedCount: 0, upsertedCount: 1 });
      statsCollectionESPN.updateOne.mockResolvedValue({ modifiedCount: 0, upsertedCount: 1 });
      statsCollection.findOne.mockResolvedValue({ 
        matchId: 'new123', 
        possession: { home: 60, away: 40 } 
      });

      const req = {
        method: 'PUT',
        body: {
          matchId: 'new123',
          possession: { home: 60, away: 40 }
        }
      };

      const res = await runHandler(req);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        matchId: 'new123'
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
  });

  // ---------------------- DELETE ----------------------
  describe('DELETE match statistics', () => {
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

  // ---------------------- INDEX CREATION ----------------------
  it('creates indexes on GET requests', async () => {
    statsCollectionESPN.findOne.mockResolvedValue(null);
    statsCollection.findOne.mockResolvedValue(null);

    await runHandler({ method: 'GET', query: { matchId: 'abc123' } });

    expect(statsCollectionESPN.createIndex).toHaveBeenCalledWith({ matchId: 1 });
    expect(statsCollection.createIndex).toHaveBeenCalledWith({ matchId: 1 });
  });
});