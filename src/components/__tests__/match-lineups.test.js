// __tests__/api/matchLineups.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// --- Mock MongoDB helper ---
jest.mock('../../../lib/mongodb.js', () => ({
  getMatchLineupsCollection: jest.fn(),
  getMatchLineupsCollectionESPN: jest.fn(),
}));

const { getMatchLineupsCollection, getMatchLineupsCollectionESPN } = require('../../../lib/mongodb');
const handler = require('../../../api/match-lineups');

// --- Mock response helper ---
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

// --- Test suite ---
describe('match-lineups API', () => {
  let mockCollection;
  let mockCollectionESPN;

  beforeEach(() => {
    mockCollection = {
      find: jest.fn(() => ({ toArray: jest.fn() })),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      createIndex: jest.fn(),
    };
    
    mockCollectionESPN = {
      find: jest.fn(() => ({ toArray: jest.fn() })),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      createIndex: jest.fn(),
    };
    
    getMatchLineupsCollection.mockResolvedValue(mockCollection);
    getMatchLineupsCollectionESPN.mockResolvedValue(mockCollectionESPN);
  });

  afterEach(() => jest.clearAllMocks());

  // ------------------- GET lineups -------------------
  describe('GET lineups', () => {
    it('GET returns lineups from ESPN collection first', async () => {
      const fakeLineups = [
        { 
          matchId: 101, 
          teamId: 1, 
          teamName: 'Arsenal', 
          players: [
            { id: 1, name: 'Player One', starter: true, position: 'Forward', jersey: 10 },
            { id: 2, name: 'Player Two', starter: false, position: 'Midfielder', jersey: 8 }
          ]
        }
      ];
      
      const toArrayMock = jest.fn().mockResolvedValue(fakeLineups);
      mockCollectionESPN.find.mockReturnValue({ toArray: toArrayMock });

      const req = { method: 'GET', query: { matchId: '101' } };
      const res = await runHandler(req);

      expect(mockCollectionESPN.find).toHaveBeenCalledWith({ matchId: 101 });
      expect(mockCollection.find).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          matchId: 101,
          teamId: 1,
          starters: expect.arrayContaining([
            expect.objectContaining({ name: 'Player One', position: 'Forward' })
          ]),
          substitutes: expect.arrayContaining([
            expect.objectContaining({ name: 'Player Two', position: 'Midfielder' })
          ])
        })
      ]);
    });

    it('GET falls back to regular collection when ESPN is empty', async () => {
      const fakeLineups = [
        { 
          matchId: 102, 
          teamId: 2, 
          teamName: 'Chelsea',
          players: [{ id: 3, name: 'Player Three', starter: true }]
        }
      ];
      
      mockCollectionESPN.find.mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) });
      mockCollection.find.mockReturnValue({ toArray: jest.fn().mockResolvedValue(fakeLineups) });

      const req = { method: 'GET', query: { matchId: '102' } };
      const res = await runHandler(req);

      expect(mockCollectionESPN.find).toHaveBeenCalledWith({ matchId: 102 });
      expect(mockCollection.find).toHaveBeenCalledWith({ matchId: 102 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('GET filters by teamId when provided', async () => {
      const fakeLineups = [
        { matchId: 103, teamId: 3, teamName: 'Team A' },
        { matchId: 103, teamId: 4, teamName: 'Team B' }
      ];
      
      mockCollectionESPN.find.mockReturnValue({ 
        toArray: jest.fn().mockResolvedValue(fakeLineups) 
      });

      const req = { method: 'GET', query: { matchId: '103', teamId: '3' } };
      const res = await runHandler(req);

      expect(mockCollectionESPN.find).toHaveBeenCalledWith({ 
        matchId: 103, 
        teamId: 3 
      });
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ teamId: 3, teamName: 'Team A' })
      ]);
    });

    it('GET handles string teamId values', async () => {
      const fakeLineups = [
        { matchId: 104, teamId: 'team_abc', teamName: 'String Team' }
      ];
      
      mockCollectionESPN.find.mockReturnValue({ 
        toArray: jest.fn().mockResolvedValue(fakeLineups) 
      });

      const req = { method: 'GET', query: { matchId: '104', teamId: 'team_abc' } };
      const res = await runHandler(req);

      expect(mockCollectionESPN.find).toHaveBeenCalledWith({ 
        matchId: 104, 
        teamId: 'team_abc' 
      });
    });

    it('GET normalizes lineup shape for legacy documents', async () => {
      const legacyLineup = {
        matchId: 105,
        teamId: 5,
        teamName: 'Legacy Team',
        players: [
          { id: 1, name: 'Starter Player', starter: true, position: 'FW', jersey: 9 },
          { id: 2, name: 'Sub Player', starter: false, position: 'MF', jersey: 12 }
        ]
        // No starters/substitutes arrays
      };
      
      mockCollectionESPN.find.mockReturnValue({ 
        toArray: jest.fn().mockResolvedValue([legacyLineup]) 
      });

      const req = { method: 'GET', query: { matchId: '105' } };
      const res = await runHandler(req);

      const response = res.json.mock.calls[0][0][0];
      expect(response.starters).toEqual([
        expect.objectContaining({ name: 'Starter Player', position: 'FW' })
      ]);
      expect(response.substitutes).toEqual([
        expect.objectContaining({ name: 'Sub Player', position: 'MF' })
      ]);
    });

    it('GET preserves existing starters/substitutes arrays', async () => {
      const modernLineup = {
        matchId: 106,
        teamId: 6,
        teamName: 'Modern Team',
        starters: [{ id: 1, name: 'Starter', position: 'DEF' }],
        substitutes: [{ id: 2, name: 'Sub', position: 'GK' }]
        // No players array
      };
      
      mockCollectionESPN.find.mockReturnValue({ 
        toArray: jest.fn().mockResolvedValue([modernLineup]) 
      });

      const req = { method: 'GET', query: { matchId: '106' } };
      const res = await runHandler(req);

      const response = res.json.mock.calls[0][0][0];
      expect(response.starters).toEqual(modernLineup.starters);
      expect(response.substitutes).toEqual(modernLineup.substitutes);
    });

    it('GET missing matchId returns 400', async () => {
      const req = { method: 'GET', query: {} };
      const res = await runHandler(req);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'matchId is required' });
    });
  });

  // ------------------- POST lineups -------------------
  describe('POST lineups', () => {
    it('POST saves lineup to both collections', async () => {
      const reqBody = {
        matchId: '200',
        teamId: '5',
        teamName: 'Liverpool',
        formation: '4-3-3',
        starters: [{ id: 1, name: 'Player One' }],
        substitutes: [{ id: 2, name: 'Player Two' }]
      };

      mockCollection.updateOne.mockResolvedValue({});
      mockCollectionESPN.updateOne.mockResolvedValue({});

      const req = { method: 'POST', query: {}, body: reqBody };
      const res = await runHandler(req);

      // Check regular collection update
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { matchId: 200, teamId: 5 },
        {
          $set: expect.objectContaining({
            matchId: 200,
            teamId: 5,
            teamName: 'Liverpool',
            formation: '4-3-3',
            lastUpdated: expect.any(Date)
          })
        },
        { upsert: true }
      );

      // Check ESPN collection update
      expect(mockCollectionESPN.updateOne).toHaveBeenCalledWith(
        { matchId: 200, teamId: 5 },
        {
          $set: expect.objectContaining({
            matchId: 200,
            teamId: 5,
            teamName: 'Liverpool',
            formation: '4-3-3',
            lastUpdated: expect.any(Date)
          })
        },
        { upsert: true }
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Lineup saved',
        lineup: expect.objectContaining({
          teamName: 'Liverpool',
          matchId: 200,
          teamId: 5,
        })
      });
    });

    it('POST converts numeric string IDs to numbers', async () => {
      const reqBody = {
        matchId: '300',
        teamId: '15',
        teamName: 'Arsenal'
      };

      mockCollection.updateOne.mockResolvedValue({});
      mockCollectionESPN.updateOne.mockResolvedValue({});

      const req = { method: 'POST', query: {}, body: reqBody };
      await runHandler(req);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { matchId: 300, teamId: 15 },
        expect.any(Object),
        { upsert: true }
      );
    });

    it('POST preserves string IDs when not numeric', async () => {
      const reqBody = {
        matchId: 'match_abc',
        teamId: 'team_xyz',
        teamName: 'Custom Team'
      };

      mockCollection.updateOne.mockResolvedValue({});
      mockCollectionESPN.updateOne.mockResolvedValue({});

      const req = { method: 'POST', query: {}, body: reqBody };
      await runHandler(req);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { matchId: 'match_abc', teamId: 'team_xyz' },
        expect.any(Object),
        { upsert: true }
      );
    });

    it('POST missing required fields returns 400', async () => {
      const testCases = [
        { body: {} },
        { body: { matchId: '100' } },
        { body: { matchId: '100', teamId: '5' } },
        { body: { teamId: '5', teamName: 'Team' } }
      ];

      for (const testCase of testCases) {
        const req = { method: 'POST', query: {}, body: testCase.body };
        const res = await runHandler(req);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'matchId, teamId, teamName required'
        });
      }
    });
  });

  // ------------------- DELETE lineups -------------------
  describe('DELETE lineups', () => {
    it('DELETE removes lineup from both collections', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockCollectionESPN.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const req = { method: 'DELETE', query: { matchId: '500', teamId: '25' } };
      const res = await runHandler(req);

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ 
        matchId: 500, 
        teamId: 25 
      });
      expect(mockCollectionESPN.deleteOne).toHaveBeenCalledWith({ 
        matchId: 500, 
        teamId: 25 
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lineup deleted' });
    });

    it('DELETE handles string IDs', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockCollectionESPN.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const req = { method: 'DELETE', query: { matchId: 'match_123', teamId: 'team_abc' } };
      await runHandler(req);

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ 
        matchId: 'match_123', 
        teamId: 'team_abc' 
      });
    });

    it('DELETE missing params returns 400', async () => {
      const testCases = [
        { query: {} },
        { query: { matchId: '10' } },
        { query: { teamId: '5' } }
      ];

      for (const testCase of testCases) {
        const req = { method: 'DELETE', query: testCase.query };
        const res = await runHandler(req);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'matchId and teamId required'
        });
      }
    });
  });

  // ------------------- Index creation -------------------
  it('creates indexes on initialization', async () => {
    const req = { method: 'GET', query: { matchId: '101' } };
    mockCollectionESPN.find.mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) });
    
    await runHandler(req);

    expect(mockCollectionESPN.createIndex).toHaveBeenCalledWith(
      { matchId: 1, teamId: 1 }
    );
    expect(mockCollection.createIndex).toHaveBeenCalledWith(
      { matchId: 1, teamId: 1 }
    );
  });

  // ------------------- Method not allowed -------------------
  it('returns 405 for unsupported methods', async () => {
    const req = { method: 'PUT', query: {} };
    const res = await runHandler(req);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST', 'DELETE']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith('Method PUT Not Allowed');
  });

  // ------------------- Internal server error -------------------
  it('Handles internal server error', async () => {
    getMatchLineupsCollection.mockRejectedValue(new Error('DB crashed'));

    const req = { method: 'GET', query: { matchId: '101' } };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      details: 'DB crashed'
    });
  });

  // ------------------- Normalization persistence -------------------
  it('attempts to persist normalized lineup structure', async () => {
    const legacyLineup = {
      matchId: 107,
      teamId: 7,
      teamName: 'Test Team',
      players: [
        { id: 1, name: 'Starter', starter: true, position: 'FW' },
        { id: 2, name: 'Sub', starter: false, position: 'MF' }
      ]
    };
    
    mockCollectionESPN.find.mockReturnValue({ 
      toArray: jest.fn().mockResolvedValue([legacyLineup]) 
    });
    mockCollection.updateOne.mockResolvedValue({});

    const req = { method: 'GET', query: { matchId: '107' } };
    await runHandler(req);

    // Should attempt to update the normalized structure
    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      { matchId: 107, teamId: 7 },
      { 
        $set: { 
          starters: expect.any(Array),
          substitutes: expect.any(Array)
        } 
      }
    );
  });
});