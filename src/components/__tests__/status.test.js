// /api/__tests__/healthcheck.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const handler = require('../../../api/status'); // adjust path

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

async function runHandler(req) {
  const res = mockResponse();
  await handler(req, res);
  return res;
}

describe('Healthcheck API', () => {
  it('GET returns status ok with timestamp', async () => {
    const res = await runHandler({ method: 'GET' });

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];

    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('time');
    expect(new Date(data.time).toString()).not.toBe('Invalid Date');
  });
});