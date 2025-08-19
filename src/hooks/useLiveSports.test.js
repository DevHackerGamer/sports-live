import { renderHook, act, waitFor } from '@testing-library/react';
import { useLiveSports } from './useLiveSports';

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
  jest.resetAllMocks();
});

const mockData = {
  games: [
    { id: '1', homeTeam: 'A', awayTeam: 'B', status: 'live', competition: 'League', homeScore: 1, awayScore: 2 },
  ],
  source: 'Test API',
  totalMatches: 1,
};

test('fetches sports data and updates state', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockData,
  });

  const { result } = renderHook(() => useLiveSports(10000));

  // Initial fetchSportsData called on mount, but async
  expect(result.current.isConnected).toBe(false);
  expect(result.current.sportsData).toBe(null);

  // Wait for the async fetchSportsData to complete and state update
  await waitFor(() => {
    expect(result.current.sportsData).not.toBeNull();
  });

  // Stop background interval to avoid additional updates during assertions
  act(() => {
    result.current.stopUpdates();
  });

  expect(result.current.isConnected).toBe(true);
  expect(result.current.sportsData).toEqual(mockData);
  expect(result.current.error).toBe(null);
  expect(result.current.lastUpdated).toBeInstanceOf(Date);
});

test('refreshData triggers a new fetch', async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => mockData,
  });

  const { result } = renderHook(() => useLiveSports(10000));

  await waitFor(() => {
    expect(result.current.sportsData).not.toBeNull();
  });

  act(() => {
    result.current.refreshData();
  });

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  expect(fetch).toHaveBeenCalledTimes(2); // initial + refresh
  expect(result.current.sportsData).toEqual(mockData);

  act(() => {
    result.current.stopUpdates();
  });
});

test('handles fetch error gracefully', async () => {
  fetch.mockRejectedValueOnce(new Error('Fetch failed'));

  const { result } = renderHook(() => useLiveSports(10000));

  // Hook uses fallback data on API failure (no error is set in this path)
  await waitFor(() => {
    expect(result.current.sportsData).not.toBeNull();
  });

  expect(result.current.error).toBe(null);
  expect(result.current.isConnected).toBe(false);
  expect(result.current.sportsData.games?.length).toBeGreaterThan(0);

  act(() => {
    result.current.stopUpdates();
  });
});

test('startUpdates and stopUpdates control the interval', async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => mockData,
  });

  const { result } = renderHook(() => useLiveSports(1000));

  // Interval should be running now; advance timers to trigger fetchSportsData calls
  expect(fetch).toHaveBeenCalledTimes(1); // initial call

  act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(fetch).toHaveBeenCalledTimes(2);

  act(() => {
    result.current.stopUpdates();
    jest.advanceTimersByTime(5000);
  });
  expect(fetch).toHaveBeenCalledTimes(2); // no more calls after stopUpdates

  act(() => {
    result.current.startUpdates();
    jest.advanceTimersByTime(1000);
  });
  expect(fetch).toHaveBeenCalledTimes(4); // restarted interval calls

  act(() => {
    result.current.stopUpdates();
  });
});

test('handles unexpected error in fetchSportsData top-level catch', async () => {
  const originalLog = console.log;
  console.log = () => { throw new Error('boom'); };

  const { result } = renderHook(() => useLiveSports(10000));

  await waitFor(() => {
    expect(result.current.error).toBe('boom');
    expect(result.current.isConnected).toBe(false);
  });

  console.log = originalLog;
  act(() => {
    result.current.stopUpdates();
  });
});
