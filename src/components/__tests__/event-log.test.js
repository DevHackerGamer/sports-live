// /api/__tests__/eventLog.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

jest.mock('../../../lib/mongodb.js', () => ({
  getEventLogCollection: jest.fn(),
}));

const { getEventLogCollection } = require('../../../lib/mongodb');
const handler = require('../../../api/event-log'); 

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

describe('Event Log API', () => {
  let mockCol;

  beforeEach(() => {
    mockCol = {
      find: jest.fn(),
      insertOne: jest.fn(),
    };
    getEventLogCollection.mockResolvedValue(mockCol);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------- OPTIONS ----------------
  it('OPTIONS returns 200', async () => {
    const res = await runHandler({ method: 'OPTIONS' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  // ---------------- GET ----------------
  it('GET returns events', async () => {
    const fakeEvents = [
      { type: 'goal', message: 'Goal scored', timestamp: new Date() }
    ];
    mockCol.find.mockReturnValue({ sort: () => ({ limit: () => ({ toArray: () => fakeEvents }) }) });

    const res = await runHandler({ method: 'GET', query: {} });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      events: fakeEvents,
      total: fakeEvents.length
    });
  });

  it('GET with filters passes correct query', async () => {
    const fakeEvents = [];
    const sortMock = { limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(fakeEvents) }) };
    mockCol.find.mockReturnValue({ sort: () => sortMock });

    const query = { type: 'goal', matchId: '123', limit: '10', startDate: '2025-01-01', endDate: '2025-12-31' };
    await runHandler({ method: 'GET', query });

    expect(mockCol.find).toHaveBeenCalled();
  });

  it('GET error handling', async () => {
    mockCol.find.mockImplementation(() => { throw new Error('DB fail'); });

    const res = await runHandler({ method: 'GET', query: {} });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch event logs' });
  });

  // ---------------- POST ----------------
  it('POST creates event successfully', async () => {
    const body = { type: 'goal', message: 'Goal scored', matchId: '123' };
    mockCol.insertOne.mockResolvedValue({ insertedId: 'abc123' });

    const res = await runHandler({ method: 'POST', body });

    expect(mockCol.insertOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    const created = res.json.mock.calls[0][0];
    expect(created.success).toBe(true);
    expect(created.eventId).toBe('abc123');
    expect(created.event.type).toBe('goal');
    expect(created.event.matchId).toBe('123');
  });

  it('POST missing type or message -> 400', async () => {
    const res = await runHandler({ method: 'POST', body: { type: 'goal' } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Type and message are required' });
  });

  it('POST error handling', async () => {
    mockCol.insertOne.mockRejectedValue(new Error('DB fail'));
    const res = await runHandler({ method: 'POST', body: { type: 'goal', message: 'x' } });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create event log' });
  });

  // ---------------- Method not allowed ----------------
  it('Method not allowed for PUT', async () => {
    const res = await runHandler({ method: 'PUT' });
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });
});