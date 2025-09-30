// /api/__tests__/competitions.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

jest.mock('../../../lib/mongodb.js', () => ({
  getMatchesCollection: jest.fn(),
}));

const { getMatchesCollection } = require('../../../lib/mongodb');
const handler = require('../../../api/competitions'); // adjust path

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

describe('Competitions API', () => {
  let mockMatchesCol;

  beforeEach(() => {
    mockMatchesCol = {
      distinct: jest.fn(),
    };
    getMatchesCollection.mockResolvedValue(mockMatchesCol);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------- OPTIONS ----------------
  it('OPTIONS returns 200', async () => {
    const res = await runHandler({ method: 'OPTIONS' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  // ---------------- GET ----------------
  it('GET competitions success', async () => {
    mockMatchesCol.distinct.mockResolvedValue(['League A', 'League B', null, '']);
    
    const res = await runHandler({ method: 'GET' });

    expect(mockMatchesCol.distinct).toHaveBeenCalledWith('competition.name', { 'competition.name': { $exists: true } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: ['League A', 'League B'],
      count: 2
    });
  });

  it('GET competitions error', async () => {
    mockMatchesCol.distinct.mockRejectedValue(new Error('DB fail'));

    const res = await runHandler({ method: 'GET' });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Failed to load competitions',
      message: 'DB fail'
    });
  });

  // ---------------- Method not allowed ----------------
  it('Method not allowed for POST', async () => {
    const res = await runHandler({ method: 'POST' });

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Method not allowed' });
  });
});