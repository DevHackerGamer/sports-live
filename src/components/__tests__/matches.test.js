// /api/__tests__/matches.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const { ObjectId } = require('mongodb');

// Mock MongoDB helpers and dependencies
jest.mock('../../../lib/mongodb.js', () => ({
  getMatchesCollection: jest.fn(),
  getTeamsCollection: jest.fn(),
  getDatabase: jest.fn(),
}));

jest.mock('../../../lib/auth.js', () => ({
  isAdmin: jest.fn(),
}));

const { getMatchesCollection, getTeamsCollection, getDatabase } = require('../../../lib/mongodb');
const { isAdmin } = require('../../../lib/auth');
const handler = require('../../../api/matches');

// Helper to create mock response object
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
}

// Run handler
async function runHandler(req) {
  const res = mockResponse();
  await handler(req, res);
  return res;
}

describe('matches API', () => {
  let mockMatchesCollection, mockTeamsCollection, mockEventLogCollection, mockStatsCollection;

  beforeEach(() => {
    // Mock collections
    mockMatchesCollection = {
      find: jest.fn(() => ({ 
        sort: jest.fn(() => ({ 
          limit: jest.fn(() => ({ 
            toArray: jest.fn() 
          })) 
        })) 
      })),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      bulkWrite: jest.fn(),
    };

    mockTeamsCollection = {
      find: jest.fn(() => ({ project: jest.fn(() => ({ toArray: jest.fn() })) })),
    };

    mockEventLogCollection = {
      find: jest.fn(() => ({ sort: jest.fn(() => ({ toArray: jest.fn() })) })),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    };

    mockStatsCollection = {
      deleteOne: jest.fn(),
    };

    // Setup mock implementations
    getMatchesCollection.mockResolvedValue(mockMatchesCollection);
    getTeamsCollection.mockResolvedValue(mockTeamsCollection);
    getDatabase.mockResolvedValue({
      collection: jest.fn((name) => {
        if (name === 'Event_Log') return mockEventLogCollection;
        if (name === 'Match_Statistics') return mockStatsCollection;
        return {};
      })
    });

    // Default admin auth to true for most tests
    isAdmin.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CORS and OPTIONS', () => {
    it('handles OPTIONS request', async () => {
      const res = await runHandler({ method: 'OPTIONS' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalled();
    });

    it('sets CORS headers', async () => {
      const res = mockResponse();
      await handler({ method: 'GET', url: '/api/matches' }, res);
      
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Type, X-User-Role');
    });
  });

  describe('GET /api/matches', () => {
    it('GET all matches with default filters', async () => {
      const fakeMatches = [
        { 
          id: '1', 
          homeTeam: { name: 'TeamA' }, 
          awayTeam: { name: 'TeamB' }, 
          competition: { name: 'Premier League' },
          utcDate: new Date().toISOString(),
          status: 'TIMED'
        }
      ];

      mockMatchesCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(fakeMatches)
          })
        })
      });

      mockTeamsCollection.find.mockReturnValue({
        project: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      });

      const res = await runHandler({ 
        method: 'GET', 
        url: '/api/matches',
        query: {} 
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        count: 1,
        filters: expect.any(Object),
        lastUpdated: expect.any(String)
      });
    });

    it('GET matches with status filter', async () => {
      mockMatchesCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
          })
        })
      });

      mockTeamsCollection.find.mockReturnValue({
        project: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      });

      const res = await runHandler({ 
        method: 'GET', 
        url: '/api/matches',
        query: { status: 'IN_PLAY' } 
      });

      expect(mockMatchesCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'IN_PLAY' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('GET matches with competition filter', async () => {
      mockMatchesCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
          })
        })
      });

      mockTeamsCollection.find.mockReturnValue({
        project: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      });

      const res = await runHandler({ 
        method: 'GET', 
        url: '/api/matches',
        query: { competition: 'Premier League' } 
      });

      expect(mockMatchesCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({ 
          'competition.name': expect.any(RegExp)
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('GET /api/matches/:id', () => {
    it('GET single match by id', async () => {
      const matchId = new ObjectId().toString();
      const fakeMatch = {
        _id: new ObjectId(),
        id: matchId,
        homeTeam: { name: 'TeamA' },
        awayTeam: { name: 'TeamB' },
        status: 'TIMED'
      };

      mockMatchesCollection.findOne.mockResolvedValue(fakeMatch);

      const res = await runHandler({ 
        method: 'GET', 
        url: `/api/matches/${matchId}`,
        query: {} 
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: fakeMatch
      });
    });

    it('GET single match not found', async () => {
      mockMatchesCollection.findOne.mockResolvedValue(null);

      const res = await runHandler({ 
        method: 'GET', 
        url: '/api/matches/nonexistent',
        query: {} 
      });

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Match not found'
      });
    });
  });

  describe('GET /api/matches/:id/events', () => {
    it('GET match events', async () => {
      const matchId = new ObjectId().toString();
      const fakeMatch = {
        _id: new ObjectId(),
        id: matchId,
        events: [
          { type: 'goal', minute: 23, player: 'Player1' }
        ]
      };

      mockMatchesCollection.findOne.mockResolvedValue(fakeMatch);

      const res = await runHandler({ 
        method: 'GET', 
        url: `/api/matches/${matchId}/events`,
        query: {} 
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: fakeMatch.events
      });
    });

    it('GET match events falls back to Event_Log', async () => {
      const matchId = new ObjectId().toString();
      const fakeMatch = {
        _id: new ObjectId(),
        id: matchId,
        events: []
      };

      const fakeEvents = [
        { data: { type: 'goal', minute: 23, player: 'Player1' }, type: 'goal', message: 'Goal - Player1' }
      ];

      mockMatchesCollection.findOne.mockResolvedValue(fakeMatch);
      mockEventLogCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(fakeEvents)
        })
      });

      const res = await runHandler({ 
        method: 'GET', 
        url: `/api/matches/${matchId}/events`,
        query: {} 
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array)
      });
    });
  });

  describe('POST /api/matches', () => {
    it('POST create new admin match', async () => {
      const matchData = {
        homeTeam: 'TeamA',
        awayTeam: 'TeamB',
        date: '2025-12-01',
        time: '15:00',
        competition: 'Premier League'
      };

      mockMatchesCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

      const res = await runHandler({
        method: 'POST',
        url: '/api/matches',
        body: matchData
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          homeTeam: expect.any(Object),
          awayTeam: expect.any(Object),
          createdByAdmin: true
        })
      });
    });

    it('POST create match with object teams', async () => {
      const matchData = {
        homeTeam: { id: '1', name: 'TeamA' },
        awayTeam: { id: '2', name: 'TeamB' },
        date: '2025-12-01',
        time: '15:00',
        competition: 'Premier League'
      };

      mockMatchesCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

      const res = await runHandler({
        method: 'POST',
        url: '/api/matches',
        body: matchData
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockMatchesCollection.insertOne).toHaveBeenCalled();
    });

    it('POST missing required fields', async () => {
      const matchData = {
        homeTeam: 'TeamA'
        // missing awayTeam, date, time
      };

      const res = await runHandler({
        method: 'POST',
        url: '/api/matches',
        body: matchData
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields'
      });
    });

    it('POST create match in past should fail', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastDate = yesterday.toISOString().split('T')[0];

      const matchData = {
        homeTeam: 'TeamA',
        awayTeam: 'TeamB',
        date: pastDate,
        time: '15:00',
        competition: 'Premier League'
      };

      const res = await runHandler({
        method: 'POST',
        url: '/api/matches',
        body: matchData
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot create a match in the past'
      });
    });

    it('POST non-admin should be forbidden', async () => {
      isAdmin.mockResolvedValue(false);

      const matchData = {
        homeTeam: 'TeamA',
        awayTeam: 'TeamB',
        date: '2025-12-01',
        time: '15:00'
      };

      const res = await runHandler({
        method: 'POST',
        url: '/api/matches',
        body: matchData
      });

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden: admin required'
      });
    });
  });

  describe('POST /api/matches/:id/events', () => {
    it('POST add event to match', async () => {
      const matchId = new ObjectId().toString();
      const eventData = {
        type: 'goal',
        player: 'Player1',
        team: 'TeamA'
      };

      const fakeMatch = {
        _id: new ObjectId(),
        id: matchId,
        minute: 23
      };

      mockMatchesCollection.findOne.mockResolvedValue(fakeMatch);
      mockMatchesCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockEventLogCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

      const res = await runHandler({
        method: 'POST',
        url: `/api/matches/${matchId}/events`,
        body: eventData
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          type: 'goal',
          description: expect.any(String)
        })
      });
    });

    it('POST add event to non-existent match', async () => {
      const matchId = new ObjectId().toString();
      mockMatchesCollection.findOne.mockResolvedValue(null);

      const res = await runHandler({
        method: 'POST',
        url: `/api/matches/${matchId}/events`,
        body: { type: 'goal' }
      });

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Match not found'
      });
    });
  });

  describe('PUT /api/matches/:id', () => {
    it('PUT update match details', async () => {
      const matchId = new ObjectId().toString();
      const updateData = {
        referee: 'John Smith',
        venue: 'Stadium'
      };

      mockMatchesCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const res = await runHandler({
        method: 'PUT',
        url: `/api/matches/${matchId}`,
        body: updateData
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        modified: true
      });
    });

    it('PUT update match clock', async () => {
      const matchId = new ObjectId().toString();
      const clockData = {
        clock: {
          running: true,
          elapsed: 1200,
          startedAt: new Date().toISOString()
        }
      };

      mockMatchesCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const res = await runHandler({
        method: 'PUT',
        url: `/api/matches/${matchId}`,
        body: clockData
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockMatchesCollection.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            clock: expect.any(Object),
            minute: expect.any(Number),
            status: 'IN_PLAY'
          })
        })
      );
    });

    it('PUT update non-existent match', async () => {
      const matchId = new ObjectId().toString();
      mockMatchesCollection.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });

      const res = await runHandler({
        method: 'PUT',
        url: `/api/matches/${matchId}`,
        body: { referee: 'John Smith' }
      });

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Match not found'
      });
    });
  });

  describe('PUT /api/matches/:id/events/:eventId', () => {
    it('PUT update event', async () => {
      const matchId = new ObjectId().toString();
      const eventId = 'event123';
      const updateData = {
        type: 'goal',
        player: 'Updated Player'
      };

      const fakeMatch = {
        _id: new ObjectId(),
        id: matchId
      };

      mockMatchesCollection.findOne.mockResolvedValue(fakeMatch);
      mockMatchesCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const res = await runHandler({
        method: 'PUT',
        url: `/api/matches/${matchId}/events/${eventId}`,
        body: updateData
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        modified: true
      });
    });
  });

  describe('DELETE /api/matches/:id', () => {
    it('DELETE admin-created match', async () => {
      const matchId = new ObjectId().toString();
      mockMatchesCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockStatsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const res = await runHandler({
        method: 'DELETE',
        url: `/api/matches/${matchId}`,
        query: {}
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        deleted: true
      });
      expect(mockStatsCollection.deleteOne).toHaveBeenCalled();
    });

    it('DELETE non-existent match', async () => {
      const matchId = new ObjectId().toString();
      mockMatchesCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const res = await runHandler({
        method: 'DELETE',
        url: `/api/matches/${matchId}`,
        query: {}
      });

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Match not found or not admin-created'
      });
    });

    it('DELETE non-admin should be forbidden', async () => {
      isAdmin.mockResolvedValue(false);
      const matchId = new ObjectId().toString();

      const res = await runHandler({
        method: 'DELETE',
        url: `/api/matches/${matchId}`,
        query: {}
      });

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden: admin required'
      });
    });
  });

  describe('DELETE /api/matches/:id/events/:eventId', () => {
    it('DELETE event from match', async () => {
      const matchId = new ObjectId().toString();
      const eventId = 'event123';

      const fakeMatch = {
        _id: new ObjectId(),
        id: matchId
      };

      mockMatchesCollection.findOne.mockResolvedValue(fakeMatch);
      mockMatchesCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
      mockEventLogCollection.deleteMany.mockResolvedValue({ deletedCount: 1 });

      const res = await runHandler({
        method: 'DELETE',
        url: `/api/matches/${matchId}/events/${eventId}`,
        query: {}
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        deleted: true
      });
    });
  });

  describe('Error handling', () => {
    it('handles internal server error', async () => {
      getMatchesCollection.mockRejectedValue(new Error('Database connection failed'));

      const res = await runHandler({
        method: 'GET',
        url: '/api/matches',
        query: {}
      });

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        message: 'Database connection failed'
      });
    });

    it('handles method not allowed', async () => {
      const res = await runHandler({
        method: 'PATCH', // Unsupported method
        url: '/api/matches',
        query: {}
      });

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Method not allowed'
      });
    });
  });

  describe('Utility functions', () => {
    it('canonicalEventType normalizes event types', () => {
      // Test the imported function directly
      const handler = require('../../../api/matches');
      
      expect(handler.canonicalEventType('goal')).toBe('goal');
      expect(handler.canonicalEventType('penalty goal')).toBe('penalty');
      expect(handler.canonicalEventType('yellow card')).toBe('yellow_card');
      expect(handler.canonicalEventType('unknown')).toBe('unknown');
    });

    it('isScoringEvent identifies scoring events', () => {
      const handler = require('../../../api/matches');
      
      expect(handler.isScoringEvent('goal')).toBe(true);
      expect(handler.isScoringEvent('penalty')).toBe(true);
      expect(handler.isScoringEvent('own_goal')).toBe(true);
      expect(handler.isScoringEvent('yellow_card')).toBe(false);
    });
  });
});