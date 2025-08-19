/**
 * @jest-environment node
 */

import handler from '../../api/joke.js';
import { createMocks } from 'node-mocks-http';

describe('/api/joke', () => {
  test('returns a joke with timestamp', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('joke');
    expect(data).toHaveProperty('timestamp');
    expect(typeof data.joke).toBe('string');
    expect(data.joke.length).toBeGreaterThan(0);

    // Verify timestamp is valid ISO string
    expect(() => new Date(data.timestamp)).not.toThrow();
  });

  test('returns different jokes on multiple calls', async () => {
    const jokes = new Set();

    // Make multiple requests
    for (let i = 0; i < 10; i++) {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);
      const data = JSON.parse(res._getData());
      jokes.add(data.joke);
    }

    // Should have at least some variety (not all the same joke)
    expect(jokes.size).toBeGreaterThan(1);
  });
});
