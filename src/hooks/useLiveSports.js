import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../lib/api';

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
      console.log('Fetching sports data from MongoDB API...');
      
      try {
        // Fetch from our new MongoDB-based matches API
        const matchesResponse = await apiClient.getMatches();

        if (isActiveRef.current) {
          // Transform data to match the expected format
          const transformedGames = (matchesResponse.data || []).map(match => ({
            id: match.id || match._id,
            homeTeam: match.homeTeam?.name || match.homeTeam || 'Unknown',
            awayTeam: match.awayTeam?.name || match.awayTeam || 'Unknown',
            homeScore: match.score?.fullTime?.home || match.homeScore || 0,
            awayScore: match.score?.fullTime?.away || match.awayScore || 0,
            status: match.status || 'scheduled',
            competition: match.competition?.name || match.competition || 'Unknown',
            competitionCode: match.competition?.code || match.competitionCode,
            venue: match.venue || 'TBD',
            utcDate: match.utcDate || match.startTime,
            minute: match.minute,
            matchday: match.matchday
          }));

          const transformedData = {
            games: transformedGames,
            lastUpdated: matchesResponse.lastUpdated || new Date().toISOString(),
            source: 'MongoDB via REST API',
            totalMatches: matchesResponse.count || transformedGames.length,
          };

          setSportsData(transformedData);
          setLastUpdated(new Date());
          setIsConnected(true);
          console.log('MongoDB API data updated successfully');
        }
        
      } catch (apiError) {
        console.warn('MongoDB API request failed:', apiError.message);
        
        // Try fallback to sports-data API
        try {
          const response = await fetch('/api/sports-data');
          
          if (!response.ok) {
            throw new Error(`Sports data API request failed: ${response.status}`);
          }
          
          const fallbackData = await response.json();
          
          if (isActiveRef.current) {
            setSportsData(fallbackData);
            setLastUpdated(new Date());
            setIsConnected(true);
            console.log('Fallback sports-data API used successfully');
          }
        } catch (fallbackError) {
          console.warn('Fallback API also failed:', fallbackError.message);
          
          // Final fallback to ensure app doesn't break
          const finalFallbackData = {
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
            source: 'Fallback (APIs temporarily unavailable)',
            totalMatches: 1
          };
          
          if (isActiveRef.current) {
            setSportsData(finalFallbackData);
            setLastUpdated(new Date());
            setIsConnected(false);
            console.log('Using final fallback data - APIs temporarily unavailable');
          }
        }
      }
      
    } catch (err) {
      console.error('Failed to fetch sports data:', err);
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
