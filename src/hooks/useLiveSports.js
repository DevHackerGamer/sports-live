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
      if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_LIVE_SPORTS) {
        console.log('[liveSports] fetching window');
      }
      
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

            const isAdmin = !!match.createdByAdmin;
            // If utcDate exists we trust backend canonical UTC; avoid recomputing from date/time to prevent shift.
            // Fallback: if missing utcDate but have date+time, build from local then toISOString
            let displayUtc = match.utcDate;
            if (!displayUtc && isAdmin && match.date && match.time) {
              displayUtc = new Date(`${match.date}T${match.time}`).toISOString();
            }
            const rawStatus = match.status || 'scheduled';
            let canonicalStatus = rawStatus.toUpperCase() === 'IN_PLAY' ? 'live' : rawStatus.toLowerCase();
            if (canonicalStatus === 'timed') canonicalStatus = 'scheduled';
            return {
              id: match.id || match._id,
              homeTeam: normalizeTeam(match.homeTeam),
              awayTeam: normalizeTeam(match.awayTeam),
              homeScore: (['IN_PLAY','live','in_play'].includes((match.status||'').toUpperCase())
                ? (match.score?.fullTime?.home ?? match.homeScore ?? 0)
                : (match.score?.fullTime?.home ?? match.homeScore ?? '-')),
              awayScore: (['IN_PLAY','live','in_play'].includes((match.status||'').toUpperCase())
                ? (match.score?.fullTime?.away ?? match.awayScore ?? 0)
                : (match.score?.fullTime?.away ?? match.awayScore ?? '-')),
              status: canonicalStatus,
              competition: match.competition?.name || match.competition || 'Unknown',
              competitionCode: match.competition?.code || match.competitionCode,
              venue: match.venue || 'TBD',
              utcDate: displayUtc || match.startTime,
              createdByAdmin: !!match.createdByAdmin,
              date: match.date,
              time: match.time,
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
            if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_LIVE_SPORTS) {
              console.log('[liveSports] data updated', transformedGames.length);
            }
          }
        }
        
      } catch (apiError) {
  if (process.env.NODE_ENV !== 'production') console.warn('[liveSports] primary fetch failed:', apiError.message);
        
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
            if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_LIVE_SPORTS) console.log('[liveSports] fallback api used');
          }
        } catch (fallbackError) {
          if (process.env.NODE_ENV !== 'production') console.warn('[liveSports] secondary fallback failed:', fallbackError.message);
          
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
            if (process.env.NODE_ENV !== 'production') console.log('[liveSports] final static fallback');
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
