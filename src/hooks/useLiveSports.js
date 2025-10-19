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
      
      // Clean up expired status overrides
      try {
        const overrides = JSON.parse(localStorage.getItem('match-status-overrides') || '{}');
        const now = Date.now();
        const cleaned = {};
        let hasExpired = false;
        for (const [matchId, override] of Object.entries(overrides)) {
          if (override.expires > now) {
            cleaned[matchId] = override;
          } else {
            hasExpired = true;
          }
        }
        if (hasExpired) {
          localStorage.setItem('match-status-overrides', JSON.stringify(cleaned));
        }
      } catch {}
      
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
            // Check for temporary status overrides (for immediate UI updates)
            let statusOverride = null;
            try {
              const overrides = JSON.parse(localStorage.getItem('match-status-overrides') || '{}');
              const matchId = match.id || match._id;
              if (overrides[matchId] && overrides[matchId].expires > Date.now()) {
                statusOverride = overrides[matchId].status;
                console.log('Applying status override for match', matchId, ':', statusOverride);
              }
            } catch {}

            const normalizeTeam = (t) => {
              if (!t) return { name: 'TBD', shortName: 'TBD' };
              if (typeof t === 'string') return { name: t, shortName: t };
              return {
                name: t.name || t.shortName || 'TBD',
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
            
            const rawStatus = statusOverride || match.status || 'scheduled';
            let canonicalStatus = rawStatus.toLowerCase();
            
            // Handle status mapping with priority for finished states
            if (rawStatus.toUpperCase() === 'FINISHED') {
              canonicalStatus = 'final';
            } else if (rawStatus.toUpperCase() === 'IN_PLAY') {
              canonicalStatus = 'live';
            } else if (canonicalStatus === 'timed') {
              canonicalStatus = 'scheduled';
            } else if (canonicalStatus === 'finished') {
              canonicalStatus = 'final';
            }
            
            // Double-check: if we have a match_end event, force final status
            if (match.events && Array.isArray(match.events)) {
              const hasMatchEnd = match.events.some(e => 
                (e.type === 'match_end' || e.type === 'matchend') ||
                (e.eventType === 'match_end' || e.eventType === 'matchend')
              );
              if (hasMatchEnd) {
                canonicalStatus = 'final';
                console.log('Found match_end event, forcing final status for match:', match.id);
              }
            }
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

    // Listen for cross-tab refresh signals (BroadcastChannel + storage fallback)
    let bc;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('sports-live');
        bc.onmessage = (ev) => {
          try {
            const data = ev?.data || ev;
            console.log('BroadcastChannel message received:', data);
            if (data && data.type === 'matches-updated') {
              // Force immediate refresh for status changes
              if (data.forceRefresh || data.newStatus) {
                console.log('Force refreshing due to status change:', data.newStatus);
              }
              refreshData();
            }
          } catch {}
        };
      }
    } catch {}
    const onStorage = (e) => {
      if (!e) return;
      if (e.key === 'sports:refresh' || e.key === 'sports:force-refresh') {
        console.log('Storage refresh triggered:', e.key);
        refreshData();
      }
    };
    try { window.addEventListener('storage', onStorage); } catch {}

    return () => {
      isActiveRef.current = false;
      stopUpdates();
      try { window.removeEventListener('storage', onStorage); } catch {}
      try { if (bc) bc.close(); } catch {}
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
