import { renderHook, waitFor, act } from '@testing-library/react';
import { useLiveSports } from './useLiveSports';

describe('useLiveSports (development mode)', () => {
  const realEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
    process.env.NODE_ENV = realEnv;
  });

  test('uses dev server API when available', async () => {
    const apiData = { games: [], source: 'Dev API', totalMatches: 0 };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => apiData });

    const { result } = renderHook(() => useLiveSports(10000));

    await waitFor(() => {
      expect(result.current.sportsData).toEqual(apiData);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);

    act(() => {
      result.current.stopUpdates();
    });
  });

  test('falls back to minimal placeholder data when API is unavailable', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useLiveSports(10000));

    await waitFor(() => {
      expect(result.current.sportsData).not.toBeNull();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.sportsData.source).toContain('Fallback');
    expect(result.current.sportsData.totalMatches).toBe(1);

    act(() => {
      result.current.stopUpdates();
    });
  });
});
