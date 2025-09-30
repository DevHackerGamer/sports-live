import { renderHook, waitFor } from '@testing-library/react';
import { useLeagueStandings } from '../../hooks/useStandings';
import { apiClient } from '../../lib/api';

// Mock apiClient
jest.mock('../../lib/api', () => ({
  apiClient: {
    getStandings: jest.fn(),
  },
}));

describe('useLeagueStandings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches and sets standings data', async () => {
    const mockData = [{ team: 'Team A', points: 42 }];
    apiClient.getStandings.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() =>
      useLeagueStandings({ competition: 'PL', season: 2024 })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.standings).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });
  });

  it('handles API error', async () => {
    apiClient.getStandings.mockRejectedValueOnce(new Error('API failed'));

    const { result } = renderHook(() =>
      useLeagueStandings({ competition: 'PL', season: 2024 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  it('does not fetch when competition or season missing', () => {
    renderHook(() => useLeagueStandings({ competition: null, season: null }));

    expect(apiClient.getStandings).not.toHaveBeenCalled();
  });

  it('polls data every 60 seconds', async () => {
    const mockData = [{ team: 'Team B', points: 55 }];
    apiClient.getStandings.mockResolvedValue({ data: mockData });

    renderHook(() =>
      useLeagueStandings({ competition: 'PL', season: 2024 })
    );

    jest.advanceTimersByTime(60000);

    expect(apiClient.getStandings).toHaveBeenCalledTimes(2); // initial + poll
  });
});
