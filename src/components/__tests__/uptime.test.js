// /api/__tests__/serverUptime.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const handler = require('../../../api/serverUptime'); // adjust path

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

describe('Server Uptime API', () => {

  // ---------------- OPTIONS ----------------
  it('OPTIONS returns 200', async () => {
    const res = await runHandler({ method: 'OPTIONS' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  // ---------------- GET ----------------
  it('GET returns server uptime', async () => {
    const res = await runHandler({ method: 'GET' });

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];

    expect(data).toHaveProperty('serverStartTime');
    expect(data).toHaveProperty('currentServerTime');
    expect(data).toHaveProperty('uptimeMs');
    expect(data).toHaveProperty('uptimeFormatted');
    expect(data).toHaveProperty('status', 'online');
    expect(data.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it('GET uptime formatted string', async () => {
    const res = await runHandler({ method: 'GET' });
    const formatted = res.json.mock.calls[0][0].uptimeFormatted;
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });

  // ---------------- POST (also allowed) ----------------
  it('POST also returns uptime', async () => {
    const res = await runHandler({ method: 'POST' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    const data = res.json.mock.calls[0][0];
    expect(data.status).toBe('online');
  });

  // ---------------- Invalid method ----------------
  it('Invalid method returns 405', async () => {
    const res = await runHandler({ method: 'PUT' });

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Method not allowed'
    });
  });

});
