// /api/__tests__/displayState.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

jest.mock('../../../lib/mongodb.js', () => ({
  getDisplayStateCollection: jest.fn(),
}));

const { getDisplayStateCollection } = require('../../../lib/mongodb');
const handler = require('../../../api/display-state'); 

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

describe('Display State API', () => {
  let mockCol;

  beforeEach(() => {
    mockCol = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
    };
    getDisplayStateCollection.mockResolvedValue(mockCol);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------- OPTIONS ----------------
  it('OPTIONS returns 200', async () => {
    const res = await runHandler({ method: 'OPTIONS' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  // ---------------- GET ----------------
  it('GET existing state', async () => {
    const state = { _id: 'main', status: 'active', message: 'Fetching' };
    mockCol.findOne.mockResolvedValue(state);

    const res = await runHandler({ method: 'GET' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, state });
  });

  it('GET no state -> insert default', async () => {
    mockCol.findOne.mockResolvedValue(null);
    mockCol.insertOne.mockResolvedValue({});

    const res = await runHandler({ method: 'GET' });

    expect(mockCol.insertOne).toHaveBeenCalled();
    const defaultState = mockCol.insertOne.mock.calls[0][0];
    expect(defaultState._id).toBe('main');

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, state: defaultState });
  });

  it('GET error', async () => {
    mockCol.findOne.mockRejectedValue(new Error('DB fail'));

    const res = await runHandler({ method: 'GET' });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch display state' });
  });

  // ---------------- PUT ----------------
  it('PUT update state success', async () => {
    const updates = { status: 'loading', message: 'Updating' };
    mockCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
    const updatedState = { _id: 'main', ...updates, lastUpdated: new Date() };
    mockCol.findOne.mockResolvedValue(updatedState);

    const res = await runHandler({ method: 'PUT', body: updates });

    expect(mockCol.updateOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      state: updatedState,
      modified: true
    });
  });

  it('PUT error', async () => {
    mockCol.updateOne.mockRejectedValue(new Error('DB fail'));
    const res = await runHandler({ method: 'PUT', body: { status: 'x' } });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update display state' });
  });

  // ---------------- Method not allowed ----------------
  it('Method not allowed for POST', async () => {
    const res = await runHandler({ method: 'POST' });
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });
});