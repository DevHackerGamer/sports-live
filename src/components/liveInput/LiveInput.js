import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { isAdminFromUser } from '../../lib/roles';
import '../../styles/LiveInput.css';
import { apiClient } from '../../lib/api'
import LineupsTab from '../matchViewer/LineupsTab'; 
import LineupsAdminModal from './LineupsAdminModal';

import LiveCommentaryFeed from '../matchViewer/LiveCommentaryFeed';
import CommentaryAdminModal from './CommentaryAdminModal'


// Admin-only screen for entering live match data for a specific selected match.
// Visibility Rules:
//  - Only rendered if user is admin AND a match is selected (Dashboard enforces)
//  - If mounted without a match (edge case) shows placeholder
// Functionality:
//  - Local timer with pause/reset to derive event minutes
//  - Editable score + possession (not yet persisted; could be POSTed via matches API)
//  - Event form creates optimistic event, then persists via /api/matches/:id/events
//  - Half Time / Full Time quick buttons insert timeline markers & pause timer
//  - Match statistics tracking (possession, shots, fouls, etc.)
// Props: isAdmin (bool), match (object), onBackToMatch (func)
const LiveInput = ({ isAdmin: isAdminProp, match, onBackToMatch }) => {
  const { user } = useUser();

  // All hooks must be declared unconditionally and in the same order on every render.
  const [isPaused, setIsPaused] = useState(() => {
    try {
      if (match?.createdByAdmin && match.clock) {
        return !match.clock.running;
      }
      const st = (match?.status || '').toUpperCase();
      // Always pause if match is finished
      if (st === 'FINISHED') return true;
      return st !== 'IN_PLAY';
    } catch {
      return true;
    }
  });
  const [matchTime, setMatchTime] = useState(() => {
    try {
      if (match?.createdByAdmin && match.clock) {
        const base = Math.max(0, Math.floor(match.clock.elapsed || 0));
        const extra = (match.clock.running && match.clock.startedAt) ? Math.max(0, Math.floor((Date.now() - Date.parse(match.clock.startedAt)) / 1000)) : 0;
        return base + extra;
      }
      if (typeof match?.minute === 'number' && match.minute >= 0) return match.minute * 60;
      return 0;
    } catch {
      return 0;
    }
  }); // time in seconds
  const [score, setScore] = useState({ home: 0, away: 0 }); // derived from events
  const [possession, setPossession] = useState(50);
  const [events, setEvents] = useState([]); // local timeline (could be hydrated from match.events later)
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [teamLogos, setTeamLogos] = useState({ home: '', away: '' });
  const [showLineupsModal, setShowLineupsModal] = useState(false);
  const [showCommentaryModal, setShowCommentaryModal] = useState(false);

  
  // Match statistics state
  const [matchStats, setMatchStats] = useState({
    possession: { home: 50, away: 50 },
    shotsOnTarget: { home: 0, away: 0 },
    shotsOffTarget: { home: 0, away: 0 },
    totalShots: { home: 0, away: 0 },
    corners: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
    yellowCards: { home: 0, away: 0 },
    redCards: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 },
    saves: { home: 0, away: 0 },
    passAccuracy: { home: 0, away: 0 }
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [localMatchStatus, setLocalMatchStatus] = useState(null); // Track local status changes
  // Inline edit state for event minute field
  const [isEditingMinute, setIsEditingMinute] = useState(false);
  // newEvent.type uses canonical event type names used across app & MatchViewer
  const [newEvent, setNewEvent] = useState({
    type: 'goal', // canonical types: goal, yellow_card, red_card, second_yellow, substitution, injury, penalty, own_goal, foul, corner_kick, free_kick, offside, save, other
    team: 'home',
    // For most events we use single player; substitutions use playerOut/playerIn
    player: '',
    playerOut: '',
    playerIn: '',
    minute: '0',
    description: ''
  });
  const timerRef = useRef(null);
  const lastPersistRef = useRef(0);
  const prevMinuteRef = useRef(0);
  const halfTimeTriggeredRef = useRef(false);
  const fullTimeTriggeredRef = useRef(false);
  const [period, setPeriod] = useState('1H'); // '1H' or '2H'
  const [inOvertime, setInOvertime] = useState(false);
  // Derive admin after hooks are declared to avoid conditional hooks.
  const isAdmin = typeof isAdminProp === 'boolean' ? isAdminProp : isAdminFromUser(user);

  // Get effective match status (local override takes precedence)
  const getEffectiveMatchStatus = () => {
    // If we've locally set the status to FINISHED, that takes highest precedence
    if (localMatchStatus === 'FINISHED') return 'FINISHED';
    // If full time was triggered, consider it finished regardless of match.status
    if (fullTimeTriggeredRef.current) return 'FINISHED';
    // Otherwise use the prop status
    return (match?.status || '').toUpperCase();
  };

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Map various legacy / shorthand / backend event type strings to canonical frontend types
  const canonicalEventType = (raw) => {
    if (!raw) return 'other';
    const t = String(raw).toLowerCase();
    const map = {
      goal: 'goal',
      penalty: 'penalty',
      penaltygoal: 'penalty',
      'penalty goal': 'penalty',
      owngoal: 'own_goal',
      own_goal: 'own_goal',
      yellow: 'yellow_card',
      yellowcard: 'yellow_card',
      red: 'red_card',
      redcard: 'red_card',
      yellowred: 'second_yellow',
      secondyellow: 'second_yellow',
      substitution: 'substitution',
      sub: 'substitution',
      injury: 'injury',
      foul: 'foul',
      corner: 'corner_kick',
      cornerkick: 'corner_kick',
      freekick: 'free_kick',
      free_kick: 'free_kick',
      offside: 'offside',
      save: 'save',
      halftime: 'half_time',
      half_time: 'half_time',
      match_end: 'match_end',
      matchend: 'match_end',
      match_start: 'match_start',
      kickoff: 'match_start'
    };
    return map[t] || t || 'other';
  };

  const eventLabel = useCallback((type) => {
    switch (canonicalEventType(type)) {
      case 'goal': return 'Goal';
      case 'penalty': return 'Penalty Goal';
      case 'own_goal': return 'Own Goal';
      case 'yellow_card': return 'Yellow Card';
      case 'red_card': return 'Red Card';
      case 'second_yellow': return 'Second Yellow';
      case 'substitution': return 'Substitution';
      case 'injury': return 'Injury';
      case 'foul': return 'Foul';
      case 'corner_kick': return 'Corner Kick';
      case 'free_kick': return 'Free Kick';
      case 'offside': return 'Offside';
      case 'save': return 'Save';
      case 'half_time': return 'Half Time';
      case 'match_end': return 'Full Time';
      case 'match_start': return 'Kick Off';
      default: return 'Event';
    }
  }, []);

  // Update the minute field when matchTime changes (unless user is actively editing)
  useEffect(() => {
    const minutes = Math.floor(matchTime / 60);
    setNewEvent(prev => (isEditingMinute ? prev : { ...prev, minute: minutes.toString() }));
  }, [matchTime, isEditingMinute]);

  // Start/stop the timer since its a live match input
  useEffect(() => {
    // Don't run timer if match is FINISHED
    const matchStatus = getEffectiveMatchStatus();
    if (matchStatus === 'FINISHED' || fullTimeTriggeredRef.current) {
      clearInterval(timerRef.current);
      setIsPaused(true); // Ensure paused state when finished
      return;
    }
    
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setMatchTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPaused, match?.status, fullTimeTriggeredRef.current, localMatchStatus]);

  // Normalize events coming from backend – needs to be declared before any effects that use it
  const normalizeServerEvents = useCallback((raw = []) => {
    const homeName = match?.homeTeam?.name || match?.homeTeam || '';
    const awayName = match?.awayTeam?.name || match?.awayTeam || '';
    return raw.map(ev => {
      const out = { ...ev };
      out.type = canonicalEventType(out.type || out.eventType || out.kind);
      // Robust minute normalization
      let minute = out.minute;
      if (minute != null && minute !== '') {
        if (typeof minute === 'string') {
          const parsed = parseInt(minute, 10);
          minute = Number.isNaN(parsed) ? undefined : parsed;
        } else if (typeof minute !== 'number') {
          minute = undefined;
        }
      }
      if ((minute == null || minute === '') && out.time) {
        const m = parseInt(String(out.time).split(':')[0], 10);
        minute = Number.isNaN(m) ? undefined : m;
      }
      out.minute = (minute != null) ? minute : 0; // keep 0 fallback for legacy expectations
      // Infer side
      const teamStr = (out.team || out.teamName || out.teamSide || '').toString();
      let side = out.teamSide || '';
      if (!side) {
        const lc = teamStr.toLowerCase();
        if (lc && homeName && lc === homeName.toLowerCase()) side = 'home';
        else if (lc && awayName && lc === awayName.toLowerCase()) side = 'away';
        else if (/^home$/.test(lc)) side = 'home';
        else if (/^away$/.test(lc)) side = 'away';
      }
      out.teamSide = side;
      // For client-side logic (score calc, display), prefer canonical home/away in `team`
      if (side === 'home' || side === 'away') {
        out.team = side;
      }
      // Substitution formatting – if server stored playerOut/In separately leave player field for viewer
      if (out.type === 'substitution' && !out.player && (out.playerOut || out.playerIn)) {
        out.player = `${out.playerOut || ''}${out.playerOut && out.playerIn ? ' → ' : ''}${out.playerIn || ''}`;
      }
      if (!out.description) {
        const label = eventLabel(out.type);
        const teamLabel = side === 'home' ? homeName : side === 'away' ? awayName : (out.team || '');
        out.description = [label, teamLabel, (out.player||'')].filter(Boolean).join(' - ');
      }
      // Ensure id
      out.id = out.id || `${out.type}-${out.minute}-${Math.random().toString(36).slice(2)}`;
      return out;
    });
  }, [match, eventLabel]);

  // Persist match minute/status periodically
  useEffect(() => {
    if (!match || !(match.id || match._id)) return;
    
    // If match is already FINISHED, don't process any automatic transitions
    const matchStatus = getEffectiveMatchStatus();
    if (matchStatus === 'FINISHED' || fullTimeTriggeredRef.current) return;
    
    const minute = Math.floor(matchTime / 60);

    // Initialize period based on current minute on first run
    if (minute >= 46 && period === '1H') setPeriod('2H');

    // Update overtime indicator without auto-triggering events
    if (period === '1H') {
      setInOvertime(minute >= 45 && minute < 60);
    } else {
      setInOvertime(minute >= 90 && minute < 105);
    }

    // Minute ticks are derived server-side from persisted clock; no continuous PUTs needed
  }, [match, matchTime, isPaused, isAdmin, period, normalizeServerEvents, events]);

  // Normalize events coming from backend
  // (definition moved earlier to avoid reference-before-init in effects)

  const fetchServerEvents = useCallback(async (forceFresh = false) => {
    if (!match || !(match.id || match._id)) return;
    try {
      // For admin-created matches, fetch fresh from server if forceFresh is true
      // Otherwise use embedded events (never call API for routine polling)
      // Admin match IDs typically start with 'a_' or have createdByAdmin flag
      const isAdminMatch = match.createdByAdmin || String(match.id || match._id).startsWith('a_');
      
      if (isAdminMatch && !forceFresh) {
        // Admin matches always have events embedded in the match document
        const eventList = match.events || [];
        const normalized = normalizeServerEvents(eventList);
        setEvents(normalized);
        
        // Check for existing half-time/full-time events to prevent duplicates
        const hasHT = normalized.some(e => canonicalEventType(e.type) === 'half_time');
        const hasFT = normalized.some(e => canonicalEventType(e.type) === 'match_end');
        if (hasHT && !halfTimeTriggeredRef.current) {
          halfTimeTriggeredRef.current = true;
          setPeriod('2H');
        }
        if (hasFT && !fullTimeTriggeredRef.current) {
          fullTimeTriggeredRef.current = true;
        }
        return;
      }
      
      if (isAdminMatch && forceFresh) {
        // Force a fresh fetch from the server for admin matches after mutations
        try {
          const freshMatch = await apiClient.getMatch(match.id || match._id);
          const eventList = freshMatch?.data?.events || freshMatch?.events || [];
          const normalized = normalizeServerEvents(eventList);
          setEvents(normalized);
          
          // Check for existing half-time/full-time events
          const hasHT = normalized.some(e => canonicalEventType(e.type) === 'half_time');
          const hasFT = normalized.some(e => canonicalEventType(e.type) === 'match_end');
          if (hasHT && !halfTimeTriggeredRef.current) {
            halfTimeTriggeredRef.current = true;
            setPeriod('2H');
          }
          if (hasFT && !fullTimeTriggeredRef.current) {
            fullTimeTriggeredRef.current = true;
          }
          return;
        } catch (err) {
          console.warn('Failed to fetch fresh admin match events, falling back to prop', err);
          // Fall back to prop events if fetch fails
          const eventList = match.events || [];
          const normalized = normalizeServerEvents(eventList);
          setEvents(normalized);
          return;
        }
      }
      
      // For ESPN/external matches, try to use embedded events first
      if (match.events && Array.isArray(match.events)) {
        const normalized = normalizeServerEvents(match.events);
        setEvents(normalized);
        
        // Check for existing half-time/full-time events
        const hasHT = normalized.some(e => canonicalEventType(e.type) === 'half_time');
        const hasFT = normalized.some(e => canonicalEventType(e.type) === 'match_end');
        if (hasHT && !halfTimeTriggeredRef.current) {
          halfTimeTriggeredRef.current = true;
          setPeriod('2H');
        }
        if (hasFT && !fullTimeTriggeredRef.current) {
          fullTimeTriggeredRef.current = true;
        }
        return;
      }
      
      // Only try to fetch from API for non-admin matches without embedded events
      try {
        const res = await apiClient.getMatchEvents(match.id || match._id);
        const list = Array.isArray(res.data) ? res.data : res;
        const normalized = normalizeServerEvents(list);
        setEvents(normalized);
        
        // Check for existing half-time/full-time events
        const hasHT = normalized.some(e => canonicalEventType(e.type) === 'half_time');
        const hasFT = normalized.some(e => canonicalEventType(e.type) === 'match_end');
        if (hasHT && !halfTimeTriggeredRef.current) {
          halfTimeTriggeredRef.current = true;
          setPeriod('2H');
        }
        if (hasFT && !fullTimeTriggeredRef.current) {
          fullTimeTriggeredRef.current = true;
        }
      } catch (apiError) {
        // Fall back to match.events if available (even if empty)
        const eventList = match.events || [];
        const normalized = normalizeServerEvents(eventList);
        setEvents(normalized);
        
        // Check for existing half-time/full-time events
        const hasHT = normalized.some(e => canonicalEventType(e.type) === 'half_time');
        const hasFT = normalized.some(e => canonicalEventType(e.type) === 'match_end');
        if (hasHT && !halfTimeTriggeredRef.current) {
          halfTimeTriggeredRef.current = true;
          setPeriod('2H');
        }
        if (hasFT && !fullTimeTriggeredRef.current) {
          fullTimeTriggeredRef.current = true;
        }
      }
    } catch (e) {
      // Silent fail – keep local optimistic list or use empty array
      const eventList = match.events || [];
      const normalized = normalizeServerEvents(eventList);
      setEvents(normalized);
      
      // Check for existing half-time/full-time events
      const hasHT = normalized.some(e => canonicalEventType(e.type) === 'half_time');
      const hasFT = normalized.some(e => canonicalEventType(e.type) === 'match_end');
      if (hasHT && !halfTimeTriggeredRef.current) {
        halfTimeTriggeredRef.current = true;
        setPeriod('2H');
      }
      if (hasFT && !fullTimeTriggeredRef.current) {
        fullTimeTriggeredRef.current = true;
      }
    }
  }, [match, normalizeServerEvents]);

  const handleEventAdd = async () => {
    // Don't allow adding events if match is finished
    if (getEffectiveMatchStatus() === 'FINISHED') return;
    
    // Validation differs for substitution vs normal events
    if (newEvent.type === 'substitution') {
      if (!newEvent.playerOut || !newEvent.playerIn) return; // require both players
    } else if (!newEvent.player) {
      return;
    }
    const canonicalType = canonicalEventType(newEvent.type);
    // Build description early to avoid generic fallback later; if empty we'll synthesize
    const autoDescription = newEvent.description || (() => {
      const label = eventLabel(canonicalType);
      const teamName = newEvent.team === 'home' ? (match?.homeTeam?.name || match?.homeTeam) : (match?.awayTeam?.name || match?.awayTeam);
      if (canonicalType === 'substitution' && newEvent.playerOut && newEvent.playerIn) {
        return `${label} - ${teamName} - ${newEvent.playerOut} → ${newEvent.playerIn}`;
      }
      if (newEvent.player) return `${label} - ${teamName} - ${newEvent.player}`;
      return `${label}${teamName ? ' - ' + teamName : ''}`;
    })();
    const chosenMinute = (() => {
      const m = parseInt(newEvent.minute, 10);
      if (Number.isNaN(m) || m < 0) return Math.floor(matchTime / 60);
      return m;
    })();
    const baseEvent = {
      id: Date.now(),
      type: canonicalType,
      team: newEvent.team,
      player: newEvent.type === 'substitution' ? `${newEvent.playerOut} → ${newEvent.playerIn}` : newEvent.player,
      playerOut: newEvent.playerOut || undefined,
      playerIn: newEvent.playerIn || undefined,
      minute: chosenMinute,
      time: `${chosenMinute}:${(matchTime % 60).toString().padStart(2,'0')}`,
      description: autoDescription,
      timestamp: new Date().toISOString()
    };

    try {
      if (match?.id || match?._id) {
        const resp = await apiClient.addMatchEvent(
          match.id || match._id,
          {
            type: baseEvent.type,
            team: baseEvent.team === 'home' ? (match.homeTeam?.name || match.homeTeam) : (match.awayTeam?.name || match.awayTeam),
            teamSide: baseEvent.team,
            player: baseEvent.player,
            playerOut: baseEvent.playerOut,
            playerIn: baseEvent.playerIn,
            minute: baseEvent.minute,
            time: baseEvent.time,
            description: baseEvent.description,
            matchId: match.id || match._id
          },
          { userType: isAdmin ? 'admin' : '' }
        );
  const persisted = resp?.data || baseEvent;
  // Append immediately so user can delete it; ensure id is present
  setEvents(prev => [...prev, normalizeServerEvents([persisted])[0]]);
        // Sync with server after a short delay to ensure consistency
        setTimeout(() => { 
          fetchServerEvents(true); 
        }, 500);
      } else {
        // No match id yet – keep it locally only
        setEvents(prev => [...prev, baseEvent]);
      }
    } catch (e) {
      console.error('Failed to persist event', e);
      if (e && /400/.test(e.message || '')) {
        // eslint-disable-next-line no-alert
        alert('Event rejected: provide at least a type, player or description.');
      } else if (e && /403/.test(e.message || '')) {
        alert('Server rejected event: admin permission not recognized.');
      } else {
        alert('Event save failed – storing locally only.');
        setEvents(prev => [...prev, baseEvent]);
      }
    }

    setNewEvent(prev => ({ ...prev, type: prev.type, player: '', playerOut: '', playerIn: '', description: '' }));
    setIsEditingMinute(false);
  };

  const removeEvent = async (id) => {
    // Check if it's a half-time or full-time event and reset refs BEFORE removing
    const eventToDelete = events.find(e => e.id === id);
    if (eventToDelete) {
      const type = canonicalEventType(eventToDelete.type);
      if (type === 'half_time') {
        halfTimeTriggeredRef.current = false;
        setPeriod('1H');
      } else if (type === 'match_end') {
        fullTimeTriggeredRef.current = false;
        setLocalMatchStatus(null);
      }
    }
    
    // Optimistically remove from UI immediately
    setEvents(prev => prev.filter(event => event.id !== id));
    
    // Attempt backend deletion (best-effort)
    if (match && (match.id || match._id) && isAdmin) {
      try {
        await apiClient.deleteMatchEvent(match.id || match._id, id, { userType: 'admin' });
        console.log(`Successfully deleted event ${id} from server`);
        // Sync with server after deletion to ensure consistency
        setTimeout(() => { 
          fetchServerEvents(true); 
        }, 500);
      } catch (e) {
        console.error('Failed to delete event on server', e);
        // If server deletion fails, restore the event in UI
        if (eventToDelete) {
          setEvents(prev => [...prev, eventToDelete].sort((a,b) => {
            const ma = a.minute ?? 0;
            const mb = b.minute ?? 0;
            return ma - mb;
          }));
        }
      }
    }
  };

  // Match statistics functions
  const loadMatchStatistics = useCallback(async () => {
    if (!match || !(match.id || match._id)) return;
    
    setStatsLoading(true);
    try {
      const stats = await apiClient.getMatchStatistics(match.id || match._id);
      setMatchStats(stats);
      // Sync possession with the separate possession state
      setPossession(stats.possession?.home || 50);
    } catch (error) {
      console.error('Failed to load match statistics:', error);
      // Keep default statistics if loading fails
    } finally {
      setStatsLoading(false);
    }
  }, [match]);

  const saveMatchStatistics = useCallback(async (updatedStats) => {
    if (!match || !(match.id || match._id) || !isAdmin) return;
    
    try {
      const stats = await apiClient.updateMatchStatistics(match.id || match._id, updatedStats);
      setMatchStats(stats);
      return stats;
    } catch (error) {
      console.error('Failed to save match statistics:', error);
      throw error;
    }
  }, [match, isAdmin]);

  const updateStatistic = useCallback((statName, team, value) => {
    setMatchStats(prevStats => {
      const newStats = { ...prevStats };
      
      if (typeof newStats[statName] === 'object') {
        newStats[statName] = { ...newStats[statName], [team]: Math.max(0, Number(value)) };
      } else {
        newStats[statName] = Math.max(0, Number(value));
      }
      
      // Special handling for possession to keep both states in sync
      if (statName === 'possession') {
        const homePos = newStats.possession.home;
        const awayPos = 100 - homePos;
        newStats.possession = { home: homePos, away: awayPos };
        setPossession(homePos);
      }
      
      // Save to API asynchronously
      if (match && (match.id || match._id) && isAdmin) {
        saveMatchStatistics(newStats).catch(error => {
          console.error('Failed to save statistic update:', error);
        });
      }
      
      return newStats;
    });
  }, [match, isAdmin, saveMatchStatistics]);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const resetTimer = () => {
    setIsPaused(true);
    setMatchTime(0);
  };

  const homeName = match?.homeTeam?.name || match?.homeTeam || 'Home';
  const awayName = match?.awayTeam?.name || match?.awayTeam || 'Away';

  // Derive score from events whenever they change
  useEffect(() => {
    const calc = () => {
      let home = 0, away = 0;
      for (const ev of events) {
        const t = canonicalEventType(ev.type);
        if (t === 'goal' || t === 'penalty') {
          if (ev.team === 'home') home += 1; else if (ev.team === 'away') away += 1;
        } else if (t === 'own_goal') {
          if (ev.team === 'home') away += 1; else if (ev.team === 'away') home += 1;
        }
      }
      setScore({ home, away });
    };
    calc();
  }, [events]);

  // Hydrate initial score / events / timer when match changes (even if match is null to keep hook order stable)
  useEffect(() => {
    if (!match) {
      setScore({ home: 0, away: 0 });
      setEvents([]);
      setMatchTime(0); // reset timer when no match
  setHomePlayers([]);
  setAwayPlayers([]);
      setTeamLogos({ home: '', away: '' });
      setPeriod('1H');
      setInOvertime(false);
      halfTimeTriggeredRef.current = false;
      fullTimeTriggeredRef.current = false;
      setLocalMatchStatus(null); // Reset local status
      return;
    }
  
  // Initialize local status if match is already finished
  if ((match.status || '').toUpperCase() === 'FINISHED') {
    setLocalMatchStatus('FINISHED');
  } else {
    setLocalMatchStatus(null);
  }
  // Initialize score as 0; it will be derived from events below
  setScore({ home: 0, away: 0 });
  if (Array.isArray(match?.events) && match.events.length) {
      const homeLabel = (match.homeTeam?.name || match.homeTeam || '').toLowerCase();
      const awayLabel = (match.awayTeam?.name || match.awayTeam || '').toLowerCase();
      setEvents(match.events.map(ev => {
        // Normalize event structure coming from backend
        const rawTeamName = (ev.team || ev.teamName || ev.teamSide || '').toString();
        const side = (() => {
          const lc = rawTeamName.toLowerCase();
            if (lc && homeLabel && lc === homeLabel) return 'home';
            if (lc && awayLabel && lc === awayLabel) return 'away';
            // Some APIs might provide 'HOME_TEAM' or 'AWAY_TEAM'
            if (/home/i.test(rawTeamName) && !/away/i.test(rawTeamName)) return 'home';
            if (/away/i.test(rawTeamName) && !/home/i.test(rawTeamName)) return 'away';
            return ev.teamSide === 'home' || ev.teamSide === 'away' ? ev.teamSide : '';
        })();
        const minute = (ev.minute != null && ev.minute !== '')
          ? (typeof ev.minute === 'string' ? (parseInt(ev.minute,10) || 0) : ev.minute)
          : (ev.time ? (parseInt(String(ev.time).split(':')[0],10) || 0) : 0);
        return {
          id: ev.id || `${ev.type || ev.eventType}-${ev.time || ev.minute}-${Math.random().toString(36).slice(2)}`,
      type: canonicalEventType(ev.type || ev.eventType || ev.kind),
          team: side,
      player: ev.player || ev.playerName || ev.inPlayer || '',
          minute,
          description: ev.description || ev.detail || ev.note || ''
        };
      }));
    } else {
      setEvents([]);
    }
    // Prefer persisted clock for admin-created matches; fallback to minute
    const computeClockSeconds = (clock) => {
      if (!clock) return null;
      const base = Math.max(0, Math.floor(clock.elapsed || 0));
      if (clock.running && clock.startedAt) {
        const delta = Math.max(0, Math.floor((Date.now() - Date.parse(clock.startedAt)) / 1000));
        return base + delta;
      }
      return base;
    };
    if (match.createdByAdmin && match.clock) {
      const secs = computeClockSeconds(match.clock);
      if (secs != null) {
        setMatchTime(secs);
        setIsPaused(!match.clock.running);
        const min = Math.floor(secs / 60);
        setPeriod(min >= 46 ? '2H' : '1H');
      }
    } else if (typeof match.minute === 'number' && match.minute >= 0) {
      setMatchTime(match.minute * 60);
      setPeriod(match.minute >= 46 ? '2H' : '1H');
      setIsPaused((match.status || '').toUpperCase() !== 'IN_PLAY');
    } else {
      // Derive from status/utcDate
      if ((match.status || '').toUpperCase() === 'IN_PLAY') setIsPaused(false); // auto-run if already live
      setPeriod('1H');
    }

    // Fetch roster players for each team (best-effort) with fallback strategies and capture team crests.
    (async () => {
      try {
        const homeNameRaw = match.homeTeam?.name || match.homeTeam;
        const awayNameRaw = match.awayTeam?.name || match.awayTeam;
        const homeNameLc = (homeNameRaw || '').toLowerCase();
        const awayNameLc = (awayNameRaw || '').toLowerCase();

        // Prefer numeric / stored IDs if available
        const embeddedHomeId = match.homeTeamId || match.homeTeam?.id || match.homeTeam?._id;
        const embeddedAwayId = match.awayTeamId || match.awayTeam?.id || match.awayTeam?._id;
        let homeTeamObj = embeddedHomeId ? { id: embeddedHomeId, name: homeNameRaw, crest: match.homeTeam?.crest || match.homeTeam?.logo } : null;
        let awayTeamObj = embeddedAwayId ? { id: embeddedAwayId, name: awayNameRaw, crest: match.awayTeam?.crest || match.awayTeam?.logo } : null;

        // Fetch full team list only if we still need mapping
        if (!homeTeamObj || !awayTeamObj) {
          let teams = [];
            try {
              const teamsRes = await apiClient.getTeams();
              teams = teamsRes?.data || teamsRes || [];
            } catch (e) {
              console.warn('Could not load teams for player roster mapping', e);
            }
          const findTeam = (nm) => teams.find(t => (t.name || '').toLowerCase() === (nm || '').toLowerCase());
          if (!homeTeamObj) homeTeamObj = findTeam(homeNameRaw);
          if (!awayTeamObj) awayTeamObj = findTeam(awayNameRaw);
          // If we found team objects, capture crests/logos
          setTeamLogos(prev => ({
            home: prev.home || (homeTeamObj?.crest || homeTeamObj?.logo || match.homeTeam?.crest || match.homeTeam?.logo || ''),
            away: prev.away || (awayTeamObj?.crest || awayTeamObj?.logo || match.awayTeam?.crest || match.awayTeam?.logo || '')
          }));
        }
        // Ensure team logos from match object if available
        setTeamLogos(prev => ({
          home: prev.home || match.homeTeam?.crest || match.homeTeam?.logo || homeTeamObj?.crest || homeTeamObj?.logo || '',
          away: prev.away || match.awayTeam?.crest || match.awayTeam?.logo || awayTeamObj?.crest || awayTeamObj?.logo || ''
        }));

        const fetchPlayers = async (teamObj, fallbackName) => {
          if (!teamObj && !fallbackName) return [];
          // Attempt by ID first
          if (teamObj) {
            let teamId = teamObj.id || teamObj._id;
            if (teamId && typeof teamId === 'string' && /^\d+$/.test(teamId)) teamId = parseInt(teamId, 10);
            if (teamId) {
              try {
                const res = await fetch(`/api/players?teamId=${encodeURIComponent(teamId)}`);
                if (res.ok) {
                  const pdata = await res.json();
                  if (Array.isArray(pdata.players) && pdata.players.length) return pdata.players;
                }
              } catch (err) {
                console.warn('Player fetch by teamId failed', teamId, err);
              }
            }
          }
          // Fallback: attempt name-based client-side filter (requires all players – potentially heavy) OR skip.
          // We avoid pulling all players (no endpoint) so we try heuristic: if high-profile club and empty, log a hint.
          if (fallbackName) {
            console.info(`No players returned for ${fallbackName}. Ensure Players collection has documents with teamId matching Teams entry (team: ${fallbackName}).`);
          }
          return [];
        };

        const [homeList, awayList] = await Promise.all([
          fetchPlayers(homeTeamObj, homeNameRaw),
          fetchPlayers(awayTeamObj, awayNameRaw)
        ]);

        setHomePlayers(homeList);
        setAwayPlayers(awayList);

        // Additional diagnostic: if a famous club has zero players, surface an inline pseudo-player option to indicate missing data.
        const famous = ['liverpool', 'real madrid', 'manchester city', 'barcelona', 'arsenal'];
        if (homeList.length === 0 && famous.includes(homeNameLc)) {
          setHomePlayers([{ name: '— No roster data (check teamId mapping) —' }]);
        }
        if (awayList.length === 0 && famous.includes(awayNameLc)) {
          setAwayPlayers([{ name: '— No roster data (check teamId mapping) —' }]);
        }
      } catch (e) {
        console.warn('Roster fetch sequence failed', e);
      }
    })();
    // Detect if HT/FT already present - do this synchronously, not in setTimeout
    const hasHT = events.some(e => canonicalEventType(e.type) === 'half_time');
    const hasFT = events.some(e => canonicalEventType(e.type) === 'match_end');
    halfTimeTriggeredRef.current = hasHT;
    fullTimeTriggeredRef.current = hasFT;
    if (hasHT) setPeriod('2H');

    // Load persisted events from server
    fetchServerEvents();
    // Load match statistics
    loadMatchStatistics();
  }, [match, fetchServerEvents]);

  // Poll for new events every 15s while component mounted (keeps LiveInput in sync with viewer/admin actions elsewhere)
  useEffect(() => {
    if (!match) return;
    const id = setInterval(() => { 
      // Always fetch fresh for admin matches to prevent stale data issues
      const isAdminMatch = match.createdByAdmin || String(match.id || match._id).startsWith('a_');
      fetchServerEvents(isAdminMatch); 
    }, 15000);
    return () => clearInterval(id);
  }, [match, fetchServerEvents]);

  // On mount or when match changes, hydrate from backend to get persisted clock state
  useEffect(() => {
    if (!match || !isAdmin) return; // only admins can control clock
    if (!(match.id || match._id)) return;
    // Fetch full match to get clock info even if parent passed a simplified object
    (async () => {
      try {
        const res = await apiClient.getMatch(match.id || match._id);
        const serverMatch = res?.data || res;
        if (serverMatch && serverMatch.createdByAdmin) {
          const clock = serverMatch.clock;
          if (clock) {
            const base = Math.max(0, Math.floor(clock.elapsed || 0));
            const extra = (clock.running && clock.startedAt) ? Math.max(0, Math.floor((Date.now() - Date.parse(clock.startedAt)) / 1000)) : 0;
            const total = base + extra;
            setMatchTime(total);
            setIsPaused(!clock.running);
            const min = Math.floor(total / 60);
            setPeriod(min >= 46 ? '2H' : '1H');
          }
        }
      } catch (_) {
        // ignore; we'll rely on props fallback
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id, match?._id]);

  // When user switches the team selector and that roster is empty, attempt a lazy fetch again
  useEffect(() => {
    if (!match) return;
    const targetList = newEvent.team === 'home' ? homePlayers : awayPlayers;
    if (targetList.length > 0) return;
    (async () => {
      try {
        const teamsRes = await apiClient.getTeams();
        const teams = teamsRes?.data || teamsRes || [];
        const resolveName = (t) => (t.name || '').toLowerCase();
        const homeNameRef = (match.homeTeam?.name || match.homeTeam || '').toLowerCase();
        const awayNameRef = (match.awayTeam?.name || match.awayTeam || '').toLowerCase();
        const homeTeamObj = teams.find(t => resolveName(t) === homeNameRef);
        const awayTeamObj = teams.find(t => resolveName(t) === awayNameRef);
        const fetchPlayers = async (teamObj) => {
          if (!teamObj) return [];
          const teamId = teamObj.id || teamObj._id;
          if (!teamId) return [];
          try {
            const res = await fetch(`/api/players?teamId=${encodeURIComponent(teamId)}`);
            if (res.ok) {
              const pdata = await res.json();
              return pdata.players || [];
            }
          } catch {}
          return [];
        };
        if (newEvent.team === 'home' && homePlayers.length === 0) {
          const list = await fetchPlayers(homeTeamObj);
          if (list.length) setHomePlayers(list);
        }
        if (newEvent.team === 'away' && awayPlayers.length === 0) {
          const list = await fetchPlayers(awayTeamObj);
          if (list.length) setAwayPlayers(list);
        }
      } catch {
        // ignore
      }
    })();
  }, [newEvent.team, match, homePlayers, awayPlayers]);

  return (
    <div className="live-input">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Live Match Input</h2>
        {onBackToMatch && (
          <button className="timer-btn" onClick={onBackToMatch} style={{ marginLeft: 'auto' }}>↩ Back</button>
        )}
      </div>
      {!isAdmin && (
        <p style={{ color: '#b00' }}>Access denied: Admin role required.</p>
      )}
      {isAdmin && !match && (
        <p>No match selected. Select a match first from Live Sports.</p>
      )}
      {isAdmin && match && (
        <>
        {/* Match Header - Split Layout */}
     <div className="match-header-split">
  {/* Home Team */}
  <div className="team-header-section home-team">
    <div className="team-display">
      {teamLogos.home && (
        <img src={teamLogos.home} alt={`${homeName} crest`} className="team-header-crest" />
      )}
      <h3 className="team-name" title={homeName}>{homeName}</h3>
    </div>
    <div className="team-score">
      <span className="score-display">{score.home}</span>
    </div>
  </div>

          {/* Center Match Info */}
  <div className="match-center-info">
    <div className="match-status">
      <div className="time-display-large">
        {formatTime(matchTime)}
        <span className="match-status-badge">
          {(() => {
            const effectiveStatus = getEffectiveMatchStatus();
            if (effectiveStatus === 'FINISHED') return 'FINISHED';
            if (match?.createdByAdmin) return isPaused ? 'PAUSED' : 'LIVE';
            if (effectiveStatus === 'IN_PLAY') return 'LIVE';
            if (effectiveStatus === 'PAUSED') return 'PAUSED';
            return effectiveStatus || 'TIMED';
          })()}
        </span>
      </div>
      <div className="timer-controls-compact">
        <button
          className="timer-btn pause-btn"
          onClick={async () => {
            const willPause = !isPaused;
            setIsPaused(prev => !prev);
            try {
              if (match?.createdByAdmin && (match?.id || match?._id)) {
                const elapsed = matchTime;
                if (willPause) {
                  await apiClient.updateMatch(match.id || match._id, { clock: { running: false, elapsed } }, { userType: isAdmin ? 'admin' : '' });
                } else {
                  await apiClient.updateMatch(match.id || match._id, { clock: { running: true, elapsed, startedAt: new Date().toISOString() } }, { userType: isAdmin ? 'admin' : '' });
                }
              } else if (match?.id || match?._id) {
                const minute = Math.floor(matchTime / 60);
                await apiClient.updateMatch(match.id || match._id, { status: willPause ? 'PAUSED' : 'IN_PLAY', minute, period }, { userType: isAdmin ? 'admin' : '' });
              }
            } catch {}
          }}
          title={isPaused ? 'Resume clock' : 'Pause clock'}
          disabled={!match?.createdByAdmin || getEffectiveMatchStatus() === 'FINISHED' || fullTimeTriggeredRef.current}
        >
          {isPaused ? '▶' : '⏸'}
        </button>
      </div>
    </div>
            <div className="possession-display">
  <div 
    className="possession-bar-interactive"
    onClick={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = (clickX / rect.width) * 100;
      const newPossession = Math.max(0, Math.min(100, Math.round(percentage)));
      setPossession(newPossession);
      updateStatistic('possession', 'home', newPossession);
    }}
    title={`Click to set possession: ${homeName} ${possession}% - ${awayName} ${100 - possession}%`}
  >
    <div 
      className="possession-home" 
      style={{ width: `${possession}%` }}
    ></div>
    <div 
      className="possession-away" 
      style={{ width: `${100 - possession}%` }}
    ></div>
    <div 
      className="possession-handle"
      style={{ left: `${possession}%` }}
      onMouseDown={(e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startPossession = possession;
        const barWidth = e.currentTarget.parentElement.getBoundingClientRect().width;

        const handleMouseMove = (moveEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const deltaPercentage = (deltaX / barWidth) * 100;
          const newPossession = Math.max(0, Math.min(100, Math.round(startPossession + deltaPercentage)));
          setPossession(newPossession);
          updateStatistic('possession', 'home', newPossession);
        };

        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }}
    >
      <div className="handle-dot"></div>
    </div>
  </div>
  <div className="possession-labels">
    <span>{possession}%</span>
    <span>Possession</span>
    <span>{100 - possession}%</span>
  </div>
</div>
          </div>

         
  {/* Away Team - SAME STRUCTURE as Home Team */}
  <div className="team-header-section away-team">
    <div className="team-display">
      {teamLogos.away && (
        <img src={teamLogos.away} alt={`${awayName} crest`} className="team-header-crest" />
      )}
      <h3 className="team-name" title={awayName}>{awayName}</h3>
    </div>
    <div className="team-score">
      <span className="score-display">{score.away}</span>
    </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="match-controls-compact">
          <div className="control-buttons-group">
  <button 
    className="timer-btn stats-toggle-btn"
    onClick={() => setShowStatsPanel(!showStatsPanel)}
  >
    {showStatsPanel ? '📊 Hide Stats' : '📊 Show Stats'}
  </button>
  
  <button 
    className="timer-btn"
    onClick={() => setShowLineupsModal(!showLineupsModal)}
  >
    {showLineupsModal ? '👥 Hide Lineups' : '👥 Edit Lineups'}
  </button>

  <button 
    className="timer-btn"
    onClick={() => setShowCommentaryModal(!showCommentaryModal)}
  >
    {showCommentaryModal ? '💬 Hide Commentary' : '💬 Live Commentary'}
  </button>
</div>
          
          <div className="match-phase-buttons">
            <button 
              type="button" 
              className="phase-btn half-time-btn"
              onClick={async () => {
                const minutes = Math.floor(matchTime / 60);
                
                // Mark half time as triggered immediately to prevent duplicates
                halfTimeTriggeredRef.current = true;
                setPeriod('2H');
                setInOvertime(false);
                setIsPaused(true);
                
                const payload = {
                  type: 'half_time',
                  team: '',
                  teamSide: '',
                  player: '',
                  minute: minutes,
                  time: `${minutes}:${(matchTime % 60).toString().padStart(2,'0')}`,
                  description: 'Half Time',
                  matchId: match?.id || match?._id
                };
                try {
                  if (match?.id || match?._id) {
                    const resp = await apiClient.addMatchEvent(match.id || match._id, { ...payload, matchId: String(match?.id || match?._id) }, { userType: isAdmin ? 'admin' : '' });
                    const persisted = resp?.data || payload;
                    setEvents(prev => [...prev, normalizeServerEvents([persisted])[0]]);
                    // Sync with server after a short delay
                    setTimeout(() => { fetchServerEvents(true); }, 500);
                  } else {
                    setEvents(prev => [...prev, { id: Date.now(), ...payload }]);
                  }
                } catch (e) {
                  console.warn('Failed to persist half time event', e);
                  setEvents(prev => [...prev, { id: Date.now(), ...payload }]);
                }
                
                try {
                  if (match?.createdByAdmin && (match?.id || match?._id)) {
                    await apiClient.updateMatch(match.id || match._id, { 
                      clock: { running: false, elapsed: matchTime },
                      status: 'IN_PLAY',
                      minute: minutes,
                      period: '2H',
                      lastUpdated: new Date().toISOString()
                    }, { userType: isAdmin ? 'admin' : '' });
                  }
                } catch {}
              }} 
              disabled={getEffectiveMatchStatus() === 'FINISHED' || fullTimeTriggeredRef.current || halfTimeTriggeredRef.current}
            >
              ⏱ Half Time
            </button>
            
            <button 
              type="button" 
              className="phase-btn full-time-btn"
              onClick={async () => {
                console.log('Full Time button clicked');
                const minutes = Math.floor(matchTime / 60);
                
                setIsPaused(true);
                fullTimeTriggeredRef.current = true;
                setLocalMatchStatus('FINISHED');
                
                const payload = {
                  type: 'match_end',
                  team: '',
                  teamSide: '',
                  player: '',
                  minute: minutes,
                  time: `${minutes}:${(matchTime % 60).toString().padStart(2,'0')}`,
                  description: 'Full Time',
                  matchId: match?.id || match?._id
                };
                
                try {
                  if (match?.id || match?._id) {
                    const resp = await apiClient.addMatchEvent(match.id || match._id, { ...payload, matchId: String(match?.id || match?._id) }, { userType: isAdmin ? 'admin' : '' });
                    const persisted = resp?.data || payload;
                    setEvents(prev => [...prev, normalizeServerEvents([persisted])[0]]);
                    // Sync with server after a short delay
                    setTimeout(() => { fetchServerEvents(true); }, 500);
                  } else {
                    setEvents(prev => [...prev, { id: Date.now(), ...payload }]);
                  }
                } catch (e) {
                  setEvents(prev => [...prev, { id: Date.now(), ...payload }]);
                }
                
                try {
                  if (match?.id || match?._id) {
                    const updateData = { 
                      status: 'FINISHED', 
                      minute: minutes,
                      lastUpdated: new Date().toISOString()
                    };
                    if (match?.createdByAdmin) {
                      updateData.clock = { running: false, elapsed: matchTime };
                    }
                    await apiClient.updateMatch(match.id || match._id, updateData, { userType: isAdmin ? 'admin' : '' });
                  }
                } catch (e) {
                  console.error('Failed to update match status to FINISHED', e);
                }
              }} 
              disabled={getEffectiveMatchStatus() === 'FINISHED' || fullTimeTriggeredRef.current}
            >
              🏁 Full Time
            </button>
          </div>
        </div>
  <div className="event-input">
        <h3>Add Match Event</h3>
        <div className="event-form">
          <div className="form-row">
            <select
              value={newEvent.type}
              onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
            >
              <option value="goal">Goal</option>
              <option value="penalty">Penalty Goal</option>
              <option value="own_goal">Own Goal</option>
              <option value="yellow_card">Yellow Card</option>
              <option value="red_card">Red Card</option>
              <option value="second_yellow">Second Yellow</option>
              <option value="substitution">Substitution</option>
              <option value="injury">Injury</option>
              <option value="foul">Foul</option>
              <option value="corner_kick">Corner Kick</option>
              <option value="free_kick">Free Kick</option>
              <option value="offside">Offside</option>
              <option value="save">Save</option>
              <option value="other">Other</option>
            </select>
            
            <select 
              value={newEvent.team}
              onChange={(e) => setNewEvent({...newEvent, team: e.target.value})}
            >
              <option value="home">{homeName}</option>
              <option value="away">{awayName}</option>
            </select>
            
            <div className="minute-display" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Minute:</span>
              {isEditingMinute ? (
                <input
                  type="number"
                  min="0"
                  value={newEvent.minute}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Store raw but limit to numbers >=0
                    if (/^\d*$/.test(val)) {
                      setNewEvent(prev => ({ ...prev, minute: val }));
                    }
                  }}
                  onBlur={() => setIsEditingMinute(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      // Revert to current live minute and exit
                      setNewEvent(prev => ({ ...prev, minute: Math.floor(matchTime / 60).toString() }));
                      setIsEditingMinute(false);
                    }
                  }}
                  aria-label="Edit event minute"
                  style={{ width: 64 }}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className="minute-readonly"
                  onClick={() => setIsEditingMinute(true)}
                  title="Click to edit minute"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {newEvent.minute}
                </button>
              )}
            </div>
          </div>
          
          {newEvent.type !== 'substitution' && (
            <div className="form-row">
              {/* Free text player input with optional datalist for quick selection */}
              <input
                type="text"
                list="player-suggestions"
                placeholder="Player name"
                aria-label="Player name"
                value={newEvent.player}
                onChange={(e) => setNewEvent({ ...newEvent, player: e.target.value })}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  if (trimmed !== newEvent.player) {
                    setNewEvent(prev => ({ ...prev, player: trimmed }));
                  }
                }}
                style={{ minWidth: 160 }}
              />
              <datalist id="player-suggestions">
                {(newEvent.team === 'home' ? homePlayers : awayPlayers)
                  .map(p => p.name || p.playerName || p.fullName || '')
                  .filter(nm => nm && !/^— No roster data/.test(nm))
                  .slice(0, 50)
                  .map(nm => <option key={nm} value={nm}>{nm}</option>)}
                {(newEvent.team === 'home' ? homePlayers : awayPlayers)
                  .map(p => p.name || p.playerName || p.fullName || '')
                  .find(nm => /^— No roster data/.test(nm)) && (
                    <option key="no-roster" value="— No roster data (check teamId mapping) —">— No roster data (check teamId mapping) —</option>
                  )}
              </datalist>
            </div>
          )}
          {newEvent.type === 'substitution' && (
            <div className="form-row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                list="player-out-suggestions"
                placeholder="Player OUT"
                aria-label="Player out"
                value={newEvent.playerOut}
                onChange={(e) => setNewEvent({ ...newEvent, playerOut: e.target.value })}
                style={{ minWidth: 140 }}
              />
              <datalist id="player-out-suggestions">
                {(newEvent.team === 'home' ? homePlayers : awayPlayers)
                  .map(p => p.name || p.playerName || p.fullName || '')
                  .filter(nm => nm && !/^— No roster data/.test(nm))
                  .slice(0, 50)
                  .map(nm => <option key={nm} value={nm}>{nm}</option>)}
              </datalist>
              <span style={{ alignSelf: 'center' }}>→</span>
              <input
                type="text"
                list="player-in-suggestions"
                placeholder="Player IN"
                aria-label="Player in"
                value={newEvent.playerIn}
                onChange={(e) => setNewEvent({ ...newEvent, playerIn: e.target.value })}
                style={{ minWidth: 140 }}
              />
              <datalist id="player-in-suggestions">
                {(newEvent.team === 'home' ? homePlayers : awayPlayers)
                  .map(p => p.name || p.playerName || p.fullName || '')
                  .filter(nm => nm && !/^— No roster data/.test(nm))
                  .slice(0, 50)
                  .map(nm => <option key={nm} value={nm}>{nm}</option>)}
              </datalist>
            </div>
          )}
          
          <textarea 
            placeholder="Event description" 
            value={newEvent.description}
            onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
          />
          
          <button 
            onClick={handleEventAdd}
            disabled={getEffectiveMatchStatus() === 'FINISHED'}
            title={getEffectiveMatchStatus() === 'FINISHED' ? 'Cannot add events to finished match' : 'Add event to match'}
          >
            Add Event
          </button>
        </div>
    </div>

   


      
  <div className="events-log">
        <h3>Events Timeline</h3>
        {events.length === 0 ? (
          <p className="no-events">No events recorded yet.</p>
        ) : (
          events
            .slice()
            .sort((a,b) => {
              const ma = (a.minute === 0 || a.minute) ? a.minute : (a.time ? parseInt(String(a.time).split(':')[0],10) : undefined);
              const mb = (b.minute === 0 || b.minute) ? b.minute : (b.time ? parseInt(String(b.time).split(':')[0],10) : undefined);
              if (ma == null && mb == null) return 0;
              if (ma == null) return 1;
              if (mb == null) return -1;
              return ma - mb;
            })
            .map(event => {
            let minuteVal;
            if (event.minute !== undefined && event.minute !== null && event.minute !== '') {
              minuteVal = typeof event.minute === 'number' ? event.minute : (parseInt(String(event.minute), 10) || undefined);
            } else if (event.time) {
              const m = parseInt(String(event.time).split(':')[0],10); minuteVal = Number.isNaN(m) ? undefined : m;
            }
            const typeCanon = canonicalEventType(event.type);
            const label = eventLabel(typeCanon);
            const showDetails = !['half_time','match_end','match_start'].includes(typeCanon);
            // Resolve display team using side mapping first
            const side = event.team === 'home' || event.team === 'away' ? event.team : (event.teamSide || '');
            const teamDisplay = side === 'home' ? homeName : side === 'away' ? awayName : ((event.team||'') === homeName || (event.team||'') === awayName ? (event.team||'') : '');
            const crest = side === 'home'
              ? (teamLogos.home || match?.homeTeam?.crest || match?.homeTeam?.logo || '')
              : side === 'away'
                ? (teamLogos.away || match?.awayTeam?.crest || match?.awayTeam?.logo || '')
                : '';
            const minuteDisplay = (minuteVal == null) ? '' : `${minuteVal}'`;
            // Prefer server-provided description to avoid duplication; synthesize if absent
            const synthesized = (() => {
              if (typeCanon === 'substitution') {
                const subTxt = event.playerOut ? `${event.playerOut} → ${event.playerIn}` : (event.player || '');
                return [label, teamDisplay, subTxt].filter(Boolean).join(' - ');
              }
              return [label, teamDisplay, (event.player || '')].filter(Boolean).join(' - ');
            })();
            const detailsText = (event.description && event.description.trim()) || synthesized;
            return (
              <div key={event.id} className={`event-log-item ${event.type}`}>
                <span className="event-time" title="Match minute" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {crest && (
                    <img className="event-time-crest" src={crest} alt={`${teamDisplay || 'Team'} crest`} />
                  )}
                  <span className="event-minute-text">{minuteDisplay}</span>
                </span>
                <span className="event-details-text">{showDetails ? detailsText : label}</span>
                <button className="remove-btn" onClick={() => removeEvent(event.id)}>×</button>
              </div>
            );
          })
        )}
  </div>

  {showStatsPanel && (
  <div className="match-statistics-panel">
    <h3>Match Statistics</h3>
    {statsLoading ? (
      <p>Loading statistics...</p>
    ) : (
      <div className="stats-split-layout">
        {/* Home Team Stats */}
        <div className="team-stats home-stats">
          <div className="team-header">
            {teamLogos.home && (
              <img src={teamLogos.home} alt={`${homeName} crest`} className="team-crest" />
            )}
            <h4>{homeName}</h4>
          </div>
          
          <div className="stats-grid">
            <div className="stat-category">
              <h5>Shots</h5>
              <div className="stat-item">
                <label>Shots on Target:</label>
                <input 
                  type="number" 
                  min="0" 
                  value={matchStats.shotsOnTarget?.home || 0}
                  onChange={(e) => updateStatistic('shotsOnTarget', 'home', e.target.value)}
                />
              </div>
              <div className="stat-item">
                <label>Shots off Target:</label>
                <input 
                  type="number" 
                  min="0" 
                  value={matchStats.shotsOffTarget?.home || 0}
                  onChange={(e) => updateStatistic('shotsOffTarget', 'home', e.target.value)}
                />
              </div>
              <div className="stat-item">
                <label>Total Shots:</label>
                <input 
                  type="number" 
                  min="0" 
                  value={matchStats.totalShots?.home || 0}
                  onChange={(e) => updateStatistic('totalShots', 'home', e.target.value)}
                />
              </div>
            </div>

            <div className="stat-category">
              <h5>Fouls & Cards</h5>
              <div className="stat-item">
                <label>Fouls:</label>
                <input 
                  type="number" 
                  min="0" 
                  value={matchStats.fouls?.home || 0}
                  onChange={(e) => updateStatistic('fouls', 'home', e.target.value)}
                />
              </div>
              <div className="stat-item">
                <label>Yellow Cards:</label>
                <input 
                  type="number" 
                  min="0" 
                  value={matchStats.yellowCards?.home || 0}
                  onChange={(e) => updateStatistic('yellowCards', 'home', e.target.value)}
                />
              </div>
              <div className="stat-item">
                <label>Red Cards:</label>
                <input 
                  type="number" 
                  min="0" 
                  value={matchStats.redCards?.home || 0}
                  onChange={(e) => updateStatistic('redCards', 'home', e.target.value)}
                />
              </div>
            </div>

            <div className="stat-category">
              <h5>Other Stats</h5>
              <div className="stat-item">
                <label>Corners:</label>
                <input 
                  type="number" 
                  min="0" 
                  value={matchStats.corners?.home || 0}
                  onChange={(e) => updateStatistic('corners', 'home', e.target.value)}
                />
              </div>
              <div className="stat-item">
                <label>Offsides:</label>
                <input 
                  type="number" 
                  min="0" 
                  value={matchStats.offsides?.home || 0}
                  onChange={(e) => updateStatistic('offsides', 'home', e.target.value)}
                />
              </div>
              <div className="stat-item">
                <label>Saves:</label>
                <input 
                  type="number" 
                  min="0" 
                  value={matchStats.saves?.home || 0}
                  onChange={(e) => updateStatistic('saves', 'home', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Divider */}
        <div className="stats-divider">
          <div className="divider-line"></div>
          <div className="stat-labels">
            <span>Shots on Target</span>
            <span>Shots off Target</span>
            <span>Total Shots</span>
            <span>Fouls</span>
            <span>Yellow Cards</span>
            <span>Red Cards</span>
            <span>Corners</span>
            <span>Offsides</span>
            <span>Saves</span>
          </div>
          <div className="divider-line"></div>
        </div>

      {/* Away Team Stats */}
<div className="team-stats away-stats">
  <div className="team-header">
    {teamLogos.away && (
      <img src={teamLogos.away} alt={`${awayName} crest`} className="team-crest" />
    )}
    <h4>{awayName}</h4>
  </div>
  
  <div className="stats-grid">
    <div className="stat-category">
      <h5>Shots</h5>
      <div className="stat-item">
        <input 
          type="number" 
          min="0" 
          value={matchStats.shotsOnTarget?.away || 0}
          onChange={(e) => updateStatistic('shotsOnTarget', 'away', e.target.value)}
        />
        <label>Shots on Target:</label>
      </div>
      <div className="stat-item">
        <input 
          type="number" 
          min="0" 
          value={matchStats.shotsOffTarget?.away || 0}
          onChange={(e) => updateStatistic('shotsOffTarget', 'away', e.target.value)}
        />
        <label>Shots off Target:</label>
      </div>
      <div className="stat-item">
        <input 
          type="number" 
          min="0" 
          value={matchStats.totalShots?.away || 0}
          onChange={(e) => updateStatistic('totalShots', 'away', e.target.value)}
        />
        <label>Total Shots:</label>
      </div>
    </div>

    <div className="stat-category">
      <h5>Fouls & Cards</h5>
      <div className="stat-item">
        <input 
          type="number" 
          min="0" 
          value={matchStats.fouls?.away || 0}
          onChange={(e) => updateStatistic('fouls', 'away', e.target.value)}
        />
        <label>Fouls:</label>
      </div>
      <div className="stat-item">
        <input 
          type="number" 
          min="0" 
          value={matchStats.yellowCards?.away || 0}
          onChange={(e) => updateStatistic('yellowCards', 'away', e.target.value)}
        />
        <label>Yellow Cards:</label>
      </div>
      <div className="stat-item">
        <input 
          type="number" 
          min="0" 
          value={matchStats.redCards?.away || 0}
          onChange={(e) => updateStatistic('redCards', 'away', e.target.value)}
        />
        <label>Red Cards:</label>
      </div>
    </div>

    <div className="stat-category">
      <h5>Other Stats</h5>
      <div className="stat-item">
        <input 
          type="number" 
          min="0" 
          value={matchStats.corners?.away || 0}
          onChange={(e) => updateStatistic('corners', 'away', e.target.value)}
        />
        <label>Corners:</label>
      </div>
      <div className="stat-item">
        <input 
          type="number" 
          min="0" 
          value={matchStats.offsides?.away || 0}
          onChange={(e) => updateStatistic('offsides', 'away', e.target.value)}
        />
        <label>Offsides:</label>
      </div>
      <div className="stat-item">
        <input 
          type="number" 
          min="0" 
          value={matchStats.saves?.away || 0}
          onChange={(e) => updateStatistic('saves', 'away', e.target.value)}
        />
        <label>Saves:</label>
      </div>
    </div>
  </div>
</div>
      </div>
    )}
  </div>
)}

{showLineupsModal && (
  <LineupsAdminModal
    match={match}
    onClose={() => setShowLineupsModal(false)}
  />
)}

{showCommentaryModal && (
  <CommentaryAdminModal
    matchId={match.id}
    isOpen={showCommentaryModal}
    onClose={() => setShowCommentaryModal(false)}
  />
)}
        </>
      )}
    </div>
  );
};

export default LiveInput;