// /api/__tests__/standings.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const { ObjectId } = require('mongodb');

// Mock MongoDB helpers
jest.mock('../../lib/mongodb', () => ({
  getStandingsCollection: jest.fn(),
  getTeamsCollection: jest.fn(),
}));

// Mock auth helper
jest.mock('../../lib/auth', () => ({
  isAdmin: jest.fn(),
}));

const { getStandingsCollection, getTeamsCollection } = require('../../lib/mongodb');
const { isAdmin } = require('../../lib/auth');
const handler = require('../../api/standings'); // adjust path

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

describe('standings API', () => {
  let mockCollection;
  let mockTeamsCollection;

  beforeEach(() => {
    mockCollection = {
      find: jest.fn(() => ({ limit: () => ({ toArray: jest.fn() }) })),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    mockTeamsCollection = {
      find: jest.fn(() => ({ project: () => ({ toArray: jest.fn() }) }))
    };
    getStandingsCollection.mockResolvedValue(mockCollection);
    getTeamsCollection.mockResolvedValue(mockTeamsCollection);
    isAdmin.mockResolvedValue(true);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------- GET all standings ----------------
  it('GET all standings', async () => {
    const fakeDoc = {
      _id: 'BL1-2025',
      standings: [
        { type: 'TOTAL', table: [{ team: { id: 1, name: 'TeamA' }, position: 1 }] }
      ]
    };
    mockCollection.find.mockReturnValue({ limit: () => ({ toArray: jest.fn().mockResolvedValue([fakeDoc]) }) });
    mockTeamsCollection.find.mockReturnValue({
      project: () => ({ toArray: jest.fn().mockResolvedValue([{ id: 1, crest: 'logo.png' }]) })
    });

    const res = await runHandler({ method: 'GET', query: { competition: 'BL1', season: '2025' } });

    expect(res.status).toHaveBeenCalledWith(200);
    const json = res.json.mock.calls[0][0];
    expect(json.success).toBe(true);
    expect(json.count).toBe(1);
    expect(json.data[0].standings[0].table[0].team.crest).toBe('logo.png');
  });

  // ---------------- GET single standings by ID ----------------
  it('GET single standings', async () => {
    const doc = { _id: 'BL1-2025' };
    mockCollection.findOne.mockResolvedValue(doc);

    const res = await runHandler({ method: 'GET', url: '/api/standings/BL1-2025' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: doc });
  });

  it('GET single standings not found', async () => {
    mockCollection.findOne.mockResolvedValue(null);
    const res = await runHandler({ method: 'GET', url: '/api/standings/unknown' });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Standings not found' });
  });

  // ---------------- POST new standings (admin) ----------------
  it('POST new standings', async () => {
    mockCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

    const req = { method: 'POST', body: { competition: 'BL1', season: '2025' } };
    const res = await runHandler(req);

    expect(isAdmin).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    const json = res.json.mock.calls[0][0];
    expect(json.success).toBe(true);
    expect(json.id).toBeDefined();
  });

  it('POST forbidden if not admin', async () => {
    isAdmin.mockResolvedValue(false);
    const req = { method: 'POST', body: {} };
    const res = await runHandler(req);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Forbidden: admin required' });
  });

  // ---------------- PUT update standings ----------------
  it('PUT update standings', async () => {
    mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const req = { method: 'PUT', url: '/api/standings/BL1-2025', body: { type: 'HOME' } };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(200);
    const json = res.json.mock.calls[0][0];
    expect(json.success).toBe(true);
    expect(json.modified).toBe(true);
  });

  it('PUT standings not found', async () => {
    mockCollection.updateOne.mockResolvedValue({ matchedCount: 0 });
    const req = { method: 'PUT', url: '/api/standings/BL1-2025', body: {} };
    const res = await runHandler(req);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Standings not found' });
  });

  // ---------------- DELETE standings ----------------
  it('DELETE standings', async () => {
    mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const res = await runHandler({ method: 'DELETE', url: '/api/standings/BL1-2025' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, deleted: true });
  });

  it('DELETE standings not found', async () => {
    mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });
    const res = await runHandler({ method: 'DELETE', url: '/api/standings/BL1-2025' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, deleted: false });
  });

  // ---------------- Method not allowed ----------------
  it('Method not allowed', async () => {
    const res = await runHandler({ method: 'PATCH', url: '/api/standings' });
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Method not allowed' });
  });

  // ---------------- Internal server error ----------------
  it('Handles internal server error', async () => {
    getStandingsCollection.mockRejectedValue(new Error('DB down'));
    const res = await runHandler({ method: 'GET', query: {} });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Internal server error',
      message: 'DB down'
    }));
  });
});
