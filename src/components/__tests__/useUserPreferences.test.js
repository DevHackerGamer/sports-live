import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { apiClient } from '../../lib/api';

// Mock apiClient
jest.mock('../../lib/api', () => ({
  apiClient: {
    getUserFavorites: jest.fn(),
    updateUserFavorites: jest.fn(),
  },
}));

describe('useUserPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not fetch if no userId', () => {
    const { result } = renderHook(() => useUserPreferences(null));

    expect(result.current.prefs).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(apiClient.getUserFavorites).not.toHaveBeenCalled();
  });

  it('fetches preferences on mount when userId is provided', async () => {
    const mockPrefs = { favorites: ['teamA', 'teamB'] };
    apiClient.getUserFavorites.mockResolvedValueOnce({ data: mockPrefs });

    const { result } = renderHook(() => useUserPreferences('123'));

    // Initially loading is true
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.prefs).toEqual(mockPrefs);
      expect(result.current.error).toBeNull();
    });
  });

  it('handles API error on fetch', async () => {
    apiClient.getUserFavorites.mockRejectedValueOnce(new Error('API failed'));

    const { result } = renderHook(() => useUserPreferences('123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  it('polls for updates every 30 seconds', async () => {
    apiClient.getUserFavorites.mockResolvedValue({ data: { favorites: [] } });

    renderHook(() => useUserPreferences('123'));

    // First fetch
    expect(apiClient.getUserFavorites).toHaveBeenCalledTimes(1);

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);
    expect(apiClient.getUserFavorites).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(30000);
    expect(apiClient.getUserFavorites).toHaveBeenCalledTimes(3);
  });

  it('can savePreferences and update local state', async () => {
    const mockPrefs = { favorites: ['teamX'] };
    apiClient.getUserFavorites.mockResolvedValueOnce({ data: {} });
    apiClient.updateUserFavorites.mockResolvedValueOnce();

    const { result } = renderHook(() => useUserPreferences('123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.savePreferences(mockPrefs);
    });

    expect(apiClient.updateUserFavorites).toHaveBeenCalledWith('123', mockPrefs.favorites);
    expect(result.current.prefs).toMatchObject(mockPrefs);
  });

  it('can setPreferences and replace local state', async () => {
    const newPrefs = { favorites: ['teamY', 'teamZ'] };
    apiClient.getUserFavorites.mockResolvedValueOnce({ data: {} });
    apiClient.updateUserFavorites.mockResolvedValueOnce();

    const { result } = renderHook(() => useUserPreferences('123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setPreferences(newPrefs);
    });

    expect(apiClient.updateUserFavorites).toHaveBeenCalledWith('123', newPrefs.favorites);
    expect(result.current.prefs).toEqual(newPrefs);
  });

  it('throws if trying to savePreferences without userId', async () => {
    const { result } = renderHook(() => useUserPreferences(null));

    await expect(result.current.savePreferences({ favorites: [] }))
      .rejects.toThrow('Missing userId');
  });

  it('throws if trying to setPreferences without userId', async () => {
    const { result } = renderHook(() => useUserPreferences(null));

    await expect(result.current.setPreferences({ favorites: [] }))
      .rejects.toThrow('Missing userId');
  });
});