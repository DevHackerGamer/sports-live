const { ObjectId } = require('mongodb');
const matchesHandler = require('../api/matches');

// Mock the DB helpers
jest.mock('../lib/mongodb', () => ({
  getMatchesCollection: jest.fn(),
  getTeamsCollection: jest.fn(),
}));

const { getMatchesCollection, getTeamsCollection } = require('../lib/mongodb');

describe('Matches API', () => {
  let req;
  let res;
  let matchesCollectionMock;
  let teamsCollectionMock;

  beforeEach(() => {
    matchesCollectionMock = {
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
      insertOne: jest.fn(),
    };

    teamsCollectionMock = {
      findOne: jest.fn(),
    };

    getMatchesCollection.mockReturnValue(matchesCollectionMock);
    getTeamsCollection.mockReturnValue(teamsCollectionMock);

    req = {
      method: 'GET',
      query: {},
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should return a list of matches', async () => {
    const mockMatches = [
      { _id: new ObjectId(), homeTeamId: '1', awayTeamId: '2', score: '2-1' },
    ];
    matchesCollectionMock.find().toArray.mockResolvedValue(mockMatches);
    teamsCollectionMock.findOne.mockResolvedValue({ name: 'Team 1' });

    await matchesHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ homeTeamId: '1', awayTeamId: '2' }),
      ])
    );
  });

  it('should handle errors gracefully', async () => {
    matchesCollectionMock.find().toArray.mockRejectedValue(new Error('DB error'));

    await matchesHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch matches' });
  });

  it('should insert a new match on POST', async () => {
    req.method = 'POST';
    req.body = { homeTeamId: '1', awayTeamId: '2', score: '0-0' };

    matchesCollectionMock.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

    await matchesHandler(req, res);

    expect(matchesCollectionMock.insertOne).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ insertedId: expect.any(ObjectId) }));
  });
});
