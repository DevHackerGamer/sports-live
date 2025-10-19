// __tests__/api/server-uptime.test.js
const handler = require('../../../api/uptime');

const createMocks = (method = 'GET') => {
  const req = { method };
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    end: jest.fn(),
  };
  return { req, res };
};

describe('/api/uptime', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-10-18T12:00:00Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should respond to OPTIONS requests with 200', async () => {
    const { req, res } = createMocks('OPTIONS');
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  it('should return uptime info with correct structure', async () => {
    const { req, res } = createMocks('GET');
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        serverStartTime: expect.any(String),
        currentServerTime: expect.any(String),
        uptimeMs: expect.any(Number),
        uptimeFormatted: expect.any(String),
        status: 'online',
      })
    );
  });

  it('should calculate formatted uptime correctly (short uptime)', async () => {
    // simulate just 3 seconds after server start
    jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 3000);
    const { req, res } = createMocks('GET');
    await handler(req, res);

    const result = res.json.mock.calls[0][0];
    expect(result.uptimeFormatted).toMatch(/\d+s$/);
  });

  it('should handle unexpected errors gracefully', async () => {
    const { req, res } = createMocks('GET');
    const mockError = new Error('test failure');

    jest.spyOn(Date, 'now').mockImplementationOnce(() => {
      throw mockError;
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to get server uptime',
        message: 'test failure',
      })
    );
  });
});
