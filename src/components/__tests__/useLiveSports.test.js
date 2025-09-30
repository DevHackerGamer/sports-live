import { renderHook, act } from '@testing-library/react';
import { useLiveSports } from '../../hooks/useLiveSports';


import { apiClient } from '../../lib/api';

// Mock apiClient
jest.mock('../../lib/api', () => ({
  apiClient: {
    getMatchesByDate: jest.fn(),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('useLiveSports hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches sports data successfully', async () => {
    const mockMatches = {
      data: [
        {
          id: '1',
          homeTeam: { name: 'Team A' },
          awayTeam: { name: 'Team B' },
          score: { fullTime: { home: 2, away: 1 } },
          status: 'IN_PLAY',
          competition: { name: 'Premier League', code: 'PL' },
          utcDate: new Date().toISOString(),
        },
      ],
      count: 1,
      lastUpdated: '2024-09-29T12:00:00Z',
    };

    apiClient.getMatchesByDate.mockResolvedValueOnce(mockMatches);

    const { result } = renderHook(() => useLiveSports(5000));

    // Let hook effect run
    await act(async () => {
      jest.runOnlyPendingTimers(); // Trigger interval execution
      await Promise.resolve();
    });

    expect(apiClient.getMatchesByDate).toHaveBeenCalled();
    expect(result.current.sportsData).not.toBeNull();
    expect(result.current.isConnected).toBe(true);
    expect(result.current.sportsData.games[0].homeTeam.name).toBe('Team A');
  });

  it('falls back to /api/sports-data if primary API fails', async () => {
    apiClient.getMatchesByDate.mockRejectedValueOnce(new Error('API down'));

    const fallbackResponse = {
      games: [{ id: 99, homeTeam: 'Fallback FC', awayTeam: 'Reserves' }],
      totalMatches: 1,
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fallbackResponse,
    });

    const { result } = renderHook(() => useLiveSports(5000));

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith('/api/sports-data');
    expect(result.current.sportsData.games[0].homeTeam).toBe('Fallback FC');
    expect(result.current.isConnected).toBe(true);
  });

  it('uses static fallback if all APIs fail', async () => {
    apiClient.getMatchesByDate.mockRejectedValueOnce(new Error('API down'));
    fetch.mockRejectedValueOnce(new Error('fetch failed'));

    const { result } = renderHook(() => useLiveSports(5000));

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(result.current.sportsData).not.toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.sportsData.source).toMatch(/Fallback/);
  });

  it('can refresh data manually', async () => {
    const mockMatches = { data: [], count: 0, lastUpdated: '2024-09-29T12:00:00Z' };
    apiClient.getMatchesByDate.mockResolvedValue(mockMatches);

    const { result } = renderHook(() => useLiveSports(5000));

    await act(async () => {
      await result.current.refreshData();
    });

    expect(apiClient.getMatchesByDate).toHaveBeenCalled();
  });
});