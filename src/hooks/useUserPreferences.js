import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

// Real-time user preferences stored via REST API
export function useUserPreferences(userId) {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setPrefs(null);
      setLoading(false);
      return;
    }

    const fetchPreferences = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getUserFavorites(userId);
        setPrefs(response.data || {});
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    fetchPreferences();

    // Set up polling for real-time updates (every 30 seconds)
    const interval = setInterval(fetchPreferences, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  const savePreferences = async (partial) => {
    if (!userId) throw new Error('Missing userId');
    try {
      // For now, we'll treat this as updating favorites
      if (partial.favorites) {
        await apiClient.updateUserFavorites(userId, partial.favorites);
        setPrefs(prev => ({ ...prev, ...partial }));
      }
    } catch (error) {
      setError(error);
      throw error;
    }
  };

  const setPreferences = async (value) => {
    if (!userId) throw new Error('Missing userId');
    try {
      if (value.favorites) {
        await apiClient.updateUserFavorites(userId, value.favorites);
        setPrefs(value);
      }
    } catch (error) {
      setError(error);
      throw error;
    }
  };

  return { prefs, loading, error, savePreferences, setPreferences };
}
