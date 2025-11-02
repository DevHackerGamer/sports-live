// /api/__tests__/competitions.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

jest.mock('../../../lib/mongodb.js', () => ({
  getMatchesCollectionESPN: jest.fn(),
}));

const { getMatchesCollectionESPN } = require('../../../lib/mongodb');
const handler = require('../../../api/competitions');

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
    getMatchesCollectionESPN.mockResolvedValue(mockMatchesCol);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------- OPTIONS ----------------
  it('OPTIONS returns 200', async () => {
    const res = await runHandler({ method: 'OPTIONS' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  // ---------------- GET ----------------
  it('GET competitions success with ESPN leagues', async () => {
    mockMatchesCol.distinct.mockResolvedValue(['eng.1', 'esp.1', 'ita.1']);
    
    const res = await runHandler({ method: 'GET' });

    expect(getMatchesCollectionESPN).toHaveBeenCalled();
    expect(mockMatchesCol.distinct).toHaveBeenCalledWith('competition.name', { 'competition.name': { $exists: true } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        'Premier League [eng.1]',
        'La Liga [esp.1]', 
        'Serie A [ita.1]'
      ],
      competitions: [
        { code: 'eng.1', name: 'Premier League', display: 'Premier League [eng.1]' },
        { code: 'esp.1', name: 'La Liga', display: 'La Liga [esp.1]' },
        { code: 'ita.1', name: 'Serie A', display: 'Serie A [ita.1]' }
      ],
      count: 3,
      source: 'espn'
    });
  });

  it('GET competitions filters only valid ESPN leagues', async () => {
    mockMatchesCol.distinct.mockResolvedValue(['eng.1', 'invalid.league', 'esp.1', 'unknown.competition']);
    
    const res = await runHandler({ method: 'GET' });

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        'Premier League [eng.1]',
        'La Liga [esp.1]'
      ],
      competitions: [
        { code: 'eng.1', name: 'Premier League', display: 'Premier League [eng.1]' },
        { code: 'esp.1', name: 'La Liga', display: 'La Liga [esp.1]' }
      ],
      count: 2,
      source: 'espn'
    });
  });

  it('GET competitions handles empty results', async () => {
    mockMatchesCol.distinct.mockResolvedValue([]);
    
    const res = await runHandler({ method: 'GET' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
      competitions: [],
      count: 0,
      source: 'espn'
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