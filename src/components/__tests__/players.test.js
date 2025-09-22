// /api/__tests__/players.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

jest.mock('../../../lib/mongodb.js', () => ({
  getPlayersCollection: jest.fn(),
  getTeamsCollection: jest.fn(),
}));

const { getPlayersCollection, getTeamsCollection } = require('../../../lib/mongodb');
const handler = require('../../../api/players'); // adjust path if needed

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

describe('players API', () => {
  let mockPlayersCol, mockTeamsCol;

  beforeEach(() => {
    mockPlayersCol = {
      find: jest.fn(),
      sort: jest.fn(),
      skip: jest.fn(),
      limit: jest.fn(),
      toArray: jest.fn(),
      countDocuments: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    mockTeamsCol = {
      findOne: jest.fn(),
    };

    getPlayersCollection.mockResolvedValue(mockPlayersCol);
    getTeamsCollection.mockResolvedValue(mockTeamsCol);

    // default chain for find
    mockPlayersCol.find.mockReturnValue(mockPlayersCol);
    mockPlayersCol.sort.mockReturnValue(mockPlayersCol);
    mockPlayersCol.skip.mockReturnValue(mockPlayersCol);
    mockPlayersCol.limit.mockReturnValue(mockPlayersCol);
    mockPlayersCol.toArray.mockResolvedValue([]);
    mockPlayersCol.countDocuments.mockResolvedValue(0);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------- OPTIONS ----------------
  it('OPTIONS request returns 200', async () => {
    const res = await runHandler({ method: 'OPTIONS', query: {} });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  // ---------------- GET ----------------
  it('GET players with default filter', async () => {
    const fakePlayers = [{ id: 1, name: 'Player1' }];
    mockPlayersCol.toArray.mockResolvedValue(fakePlayers);
    mockPlayersCol.countDocuments.mockResolvedValue(1);

    const res = await runHandler({ method: 'GET', query: {} });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        players: fakePlayers,
        total: 1,
      })
    );
  });

  it('GET players resolves teamId from teamName', async () => {
    mockTeamsCol.findOne.mockResolvedValue({ id: 123 });
    mockPlayersCol.toArray.mockResolvedValue([{ id: 2, name: 'WithTeam' }]);

    const res = await runHandler({ method: 'GET', query: { teamName: 'Arsenal' } });

    expect(mockTeamsCol.findOne).toHaveBeenCalledWith({
      name: { $regex: '^Arsenal$', $options: 'i' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('GET players error', async () => {
    mockPlayersCol.toArray.mockRejectedValue(new Error('DB fail'));

    const res = await runHandler({ method: 'GET', query: {} });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch players' });
  });

  // ---------------- POST ----------------
  it('POST valid player', async () => {
    mockPlayersCol.insertOne.mockResolvedValue({ insertedId: 'p123' });

    const body = { name: 'Messi', position: 'FW' };
    const res = await runHandler({ method: 'POST', body });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        playerId: 'p123',
        player: expect.objectContaining({ name: 'Messi' }),
      })
    );
  });

  it('POST missing name', async () => {
    const res = await runHandler({ method: 'POST', body: { nationality: 'FR' } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Player name is required' });
  });

  it('POST error', async () => {
    mockPlayersCol.insertOne.mockRejectedValue(new Error('Insert fail'));
    const res = await runHandler({ method: 'POST', body: { name: 'X' } });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create player' });
  });

  // ---------------- PUT ----------------
  it('PUT update success', async () => {
    mockPlayersCol.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    const res = await runHandler({ method: 'PUT', query: { id: '1' }, body: { position: 'GK' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, modified: true });
  });

  it('PUT missing id', async () => {
    const res = await runHandler({ method: 'PUT', query: {}, body: {} });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Player ID is required' });
  });

  it('PUT not found', async () => {
    mockPlayersCol.updateOne.mockResolvedValue({ matchedCount: 0 });
    const res = await runHandler({ method: 'PUT', query: { id: '999' }, body: { position: 'DF' } });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Player not found' });
  });

  it('PUT error', async () => {
    mockPlayersCol.updateOne.mockRejectedValue(new Error('Update fail'));
    const res = await runHandler({ method: 'PUT', query: { id: '1' }, body: {} });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update player' });
  });

  // ---------------- DELETE ----------------
  it('DELETE success', async () => {
    mockPlayersCol.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const res = await runHandler({ method: 'DELETE', query: { id: '1' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, deleted: true });
  });

  it('DELETE missing id', async () => {
    const res = await runHandler({ method: 'DELETE', query: {} });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Player ID is required' });
  });

  it('DELETE not found', async () => {
    mockPlayersCol.deleteOne.mockResolvedValue({ deletedCount: 0 });
    const res = await runHandler({ method: 'DELETE', query: { id: '999' } });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Player not found' });
  });

  it('DELETE error', async () => {
    mockPlayersCol.deleteOne.mockRejectedValue(new Error('Delete fail'));
    const res = await runHandler({ method: 'DELETE', query: { id: '1' } });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete player' });
  });

  // ---------------- Method not allowed ----------------
  it('Method not allowed', async () => {
    const res = await runHandler({ method: 'PATCH', query: {} });
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });
});
