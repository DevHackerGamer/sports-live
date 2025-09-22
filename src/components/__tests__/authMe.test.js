// /api/__tests__/authMe.test.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

jest.mock('../../../lib/auth', () => ({
  getUserType: jest.fn(),
}));

const { getUserType } = require('../../../lib/auth');
const handler = require('../../../api/auth-me'); // adjust path

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

describe('Auth-Me API', () => {
  afterEach(() => jest.clearAllMocks());

  // ---------------- OPTIONS ----------------
  it('OPTIONS returns 200', async () => {
    const res = await runHandler({ method: 'OPTIONS' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  // ---------------- GET ----------------
  it('GET returns user type', async () => {
    getUserType.mockResolvedValue('admin');

    const res = await runHandler({ method: 'GET' });

    expect(getUserType).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, type: 'admin', isAdmin: true });
  });

  it('GET fallback to user if getUserType returns null', async () => {
    getUserType.mockResolvedValue(null);

    const res = await runHandler({ method: 'GET' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, type: 'user', isAdmin: false });
  });

  it('GET fallback to user on error', async () => {
    getUserType.mockRejectedValue(new Error('Auth fail'));

    const res = await runHandler({ method: 'GET' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, type: 'user', isAdmin: false });
  });

  // ---------------- Method not allowed ----------------
  it('Method not allowed for POST', async () => {
    const res = await runHandler({ method: 'POST' });

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Method not allowed' });
  });
});
