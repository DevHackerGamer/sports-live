// __tests__/api/players.test.js

// Fix for Jest environment
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock MongoDB helpers
jest.mock('../../../lib/mongodb', () => ({
  getPlayersCollection: jest.fn(),
  getPlayersCollectionESPN: jest.fn(),
  getTeamsCollection: jest.fn(),
  getTeamsCollectionESPN: jest.fn(),
}));

const { 
  getPlayersCollection, 
  getPlayersCollectionESPN,
  getTeamsCollection,
  getTeamsCollectionESPN
} = require('../../../lib/mongodb');
const handler = require('../../../api/players');

// Helper to create mock req/res
const createMocks = (method = 'GET', { query = {}, body = {} } = {}) => {
  const req = { method, query, body };
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    end: jest.fn(),
  };
  return { req, res };
};

describe('/api/players', () => {
  let mockPlayersCollection;
  let mockPlayersCollectionESPN;
  let mockTeamsCollection;
  let mockTeamsCollectionESPN;

  beforeEach(() => {
    // Mock collections
    mockPlayersCollection = {
      find: jest.fn(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockPlayersCollectionESPN = {
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockTeamsCollection = {
      findOne: jest.fn(),
    };

    mockTeamsCollectionESPN = {
      findOne: jest.fn(),
    };

    // Setup mock implementations
    getPlayersCollection.mockResolvedValue(mockPlayersCollection);
    getPlayersCollectionESPN.mockResolvedValue(mockPlayersCollectionESPN);
    getTeamsCollection.mockResolvedValue(mockTeamsCollection);
    getTeamsCollectionESPN.mockResolvedValue(mockTeamsCollectionESPN);

    // Default cursor chain for find operations
    const mockCursor = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
    };

    mockPlayersCollection.find.mockReturnValue(mockCursor);
    mockPlayersCollectionESPN.find.mockReturnValue(mockCursor);

    jest.clearAllMocks();
  });

  // ---------------- OPTIONS ----------------
  it('responds to OPTIONS', async () => {
    const { req, res } = createMocks('OPTIONS');
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  // ---------------- GET players ----------------
  describe('GET players', () => {
    it('GET all players with default parameters', async () => {
      const mockPlayers = [
        { id: 1, name: 'Player One', teamId: 100, source: 'espn' },
        { id: 2, name: 'Player Two', teamId: 100, source: 'espn' },
      ];
      
      mockPlayersCollectionESPN.find().sort().skip().limit().toArray.mockResolvedValue(mockPlayers);
      mockPlayersCollectionESPN.countDocuments.mockResolvedValue(2);

      const { req, res } = createMocks('GET', { 
        query: { limit: '50', offset: '0' } 
      });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        players: mockPlayers,
        total: 2,
        limit: 50,
        offset: 0,
        source: 'espn'
      });
    });

    it('GET players with teamId filter', async () => {
      const mockPlayers = [{ id: 1, name: 'Player One', teamId: 100 }];
      
      mockPlayersCollectionESPN.find().sort().skip().limit().toArray.mockResolvedValue(mockPlayers);
      mockPlayersCollectionESPN.countDocuments.mockResolvedValue(1);

      const { req, res } = createMocks('GET', { 
        query: { teamId: '100' } 
      });

      await handler(req, res);

      expect(mockPlayersCollectionESPN.find).toHaveBeenCalledWith({ teamId: 100 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('GET players with teamName filter - resolves teamId', async () => {
      const mockTeam = { id: 100, name: 'Test Team' };
      const mockPlayers = [{ id: 1, name: 'Player One', teamId: 100 }];
      
      mockTeamsCollectionESPN.findOne.mockResolvedValue(mockTeam);
      mockPlayersCollectionESPN.find().sort().skip().limit().toArray.mockResolvedValue(mockPlayers);
      mockPlayersCollectionESPN.countDocuments.mockResolvedValue(1);

      const { req, res } = createMocks('GET', { 
        query: { teamName: 'Test Team' } 
      });

      await handler(req, res);

      expect(mockTeamsCollectionESPN.findOne).toHaveBeenCalledWith({
        name: { $regex: '^Test Team$', $options: 'i' }
      });
      expect(mockPlayersCollectionESPN.find).toHaveBeenCalledWith({ teamId: 100 });
    });

    it('GET players with position and nationality filters', async () => {
      mockPlayersCollectionESPN.find().sort().skip().limit().toArray.mockResolvedValue([]);
      mockPlayersCollectionESPN.countDocuments.mockResolvedValue(0);

      const { req, res } = createMocks('GET', { 
        query: { position: 'Forward', nationality: 'Brazil' } 
      });

      await handler(req, res);

      expect(mockPlayersCollectionESPN.find).toHaveBeenCalledWith({
        position: /Forward/i,
        nationality: /Brazil/i
      });
    });

  

    
  });

  // ---------------- POST player ----------------
  describe('POST player', () => {
    it('POST creates new player successfully', async () => {
      const playerData = {
        name: 'New Player',
        position: 'Forward',
        nationality: 'Brazil',
        teamId: 100
      };

      const insertedId = '507f1f77bcf86cd799439011';
      mockPlayersCollection.insertOne.mockResolvedValue({ insertedId });

      const { req, res } = createMocks('POST', { body: playerData });

      await handler(req, res);

      expect(mockPlayersCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Player',
          position: 'Forward',
          nationality: 'Brazil',
          teamId: 100,
          lastUpdated: expect.any(Date)
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        playerId: insertedId,
        player: expect.objectContaining(playerData)
      });
    });

    it('POST returns 400 when name is missing', async () => {
      const { req, res } = createMocks('POST', { 
        body: { position: 'Forward' } 
      });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Player name is required' 
      });
    });
  });

  // ---------------- PUT player ----------------
  describe('PUT player', () => {
    it('PUT updates player successfully', async () => {
      const updates = { position: 'Midfielder', nationality: 'Spain' };
      mockPlayersCollection.updateOne.mockResolvedValue({ 
        matchedCount: 1, 
        modifiedCount: 1 
      });

      const { req, res } = createMocks('PUT', { 
        query: { id: '123' },
        body: updates
      });

      await handler(req, res);

      expect(mockPlayersCollection.updateOne).toHaveBeenCalledWith(
        { id: 123 },
        { 
          $set: { 
            ...updates,
            lastUpdated: expect.any(Date)
          } 
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        modified: true
      });
    });

    it('PUT returns 400 when ID is missing', async () => {
      const { req, res } = createMocks('PUT', { 
        body: { position: 'Midfielder' } 
      });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Player ID is required' 
      });
    });

    it('PUT returns 404 when player not found', async () => {
      mockPlayersCollection.updateOne.mockResolvedValue({ 
        matchedCount: 0, 
        modifiedCount: 0 
      });

      const { req, res } = createMocks('PUT', { 
        query: { id: '999' },
        body: { position: 'Midfielder' }
      });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Player not found' 
      });
    });
  });

  // ---------------- DELETE player ----------------
  describe('DELETE player', () => {
    it('DELETE removes player successfully', async () => {
      mockPlayersCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const { req, res } = createMocks('DELETE', { 
        query: { id: '123' } 
      });

      await handler(req, res);

      expect(mockPlayersCollection.deleteOne).toHaveBeenCalledWith({ id: 123 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        deleted: true
      });
    });

    it('DELETE returns 400 when ID is missing', async () => {
      const { req, res } = createMocks('DELETE');

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Player ID is required' 
      });
    });

    it('DELETE returns 404 when player not found', async () => {
      mockPlayersCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const { req, res } = createMocks('DELETE', { 
        query: { id: '999' } 
      });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Player not found' 
      });
    });
  });

  // ---------------- Error handling ----------------
  it('returns 405 for unsupported methods', async () => {
    const { req, res } = createMocks('PATCH');
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });


  it('handles teamName resolution errors gracefully', async () => {
    mockTeamsCollectionESPN.findOne.mockRejectedValue(new Error('DB error'));
    mockPlayersCollectionESPN.find().sort().skip().limit().toArray.mockResolvedValue([]);
    mockPlayersCollectionESPN.countDocuments.mockResolvedValue(0);

    const { req, res } = createMocks('GET', { 
      query: { teamName: 'Unknown Team' } 
    });

    await handler(req, res);

    // Should still return successful response with empty players
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      players: []
    }));
  });
});