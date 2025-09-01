import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../lib/api';

export const useLiveSports = (updateInterval = 120000) => {
  const [sportsData, setSportsData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const intervalRef = useRef(null);
  const isActiveRef = useRef(true);

  const lastPayloadRef = useRef(null);
  const fetchSportsData = useCallback(async () => {
    try {
      setError(null);
      console.log('Fetching sports data from MongoDB API...');
      
      try {
  // Fetch a rolling 14-day window (today -> +13 days)
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 13, 23, 59, 59, 999));
  const toISODate = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  const matchesResponse = await apiClient.getMatchesByDate(toISODate(start), toISODate(end), 1000);

        if (isActiveRef.current) {
          // Transform data to match the expected format
          const transformedGames = (matchesResponse.data || []).map(match => {
            const normalizeTeam = (t) => {
              if (!t) return { name: 'Unknown' };
              if (typeof t === 'string') return { name: t };
              return {
                id: t.id,
                name: t.name || (typeof t === 'string' ? t : undefined) || 'Unknown',
                crest: t.crest,
                tla: t.tla,
                shortName: t.shortName
              };
            };

            return {
              id: match.id || match._id,
              homeTeam: normalizeTeam(match.homeTeam),
              awayTeam: normalizeTeam(match.awayTeam),
              homeScore: match.score?.fullTime?.home ?? match.homeScore ?? '-',
              awayScore: match.score?.fullTime?.away ?? match.awayScore ?? '-',
              status: match.status || 'scheduled',
              competition: match.competition?.name || match.competition || 'Unknown',
              competitionCode: match.competition?.code || match.competitionCode,
              venue: match.venue || 'TBD',
              utcDate: match.utcDate || match.startTime,
              minute: match.minute,
              matchday: match.matchday
            };
          });

          const transformedData = {
            games: transformedGames,
            lastUpdated: matchesResponse.lastUpdated || new Date().toISOString(),
            source: 'MongoDB via REST API',
            totalMatches: matchesResponse.count || transformedGames.length,
            range: {
              dateFrom: toISODate(start),
              dateTo: toISODate(end)
            }
          };

          const payloadKey = JSON.stringify({ ids: transformedGames.map(g => g.id), ts: matchesResponse.lastUpdated || '' });
          if (lastPayloadRef.current !== payloadKey) {
            setSportsData(transformedData);
            setLastUpdated(new Date());
            setIsConnected(true);
            lastPayloadRef.current = payloadKey;
            console.log('MongoDB API data updated successfully');
          }
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
