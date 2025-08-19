/**
 * @jest-environment node
 */

import sportsHandler from '../../api/sports-data.js';
import statusHandler from '../../api/status.js';
import uptimeHandler from '../../api/uptime.js';
import { createMocks } from 'node-mocks-http';

const run = async (handler, method = 'GET') => {
  const { req, res } = createMocks({ method });
  await handler(req, res);
  return res;
};

describe('API routes', () => {
  test('/api/sports-data returns expected shape', async () => {
    // Ensure token is present
    process.env.FOOTBALL_API_TOKEN = 'test-token';
    // Mock fetch to return a minimal valid payload
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        matches: [
          {
            id: 1,
            homeTeam: { name: 'Home FC' },
            awayTeam: { name: 'Away FC' },
            score: { fullTime: { home: 1, away: 0 } },
            status: 'SCHEDULED',
            utcDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            competition: { name: 'League', area: { name: 'EU' } },
            lastUpdated: new Date().toISOString(),
          },
        ],
      }),
    });

    const { req, res } = createMocks({ method: 'GET' });
    await sportsHandler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('games');
    expect(Array.isArray(data.games)).toBe(true);
    expect(data).toHaveProperty('source');
    expect(data).toHaveProperty('totalMatches');
  });

  test('/api/status returns health info', async () => {
    const res = await run(statusHandler);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('status');
    // Status API returns 'time' field
    expect(data).toHaveProperty('time');
  });

  test('/api/uptime returns uptime metrics', async () => {
    const res = await run(uptimeHandler);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    // Uptime API exposes uptimeMs and uptimeFormatted
    expect(data).toHaveProperty('uptimeMs');
    expect(typeof data.uptimeMs).toBe('number');
  });
});
