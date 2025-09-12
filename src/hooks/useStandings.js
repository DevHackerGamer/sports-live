import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

export function useLeagueStandings({ competition, season, type = 'TOTAL', stage = 'REGULAR_SEASON', limit = 20 }) {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!competition || !season) return;

    const fetchStandings = async () => {
      try {
        setLoading(true);
        const res = await apiClient.getStandings({ competition, season, type, stage, limit });
        setStandings(res.data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching standings:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchStandings();

    // Poll every 60 seconds for updates
    const interval = setInterval(fetchStandings, 60000);
    return () => clearInterval(interval);
  }, [competition, season, type, stage, limit]);

  return { standings, loading, error };
}
