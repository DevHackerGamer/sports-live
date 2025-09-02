// __tests__/useLiveSports.test.js
import { renderHook, act } from '@testing-library/react';
import { useLiveSports } from '../hooks/useLiveSports';
import { apiClient } from '../lib/api';

jest.useFakeTimers();

jest.mock('../lib/api', () => ({
  apiClient: {
    getMatchesByDate: jest.fn()
  }
}));

global.fetch = jest.fn();

describe('useLiveSports hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockApiResponse = {
    data: [
      {
        id: 1,
        homeTeam: { name: 'Team A' },
        awayTeam: { name: 'Team B' },
        score: { fullTime: { home: 2, away: 1 } },
        status: 'in_play',
        competition: { name: 'League', code: 'L1' },
        venue: 'Stadium',
        utcDate: '2025-09-02T12:00:00Z'
      }
    ],
    lastUpdated: '2025-09-02T12:00:00Z',
    count: 1
  };

  const mockFallbackData = {
    games: [{ id: 2, homeTeam: 'Fallback', awayTeam: 'Fallback', homeScore: 0, awayScore: 0 }],
    lastUpdated: '2025-09-02T12:01:00Z'
  };

  test('fetches data from MongoDB API successfully', async () => {
    apiClient.getMatchesByDate.mockResolvedValue(mockApiResponse);

    const { result, waitForNextUpdate } = renderHook(() => useLiveSports(1000));

    // Trigger initial fetch
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.sportsData.games[0].homeTeam.name).toBe('Team A');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBe(null);
  });

  test('uses fallback API if MongoDB API fails', async () => {
    apiClient.getMatchesByDate.mockRejectedValue(new Error('MongoDB API down'));
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockFallbackData
    });

    const { result } = renderHook(() => useLiveSports(1000));

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.sportsData.games[0].homeTeam).toBe('Fallback');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBe(null);
  });

  test('uses final fallback data if both APIs fail', async () => {
    apiClient.getMatchesByDate.mockRejectedValue(new Error('MongoDB API down'));
    fetch.mockRejectedValue(new Error('Fallback API down'));

    const { result } = renderHook(() => useLiveSports(1000));

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.sportsData.games[0].homeTeam).toBe('Loading...');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('sets error if unexpected exception occurs', async () => {
    apiClient.getMatchesByDate.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const { result } = renderHook(() => useLiveSports(1000));

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.error).toBe('Unexpected error');
    expect(result.current.isConnected).toBe(false);
  });

  test('refreshData calls fetchSportsData', async () => {
    apiClient.getMatchesByDate.mockResolvedValue(mockApiResponse);

    const { result } = renderHook(() => useLiveSports(1000));

    await act(async () => {
      result.current.refreshData();
      await Promise.resolve();
    });

    expect(result.current.sportsData.games[0].homeTeam.name).toBe('Team A');
  });

  test('startUpdates and stopUpdates manage interval correctly', async () => {
    apiClient.getMatchesByDate.mockResolvedValue(mockApiResponse);

    const { result } = renderHook(() => useLiveSports(1000));

    // Stop any existing interval
    act(() => {
      result.current.stopUpdates();
    });

    act(() => {
      result.current.startUpdates();
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.sportsData).toBeDefined();

    act(() => {
      result.current.stopUpdates();
    });

    // intervalRef should be cleared, so advancing timers does not trigger another fetch
    const previousData = result.current.sportsData;
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.sportsData).toBe(previousData);
  });
});
