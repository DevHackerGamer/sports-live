import { useState, useEffect, useCallback, useRef } from 'react';

export const useLiveSports = (updateInterval = 60000) => {
  const [sportsData, setSportsData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const intervalRef = useRef(null);
  const isActiveRef = useRef(true);

  const fetchSportsData = useCallback(async () => {
    try {
      setError(null);
      console.log('Fetching sports data from API...');
      // Always call API; use a minimal fallback if it fails
      try {
        const response = await fetch('/api/sports-data');

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (isActiveRef.current) {
          setSportsData(data);
          setLastUpdated(new Date());
          setIsConnected(true);
          console.log('API data updated successfully');
        }
      } catch (apiError) {
        console.warn('API request failed:', apiError.message);

        // Final fallback to ensure app doesn't break
        const fallbackData = {
          games: [
            {
              id: 1,
              homeTeam: 'Loading...',
              awayTeam: 'Please wait',
              homeScore: 0,
              awayScore: 0,
              status: 'scheduled',
              sport: 'Football',
              competition: 'API Loading',
              venue: 'TBD',
            },
          ],
          lastUpdated: new Date().toISOString(),
          source: 'Fallback (API temporarily unavailable)',
          totalMatches: 1,
        };

        if (isActiveRef.current) {
          setSportsData(fallbackData);
          setLastUpdated(new Date());
          setIsConnected(false);
          console.log('Using fallback data - API temporarily unavailable');
        }
      }
    } catch (err) {
      console.error('Failed to fetch real sports data:', err);
      if (isActiveRef.current) {
        setError(err.message);
        setIsConnected(false);
      }
    }
  }, []);

  const startUpdates = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    fetchSportsData();
    intervalRef.current = setInterval(fetchSportsData, updateInterval);
  }, [fetchSportsData, updateInterval]);

  const stopUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const refreshData = useCallback(() => {
    fetchSportsData();
  }, [fetchSportsData]);

  useEffect(() => {
    isActiveRef.current = true;
    startUpdates();

    return () => {
      isActiveRef.current = false;
      stopUpdates();
    };
  }, [startUpdates, stopUpdates]);

  return {
    sportsData,
    isConnected,
    error,
    lastUpdated,
    refreshData,
    startUpdates,
    stopUpdates,
  };
};
