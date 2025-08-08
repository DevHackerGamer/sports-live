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
      console.log('Fetching real sports data...');
      
      // Try to use a CORS proxy in development, or fall back to production endpoint
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        // First check if running with Vercel dev server
        try {
          const response = await fetch('/api/sports-data');
          if (response.ok) {
            const data = await response.json();
            if (isActiveRef.current) {
              setSportsData(data);
              setLastUpdated(new Date());
              setIsConnected(true);
              console.log('Development API data updated successfully');
            }
            return;
          }
        } catch (devError) {
          console.log('Development Mode: Vercel dev server not detected');
          console.log('To use real API data in development, run: npx vercel dev');
          console.log('Using demo data for development...');
        }
        
        // If Vercel dev is not running, use demo data for development
        const developmentData = {
          games: [
            {
              id: 'dev-1',
              homeTeam: 'Manchester United',
              awayTeam: 'Liverpool',
              homeScore: 2,
              awayScore: 1,
              status: 'live',
              competition: 'Premier League',
              venue: 'Old Trafford',
              minute: 78,
              utcDate: new Date().toISOString()
            },
            {
              id: 'dev-2',
              homeTeam: 'Arsenal',
              awayTeam: 'Chelsea',
              homeScore: 1,
              awayScore: 1,
              status: 'final',
              competition: 'Premier League',
              venue: 'Emirates Stadium',
              utcDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'dev-3',
              homeTeam: 'Barcelona',
              awayTeam: 'Real Madrid',
              homeScore: 0,
              awayScore: 0,
              status: 'scheduled',
              competition: 'La Liga',
              venue: 'Camp Nou',
              utcDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          source: 'Development demo data',
          totalMatches: 3,
          timestamp: new Date().toISOString()
        };
        
        if (isActiveRef.current) {
          setSportsData(developmentData);
          setLastUpdated(new Date());
          setIsConnected(false);
          console.log('Development demo data loaded');
        }
        return;
      }
      
      // Try production endpoint or use sample data if everything fails
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
          console.log('Production API data updated successfully');
        }
        
      } catch (apiError) {
        console.warn('Production API failed:', apiError.message);
        
        // Final fallback to ensure app doesn't break
        const fallbackData = {
          games: [
            {
              id: 1,
              homeTeam: "Loading...",
              awayTeam: "Please wait",
              homeScore: 0,
              awayScore: 0,
              status: "scheduled",
              sport: "Football",
              competition: "API Loading",
              venue: "TBD"
            }
          ],
          lastUpdated: new Date().toISOString(),
          source: 'Fallback (API temporarily unavailable)',
          totalMatches: 1
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
    stopUpdates
  };
};
