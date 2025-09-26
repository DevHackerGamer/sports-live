// /api/__tests__/teams.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

jest.mock('mongodb', () => {
  const mCollection = {
    findOne: jest.fn(),
    find: jest.fn(() => ({ toArray: jest.fn() })),
    insertMany: jest.fn(),
  };
  const mDb = { collection: jest.fn(() => mCollection) };
  const mClient = { db: jest.fn(() => mDb), connect: jest.fn() };

  return {
    MongoClient: jest.fn(() => mClient),
    __mockClient: mClient,
    __mockDb: mDb,
    __mockCollection: mCollection,
  };
});

const { MongoClient, __mockCollection } = require('mongodb');
const handler = require('../../../api/teams');

// ---- Mock res like in competitions ----
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

describe('Teams API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------- OPTIONS ----------------
  it('OPTIONS returns 200', async () => {
    const res = await runHandler({ method: 'OPTIONS' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  // ---------------- GET ALL ----------------
  it('GET all teams success', async () => {
    const fakeTeams = [{ id: 1, name: 'Team A' }, { id: 2, name: 'Team B' }];
    __mockCollection.find.mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(fakeTeams) });

    const res = await runHandler({ method: 'GET', query: {} });

    expect(__mockCollection.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: fakeTeams,
        count: fakeTeams.length,
      })
    );
  });

  // ---------------- GET BY ID ----------------
  it('GET by id returns team', async () => {
    const fakeTeam = { id: 123, name: 'Special Team' };
    __mockCollection.findOne.mockResolvedValue(fakeTeam);

    const res = await runHandler({ method: 'GET', query: { id: '123' } });

    expect(__mockCollection.findOne).toHaveBeenCalledWith({ id: 123 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: fakeTeam });
  });

  it('GET by id not found', async () => {
    __mockCollection.findOne.mockResolvedValue(null);

    const res = await runHandler({ method: 'GET', query: { id: '999' } });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Team not found' });
  });

  // ---------------- POST ----------------
  it('POST inserts valid teams', async () => {
    __mockCollection.insertMany.mockResolvedValue({ insertedCount: 2 });
    const newTeams = [{ id: 1, name: 'T1' }, { id: 2, name: 'T2' }];

    const res = await runHandler({ method: 'POST', body: { teams: newTeams } });

    expect(__mockCollection.insertMany).toHaveBeenCalledWith(newTeams);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, insertedCount: 2 });
  });

  it('POST with invalid body', async () => {
    const res = await runHandler({ method: 'POST', body: {} });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or missing teams array',
    });
  });

  // ---------------- ERROR HANDLING ----------------
  it('GET error returns 500', async () => {
    __mockCollection.find.mockImplementationOnce(() => {
      throw new Error('DB failure');
    });

    const res = await runHandler({ method: 'GET', query: {} });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Failed to handle teams request',
        message: 'DB failure',
      })
    );
  });

  // ---------------- METHOD NOT ALLOWED ----------------
  it('DELETE not allowed', async () => {
    const res = await runHandler({ method: 'DELETE' });

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Method not allowed' });
  });
});
