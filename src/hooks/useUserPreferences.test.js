// __tests__/useUserPreferences.test.js
import { renderHook, act } from '@testing-library/react';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { apiClient } from '../lib/api';

jest.useFakeTimers();

jest.mock('../lib/api', () => ({
  apiClient: {
    getUserFavorites: jest.fn(),
    updateUserFavorites: jest.fn(),
  }
}));

describe('useUserPreferences hook', () => {
  const userId = 'user-123';
  const mockPrefs = { favorites: ['team1', 'team2'] };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initial state with no userId', () => {
    const { result } = renderHook(() => useUserPreferences(null));
    expect(result.current.prefs).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('fetches user preferences successfully', async () => {
    apiClient.getUserFavorites.mockResolvedValue({ data: mockPrefs });

    const { result, waitForNextUpdate } = renderHook(() => useUserPreferences(userId));

    // Initial loading state
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.prefs).toEqual(mockPrefs);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('handles fetch error', async () => {
    const error = new Error('API failure');
    apiClient.getUserFavorites.mockRejectedValue(error);

    const { result } = renderHook(() => useUserPreferences(userId));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe(error);
    expect(result.current.loading).toBe(false);
    expect(result.current.prefs).toBeNull();
  });

  test('polls every 30 seconds', async () => {
    apiClient.getUserFavorites.mockResolvedValue({ data: mockPrefs });

    renderHook(() => useUserPreferences(userId));

    expect(apiClient.getUserFavorites).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(30000); // advance 30 seconds
    });

    expect(apiClient.getUserFavorites).toHaveBeenCalledTimes(2);

    act(() => {
      jest.advanceTimersByTime(30000); // another 30 seconds
    });

    expect(apiClient.getUserFavorites).toHaveBeenCalledTimes(3);
  });

  test('savePreferences updates prefs successfully', async () => {
    apiClient.getUserFavorites.mockResolvedValue({ data: mockPrefs });
    apiClient.updateUserFavorites.mockResolvedValue({});

    const { result } = renderHook(() => useUserPreferences(userId));

    await act(async () => {
      await Promise.resolve();
    });

    const newPartial = { favorites: ['team3'] };

    await act(async () => {
      await result.current.savePreferences(newPartial);
    });

    expect(apiClient.updateUserFavorites).toHaveBeenCalledWith(userId, newPartial.favorites);
    expect(result.current.prefs.favorites).toContain('team3');
  });

  test('setPreferences updates prefs successfully', async () => {
    apiClient.getUserFavorites.mockResolvedValue({ data: mockPrefs });
    apiClient.updateUserFavorites.mockResolvedValue({});

    const { result } = renderHook(() => useUserPreferences(userId));

    await act(async () => {
      await Promise.resolve();
    });

    const newPrefs = { favorites: ['teamX'] };

    await act(async () => {
      await result.current.setPreferences(newPrefs);
    });

    expect(apiClient.updateUserFavorites).toHaveBeenCalledWith(userId, newPrefs.favorites);
    expect(result.current.prefs).toEqual(newPrefs);
  });

  test('savePreferences throws error if update fails', async () => {
    apiClient.getUserFavorites.mockResolvedValue({ data: mockPrefs });
    const updateError = new Error('Update failed');
    apiClient.updateUserFavorites.mockRejectedValue(updateError);

    const { result } = renderHook(() => useUserPreferences(userId));

    await act(async () => {
      await Promise.resolve();
    });

    await expect(act(async () => {
      await result.current.savePreferences({ favorites: ['fail'] });
    })).rejects.toThrow('Update failed');

    expect(result.current.error).toBe(updateError);
  });

  test('setPreferences throws error if update fails', async () => {
    apiClient.getUserFavorites.mockResolvedValue({ data: mockPrefs });
    const updateError = new Error('Update failed');
    apiClient.updateUserFavorites.mockRejectedValue(updateError);

    const { result } = renderHook(() => useUserPreferences(userId));

    await act(async () => {
      await Promise.resolve();
    });

    await expect(act(async () => {
      await result.current.setPreferences({ favorites: ['fail'] });
    })).rejects.toThrow('Update failed');

    expect(result.current.error).toBe(updateError);
  });

  test('savePreferences throws if userId missing', async () => {
    const { result } = renderHook(() => useUserPreferences(null));

    await expect(act(async () => {
      await result.current.savePreferences({ favorites: [] });
    })).rejects.toThrow('Missing userId');
  });

  test('setPreferences throws if userId missing', async () => {
    const { result } = renderHook(() => useUserPreferences(null));

    await expect(act(async () => {
      await result.current.setPreferences({ favorites: [] });
    })).rejects.toThrow('Missing userId');
  });
});
