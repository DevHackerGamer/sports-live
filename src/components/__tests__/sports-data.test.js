// /api/__tests__/footballData.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const handler = require('../../../api/sports-data'); // adjust path
const { getMatchesCollection, getTeamsCollection } = require('../../../lib/mongodb');

jest.mock('../../../lib/mongodb', () => ({
  getMatchesCollection: jest.fn(),
  getTeamsCollection: jest.fn()
}));

const fetch = require('node-fetch');
jest.mock('node-fetch', () => jest.fn());

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

describe('footballData API', () => {
  let mockMatchesCol, mockTeamsCol;

  beforeEach(() => {
    mockMatchesCol = { bulkWrite: jest.fn().mockResolvedValue({}) };
    mockTeamsCol = { bulkWrite: jest.fn().mockResolvedValue({}) };
    getMatchesCollection.mockResolvedValue(mockMatchesCol);
    getTeamsCollection.mockResolvedValue(mockTeamsCol);
    fetch.mockReset();
  });

  afterEach(() => jest.clearAllMocks());

  it('OPTIONS request returns 200', async () => {
    const res = await runHandler({ method: 'OPTIONS' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  it('GET request without token fails', async () => {
    process.env.FOOTBALL_API_TOKEN = '';
    const res = await runHandler({ method: 'GET', query: {} });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unable to fetch sports data' }));
  });

  it('GET request for teams returns cached data', async () => {
    process.env.FOOTBALL_API_TOKEN = 'fake-token';
    const fakeTeams = [{ id: 1, name: 'TeamA' }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ competitions: [{ code: 'PL' }] })
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ teams: fakeTeams })
    });

    const res = await runHandler({ method: 'GET', query: { endpoint: 'teams' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 1 }));
  });

  it('GET request for matches returns structured payload', async () => {
    process.env.FOOTBALL_API_TOKEN = 'fake-token';
    const fakeMatches = {
      matches: [
        {
          id: 123,
          homeTeam: { name: 'TeamA' },
          awayTeam: { name: 'TeamB' },
          score: { fullTime: { home: 2, away: 1 } },
          status: 'FINISHED',
          competition: { name: 'Premier League', code: 'PL', area: { name: 'England' } },
          utcDate: '2025-09-22T18:00:00Z'
        }
      ]
    };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => fakeMatches });

    const res = await runHandler({ method: 'GET', query: {} });

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.games[0].homeTeam).toBe('TeamA');
    expect(payload.games[0].awayTeam).toBe('TeamB');
    expect(payload.games[0].status).toBe('final');
  });

  it('Non-GET request returns 405', async () => {
    const res = await runHandler({ method: 'POST' });
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Method not allowed' }));
  });
});
