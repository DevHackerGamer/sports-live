// players.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const handler = require('../../../api/players');
const { getPlayersCollection, getTeamsCollection } = require('../../../lib/mongodb');
const { ObjectId } = require('mongodb');

jest.mock('../../../lib/mongodb.js', () => ({
  getPlayersCollection: jest.fn(),
  getTeamsCollection: jest.fn(),
}));

// Mock Express-like req/res
function mockReqRes({ method = 'GET', url = '/api/players', query = {}, body = {} } = {}) {
  const json = jest.fn();
  const end = jest.fn();
  const status = jest.fn(() => ({ json, end }));
  const setHeader = jest.fn();
  const res = { status, setHeader, end, json };
  const req = { method, url, query, body, headers: {} };
  return { req, res, json, status, setHeader, end };
}

describe('Players API', () => {
  let mockPlayers, mockTeams;

  beforeEach(() => {
    mockPlayers = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(0),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    mockTeams = {
      findOne: jest.fn(),
    };
    getPlayersCollection.mockResolvedValue(mockPlayers);
    getTeamsCollection.mockResolvedValue(mockTeams);
  });

  afterEach(() => jest.clearAllMocks());

  test('OPTIONS request returns 200', async () => {
    const { req, res, end } = mockReqRes({ method: 'OPTIONS' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(end).toHaveBeenCalled();
  });

  test('GET players with filters', async () => {
    mockPlayers.toArray.mockResolvedValue([{ id: 1, name: 'Player 1' }]);
    mockPlayers.countDocuments.mockResolvedValue(1);

    const { req, res, json } = mockReqRes({ method: 'GET', query: { limit: '1', offset: '0' } });
    await handler(req, res);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      players: expect.any(Array),
      total: 1,
      limit: 1,
      offset: 0
    }));
  });

  test('GET resolves teamName to teamId', async () => {
    mockTeams.findOne.mockResolvedValue({ _id: 123, name: 'MyTeam' });
    mockPlayers.toArray.mockResolvedValue([{ id: 1, teamId: 123, name: 'Player T' }]);
    mockPlayers.countDocuments.mockResolvedValue(1);

    const { req, res, json } = mockReqRes({
      method: 'GET',
      query: { teamName: 'MyTeam' }
    });
    await handler(req, res);

    expect(mockTeams.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(Object) })
    );
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      players: expect.any(Array)
    }));
  });

  test('POST creates a new player', async () => {
    const fakeId = new ObjectId();
    mockPlayers.insertOne.mockResolvedValue({ insertedId: fakeId });

    const playerData = { name: 'New Player', position: 'Midfielder' };
    const { req, res, json } = mockReqRes({ method: 'POST', body: playerData });

    await handler(req, res);

    expect(mockPlayers.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Player',
      position: 'Midfielder',
    }));
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      playerId: fakeId,
      player: expect.objectContaining(playerData)
    }));
  });

  test('POST fails without name', async () => {
    const { req, res, json } = mockReqRes({ method: 'POST', body: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Player name is required' });
  });

  test('POST returns 500 on insert error', async () => {
    mockPlayers.insertOne.mockRejectedValue(new Error('Insert fail'));
    const { req, res, json } = mockReqRes({ method: 'POST', body: { name: 'Err Player' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'Failed to create player' });
  });

  test('PUT updates a player', async () => {
    mockPlayers.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const updates = { position: 'Defender' };
    const { req, res, json } = mockReqRes({ method: 'PUT', query: { id: '1' }, body: updates });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true, modified: true }));
  });

  test('PUT fails without ID', async () => {
    const { req, res, json } = mockReqRes({ method: 'PUT', query: {}, body: { position: 'Defender' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Player ID is required' });
  });

  test('PUT returns 404 if player not found', async () => {
    mockPlayers.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
    const { req, res, json } = mockReqRes({ method: 'PUT', query: { id: '99' }, body: { position: 'GK' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: 'Player not found' });
  });

  test('PUT returns 500 on update error', async () => {
    mockPlayers.updateOne.mockRejectedValue(new Error('Update fail'));
    const { req, res, json } = mockReqRes({ method: 'PUT', query: { id: '1' }, body: { position: 'GK' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'Failed to update player' });
  });

  test('DELETE removes a player', async () => {
    mockPlayers.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const { req, res, json } = mockReqRes({ method: 'DELETE', query: { id: '1' } });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith({ success: true, deleted: true });
  });

  test('DELETE fails without ID', async () => {
    const { req, res, json } = mockReqRes({ method: 'DELETE', query: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Player ID is required' });
  });

  test('DELETE returns 404 if player not found', async () => {
    mockPlayers.deleteOne.mockResolvedValue({ deletedCount: 0 });
    const { req, res, json } = mockReqRes({ method: 'DELETE', query: { id: '99' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: 'Player not found' });
  });

  test('DELETE returns 500 on delete error', async () => {
    mockPlayers.deleteOne.mockRejectedValue(new Error('Delete fail'));
    const { req, res, json } = mockReqRes({ method: 'DELETE', query: { id: '1' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'Failed to delete player' });
  });

  test('method not allowed returns 405', async () => {
    const { req, res, json } = mockReqRes({ method: 'PATCH' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  test('internal error returns 500', async () => {
    // Patch: make find throw inside handler
    const badPlayers = {
      find: () => { throw new Error('DB fail'); }
    };
    getPlayersCollection.mockResolvedValue(badPlayers);

    const { req, res, json } = mockReqRes({ method: 'GET' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Failed to fetch players' }));
  });
});