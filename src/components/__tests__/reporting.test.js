global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const handler = require('../../../api/reporting');
const { getReportsCollection } = require('../../../lib/mongodb');
const { ObjectId } = require('mongodb');

jest.mock('../../../lib/mongodb.js', () => ({
  getReportsCollection: jest.fn(),
}));

// Mock Express-like req/res
function mockReqRes({ method = 'GET', url = '/api/reporting', query = {}, body = {} } = {}) {
  const json = jest.fn();
  const end = jest.fn();
  const status = jest.fn(() => ({ json, end }));
  const setHeader = jest.fn();
  const res = { status, setHeader, end, json };
  const req = { method, url, query, body, headers: {}, params: {} };
  return { req, res, json, status, setHeader, end };
}

describe('Reporting API', () => {
  let mockReports;

  beforeEach(() => {
    mockReports = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    getReportsCollection.mockResolvedValue(mockReports);
  });

  afterEach(() => jest.clearAllMocks());

  test('POST /api/reporting creates a new report', async () => {
    const now = new Date().toISOString();
    mockReports.insertOne.mockResolvedValue({ insertedId: 'newId' });

    const { req, res, json } = mockReqRes({
      method: 'POST',
      body: { matchId: 1, eventId: 'e1', title: 'Title', description: 'Desc' }
    });

    await handler(req, res);

    expect(mockReports.insertOne).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      id: 'newId',
      data: expect.objectContaining({ matchId: 1, eventId: 'e1', title: 'Title' })
    }));
  });

  test('POST fails with missing fields', async () => {
    const { req, res, json } = mockReqRes({ method: 'POST', body: { matchId: 1 } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Missing required fields' }));
  });

  test('GET /api/reporting returns all reports', async () => {
    mockReports.toArray.mockResolvedValue([{ _id: '1' }, { _id: '2' }]);
    const { req, res, json } = mockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: [{ _id: '1' }, { _id: '2' }]
    }));
  });

  test('GET /api/reporting/:id returns a single report', async () => {
    const id = new ObjectId();
    mockReports.findOne.mockResolvedValue({ _id: id });
    const { req, res, json } = mockReqRes({ method: 'GET', query: { id } });
    await handler(req, res);
    expect(mockReports.findOne).toHaveBeenCalledWith({ _id: id });
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { _id: id } }));
  });

  test('GET /api/reporting/:id returns 404 if not found', async () => {
    const id = new ObjectId();
    mockReports.findOne.mockResolvedValue(null);
    const { req, res, json } = mockReqRes({ method: 'GET', query: { id } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Report not found' }));
  });

  test('PUT /api/reporting/:id updates report', async () => {
    const id = new ObjectId();
    mockReports.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const { req, res, json } = mockReqRes({ method: 'PUT', query: { id }, body: { status: 'resolved' } });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true, modified: true }));
  });

  test('PUT /api/reporting/:id returns 404 if not found', async () => {
    const id = new ObjectId();
    mockReports.updateOne.mockResolvedValue({ matchedCount: 0 });
    const { req, res, json } = mockReqRes({ method: 'PUT', query: { id }, body: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('DELETE /api/reporting/:id removes report', async () => {
    const id = new ObjectId();
    mockReports.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const { req, res, json } = mockReqRes({ method: 'DELETE', query: { id } });
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true, deleted: true }));
  });

  test('DELETE /api/reporting/:id returns 404 if not found', async () => {
    const id = new ObjectId();
    mockReports.deleteOne.mockResolvedValue({ deletedCount: 0 });
    const { req, res, json } = mockReqRes({ method: 'DELETE', query: { id } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('method not allowed returns 405', async () => {
    const { req, res, end } = mockReqRes({ method: 'PATCH' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(end).toHaveBeenCalled();
  });

  test('internal error returns 500', async () => {
    getReportsCollection.mockRejectedValue(new Error('DB fail'));
    const { req, res, json } = mockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal server error' }));
  });
});
