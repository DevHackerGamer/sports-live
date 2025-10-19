// __tests__/api/standings.test.js

// Fix for Jest environment (Node doesn't define TextEncoder/Decoder by default)
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock MongoDB helpers
jest.mock('../../../lib/mongodb', () => ({
  getStandingsCollection: jest.fn(),
  getTeamsCollection: jest.fn(),
}));

// Add this after your MongoDB mocks
jest.mock('../../../lib/auth', () => ({
  isAdmin: jest.fn(),
}));

const { isAdmin } = require('../../../lib/auth');


const { getStandingsCollection, getTeamsCollection } = require('../../../lib/mongodb');
const handler = require('../../../api/standings');

// Helper to create mock req/res
const createMocks = (method = 'GET', { query = {}, body = {}, url = '/api/standings' } = {}) => {
  const req = { method, query, body, url };
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    end: jest.fn(),
  };
  return { req, res };
};

describe('/api/standings', () => {
  let mockStandingsCollection;
  let mockTeamsCollection;

  beforeEach(() => {
    mockStandingsCollection = {
      find: jest.fn(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    mockTeamsCollection = {
      find: jest.fn().mockReturnValue({ project: jest.fn().mockReturnValue({ toArray: jest.fn() }) }),
    };

    getStandingsCollection.mockResolvedValue(mockStandingsCollection);
    getTeamsCollection.mockResolvedValue(mockTeamsCollection);

    jest.clearAllMocks();
    isAdmin.mockResolvedValue(true);
  });

  it('responds to OPTIONS', async () => {
    const { req, res } = createMocks('OPTIONS');
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  it('GET all standings returns enriched data', async () => {
    const fakeDocs = [
      { _id: 'BL1-2025', standings: [{ table: [{ team: { id: 1 } }] }] },
    ];
    const toArrayMock = jest.fn().mockResolvedValue(fakeDocs);
    mockStandingsCollection.find.mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: toArrayMock }) });
    mockTeamsCollection.find().project().toArray.mockResolvedValue([{ id: 1, crest: 'crest1' }]);

    const { req, res } = createMocks('GET');
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      count: 1,
      data: expect.any(Array),
      filters: expect.objectContaining({ limit: 20 }),
      lastUpdated: expect.any(String),
    }));
  });

  it('GET /:id returns single document', async () => {
    const doc = { _id: 'BL1-2025' };
    mockStandingsCollection.findOne.mockResolvedValue(doc);

    const { req, res } = createMocks('GET', { url: '/api/standings/BL1-2025' });
    await handler(req, res);

    expect(mockStandingsCollection.findOne).toHaveBeenCalledWith({ _id: 'BL1-2025' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: doc });
  });

  it('POST inserts new standings', async () => {
    mockStandingsCollection.insertOne.mockResolvedValue({ insertedId: '123' });
    const { req, res } = createMocks('POST', { body: { competition: 'BL1' } });

    await handler(req, res);

    expect(mockStandingsCollection.insertOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, id: '123' });
  });

  it('PUT updates existing standings', async () => {
    mockStandingsCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const { req, res } = createMocks('PUT', { url: '/api/standings/BL1-2025', body: { stage: 'REGULAR_SEASON' } });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, modified: true });
  });

  it('DELETE removes standings', async () => {
    mockStandingsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const { req, res } = createMocks('DELETE', { url: '/api/standings/BL1-2025' });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, deleted: true });
  });

  it('returns 405 for unsupported methods', async () => {
    const { req, res } = createMocks('PATCH');
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Method not allowed' });
  });

  it('handles errors gracefully', async () => {
    getStandingsCollection.mockRejectedValue(new Error('DB down'));
    const { req, res } = createMocks('GET');

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Internal server error',
      message: 'DB down',
    }));
  });
});
