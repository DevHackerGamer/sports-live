import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';
import { getLeagueName } from '../../lib/leagueNames';
import LiveInput from '../liveInput/LiveInput';
import MatchStatistics from './MatchStatistics';
import LineupsTab from './LineupsTab';
import LiveCommentaryFeed from './LiveCommentaryFeed';

import '../../styles/MatchViewer.css';

const MatchViewer = ({ match, matchId, initialSection = 'details', onBack }) => {
  const { user } = useUser();
  const isAdmin = (user?.privateMetadata?.type === 'admin');
  const [matchDetails, setMatchDetails] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(initialSection);
  const [homeTeamPlayers, setHomeTeamPlayers] = useState([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState([]);
  const [newEvent, setNewEvent] = useState({ type: 'goal', time: '', team: '', player: '', description: '' });
  const [meta, setMeta] = useState({ referee: '', venue: '' });
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [isLoading, setIsLoading] = useState(!!matchId && !match);
  const [teamLogos, setTeamLogos] = useState({ home: '', away: '' });
  const [showEventList, setShowEventList] = useState(false);
 


  useEffect(() => {
    if (match || matchId) {
      fetchMatchDetails();
    } else {
      setMatchDetails(null);
      setEvents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, matchId]);

  // Refresh details immediately when LiveInput broadcasts a match update (pause/resume or HT/FT)
  useEffect(() => {
    let bc;
    const onMsg = (ev) => {
      try {
        const data = ev?.data || ev;
        if (data && data.type === 'matches-updated') {
          fetchMatchDetails();
        }
      } catch {}
    };
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('sports-live');
        bc.onmessage = onMsg;
      }
    } catch {}
    const onStorage = (e) => {
      if (!e) return;
      if (e.key === 'sports:refresh') {
        fetchMatchDetails();
      }
    };
    try { window.addEventListener('storage', onStorage); } catch {}
    return () => {
      try { window.removeEventListener('storage', onStorage); } catch {}
      try { if (bc) bc.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, matchId]);  // Add dependencies so fetchMatchDetails has fresh closure

  
  


  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);
  
  // Lazy load teams/players when admin enters update section
  useEffect(() => {
    if (isAdmin && activeSection === 'update' && matchDetails && !homeTeamPlayers.length && !awayTeamPlayers.length) {
      fetchTeamsAndPlayers(matchDetails);
    }
  }, [isAdmin, activeSection, matchDetails]);

  const fetchMatchDetails = async () => {
    if (!match && !matchId) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const idToFetch = (match && (match.id || match._id)) || matchId;
      
      // Single API call to get match with events embedded
      const matchResponse = await apiClient.getMatchById(idToFetch);
      const matchData = matchResponse.data;
      
      setMatchDetails(matchData);
      setMeta({ referee: matchData?.referee || '', venue: matchData?.venue || '' });
      
      // Set team logos/crests if available
      if (matchData.homeTeam?.crest || matchData.homeTeam?.logo) {
        setTeamLogos(prev => ({ ...prev, home: matchData.homeTeam.crest || matchData.homeTeam.logo }));
      }
      if (matchData.awayTeam?.crest || matchData.awayTeam?.logo) {
        setTeamLogos(prev => ({ ...prev, away: matchData.awayTeam.crest || matchData.awayTeam.logo }));
      }
      
      // Normalize events from the match response
      const normalizeEvents = (raw = []) => {
        const homeTeamName = (matchData?.homeTeam?.name || matchData?.homeTeam || '').toString();
        const awayTeamName = (matchData?.awayTeam?.name || matchData?.awayTeam || '').toString();
        return raw.map(ev => {
          const out = { ...ev };
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
          const rawTeamStr = (out.team || out.teamName || out.teamSide || '').toString();
          const lcRaw = rawTeamStr.toLowerCase();
          let side = '';
          if (lcRaw === homeTeamName.toLowerCase()) side = 'home';
          else if (lcRaw === awayTeamName.toLowerCase()) side = 'away';
          else if (/^home$/.test(lcRaw)) side = 'home';
          else if (/^away$/.test(lcRaw)) side = 'away';
          else if (/home/.test(lcRaw) && !/away/.test(lcRaw)) side = 'home';
          else if (/away/.test(lcRaw) && !/home/.test(lcRaw)) side = 'away';
          if ((!out.team || typeof out.team !== 'string' || out.team.trim()==='') && side) {
            out.team = side === 'home' ? homeTeamName : awayTeamName;
          }
          let rawType = out.type || out.eventType || out.kind;
          if (!rawType || rawType === 'other') {
            const desc = (out.description || '').toLowerCase();
            if (/penalty/.test(desc)) rawType = 'penalty';
            else if (/own goal|owngoal/.test(desc)) rawType = 'own_goal';
            else if (/yellow card/.test(desc) && /second/.test(desc)) rawType = 'second_yellow';
            else if (/yellow card|booking|cautioned/.test(desc)) rawType = 'yellow_card';
            else if (/red card|sent off|dismissed/.test(desc)) rawType = 'red_card';
            else if (/substitut|replaces|comes on|→/.test(desc)) rawType = 'substitution';
            else if (/corner/.test(desc)) rawType = 'corner_kick';
            else if (/free kick|freekick/.test(desc)) rawType = 'free_kick';
            else if (/foul/.test(desc)) rawType = 'foul';
            else if (/offside/.test(desc)) rawType = 'offside';
            else if (/save/.test(desc)) rawType = 'save';
            else if (/injury/.test(desc)) rawType = 'injury';
            else if (/kick off|kick-off|kickoff/.test(desc)) rawType = 'match_start';
            else if (/half time|halftime/.test(desc)) rawType = 'half_time';
            else if (/full time|match end|ended/.test(desc)) rawType = 'match_end';
            else if (/goal|scores|scored|header|shot/.test(desc)) rawType = 'goal';
          }
          out.type = canonicalEventType(rawType);
          out.minute = (minute != null) ? minute : undefined;
          out._side = side;
          const hasDesc = !!(out.description && out.description.trim());
          const playerOut = out.playerOut || out.subOut;
          const playerIn = out.playerIn || out.subIn;
          if (!hasDesc) {
            let base = '';
            const label = eventLabel(out.type);
            base += label;
            if (out.team) base += ` - ${out.team}`;
            if (out.player) base += ` - ${out.player}`;
            else if (playerOut || playerIn) base += ` - ${(playerOut||'')} ${playerOut&&playerIn?'→':''} ${(playerIn||'')}`;
            out.description = base;
          }
          return out;
        });
      };
      
      // Use events from match response or empty array (no additional API calls)
      const mergedEvents = normalizeEvents(matchData.events || []);
      setEvents(mergedEvents);
      
      // Only fetch teams/players if user is admin (lazy load for edit mode)
      if (isAdmin && activeSection === 'update') {
        fetchTeamsAndPlayers(matchData);
      }
    } catch (err) {
      console.error('Error fetching match details:', err);
      setError(err.message);
      // Fallback to using the passed match prop
      if (match) {
        setMatchDetails(match);
        setEvents(match.events || []);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Separate function for lazy loading teams/players (only when needed)
  const fetchTeamsAndPlayers = async (matchData) => {
    try {
      const teamsRes = await apiClient.getTeams();
      const teams = teamsRes.data || [];
      const homeTeamName = (matchData.homeTeam?.name || matchData.homeTeam || '').toString();
      const awayTeamName = (matchData.awayTeam?.name || matchData.awayTeam || '').toString();
      const homeTeam = teams.find(t => (t.name || '').toLowerCase() === homeTeamName.toLowerCase());
      const awayTeam = teams.find(t => (t.name || '').toLowerCase() === awayTeamName.toLowerCase());
      
      if ((homeTeam?.crest || homeTeam?.logo) && !teamLogos.home) {
        setTeamLogos(prev => ({ ...prev, home: homeTeam.crest || homeTeam.logo }));
      }
      if ((awayTeam?.crest || awayTeam?.logo) && !teamLogos.away) {
        setTeamLogos(prev => ({ ...prev, away: awayTeam.crest || awayTeam.logo }));
      }
      
      const fetchPlayers = async (team, setter) => {
        if (team?.id || team?._id) {
          const teamId = team.id || team._id;
          try {
            const playersRes = await fetch(`/api/players?teamId=${encodeURIComponent(teamId)}`);
            if (playersRes.ok) {
              const pdata = await playersRes.json();
              setter(pdata.players || []);
            }
          } catch {}
        }
      };
      
      // Fetch both in parallel
      await Promise.all([
        fetchPlayers(homeTeam, setHomeTeamPlayers),
        fetchPlayers(awayTeam, setAwayTeamPlayers)
      ]);
    } catch (e) {
      console.warn('Failed to load teams/players for admin editing:', e.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  const canonicalEventType = (raw) => {
    if (!raw) return 'other';
    const t = String(raw).toLowerCase();
    const map = {
      goal: 'goal', penalty: 'penalty', penaltygoal: 'penalty', 'penalty goal': 'penalty',
      own_goal: 'own_goal', owngoal: 'own_goal',
      yellow: 'yellow_card', yellowcard: 'yellow_card',
      red: 'red_card', redcard: 'red_card',
      yellowred: 'second_yellow', secondyellow: 'second_yellow', second_yellow: 'second_yellow',
      substitution: 'substitution', sub: 'substitution',
      foul: 'foul', freekick: 'free_kick', free_kick: 'free_kick',
      corner: 'corner_kick', cornerkick: 'corner_kick',
      injury: 'injury', offside: 'offside', save: 'save',
      halftime: 'half_time', half_time: 'half_time',
      match_start: 'match_start', kickoff: 'match_start',
      match_end: 'match_end', matchend: 'match_end'
    };
    return map[t] || t || 'other';
  };

  const eventLabel = (type) => {
    switch (canonicalEventType(type)) {
      case 'goal': return 'Goal';
      case 'penalty': return 'Penalty Goal';
      case 'own_goal': return 'Own Goal';
      case 'yellow_card': return 'Yellow Card';
      case 'red_card': return 'Red Card';
      case 'second_yellow': return 'Second Yellow';
      case 'substitution': return 'Substitution';
      case 'foul': return 'Foul';
      case 'free_kick': return 'Free Kick';
      case 'corner_kick': return 'Corner Kick';
      case 'offside': return 'Offside';
      case 'save': return 'Save';
      case 'injury': return 'Injury';
      case 'match_start': return 'Kick Off';
      case 'half_time': return 'Half Time';
      case 'match_end': return 'Full Time';
      default: return 'Event';
    }
  };

  const submitEventReport = async () => {
    if (!reportTitle.trim()) {
      alert("Please enter a title");
      return;
    }
    if (!reportDescription.trim()) {
      alert("Please enter a description");
      return;
    }

    try {
      const report = await apiClient.createReport({
        matchId: match.id || match._id,
        eventId: selectedEvent || null,
        title: reportTitle,
        description: reportDescription,
      });
      console.log('Report submitted:', report);
      alert("Report submitted successfully!");
      setReportTitle('');
      setReportDescription('');
      setSelectedEvent('');
      setShowReportPanel(false);
      window.dispatchEvent(new CustomEvent('reportsUpdated'));
    } catch (err) {
      console.error("Failed to submit report:", err);
      alert("Failed to submit report");
    }
  };

  // Admin actions
  const submitNewEvent = async () => {
    if (!isAdmin || !match) return;
    try {
      const id = match.id || match._id;
      await apiClient.addMatchEvent(id, {
        type: newEvent.type,
        time: newEvent.time,
        player: newEvent.player,
        team: newEvent.team,
        description: newEvent.description,
      }, { userType: 'admin' });
    } catch (e) {
      setError(e.message);
      return;
    }
    await fetchMatchDetails();
    setNewEvent({ type: 'goal', time: '', team: '', player: '', description: '' });
  };

  const saveMatchMeta = async () => {
    if (!isAdmin || !match) return;
    try {
      const id = match.id || match._id;
      await apiClient.updateMatch(id, { referee: meta.referee, venue: meta.venue }, { userType: 'admin' });
      await fetchMatchDetails();
    } catch (e) {
      setError(e.message);
    }
  };

  const playerOptions = useMemo(() => ({
    home: (homeTeamPlayers || []).map(p => p.name || p.playerName || ''),
    away: (awayTeamPlayers || []).map(p => p.name || p.playerName || ''),
  }), [homeTeamPlayers, awayTeamPlayers]);

  // Compute display match fields before any conditional returns to satisfy hooks rules
  const displayMatchRaw = matchDetails || match;
  const displayMatch = useMemo(() => {
    const dm = {
      ...displayMatchRaw,
      homeTeam: displayMatchRaw?.homeTeam?.name || displayMatchRaw?.homeTeam || '',
      awayTeam: displayMatchRaw?.awayTeam?.name || displayMatchRaw?.awayTeam || '',
      competition: getLeagueName(
        displayMatchRaw?.competitionCode || 
        displayMatchRaw?.competition?.code || 
        displayMatchRaw?.competition?.name || 
        displayMatchRaw?.competition || 
        ''
      ),
    };
    const rawStatus = (dm.status || '').toString();
    // Canonicalize status for consistent UI
    if (/^IN_PLAY$/i.test(rawStatus)) dm.status = 'live';
    else if (/^PAUSED$/i.test(rawStatus)) dm.status = 'paused';
    else if (/^FINISHED$/i.test(rawStatus)) dm.status = 'finished';
    // Derive scores if not directly present
    if (dm.homeScore == null) {
      dm.homeScore = dm?.score?.fullTime?.home ?? dm?.score?.halfTime?.home ?? dm?.score?.regular?.home ?? 0;
    }
    if (dm.awayScore == null) {
      dm.awayScore = dm?.score?.fullTime?.away ?? dm?.score?.halfTime?.away ?? dm?.score?.regular?.away ?? 0;
    }
    // If still nullish ensure numbers
    dm.homeScore = typeof dm.homeScore === 'number' ? dm.homeScore : 0;
    dm.awayScore = typeof dm.awayScore === 'number' ? dm.awayScore : 0;

    // Derive current minute if live/paused and missing
    if ((dm.status === 'live' || dm.status === 'paused') && (dm.minute == null || dm.minute === '')) {
      // Try latest event with a minute/time
      const evs = (dm.events || events || []).slice().sort((a,b)=> (b.minute||0) - (a.minute||0));
      if (evs.length && (evs[0].minute || evs[0].time)) {
        const m = evs[0].minute || parseInt(String(evs[0].time).split(':')[0],10);
        if (!isNaN(m)) dm.minute = m;
      }
      // Fallback: compute from scheduled start time
      if (!dm.minute && dm.utcDate) {
        const started = Date.parse(dm.utcDate);
        if (!isNaN(started)) {
          const diff = Math.floor((Date.now()-started)/60000);
          if (diff >=0 && diff <= 130) dm.minute = diff; // allow extra time
        }
      }
    }
    return dm;
  }, [displayMatchRaw, events]);

  // Build timeline-friendly events with resolved minute and side
  const timelineData = useMemo(() => {
    const homeName = (displayMatchRaw?.homeTeam?.name || displayMatchRaw?.homeTeam || '').toString();
    const awayName = (displayMatchRaw?.awayTeam?.name || displayMatchRaw?.awayTeam || '').toString();
    const resolved = (events || []).map((event) => {
      // minute
      let minute;
      if (event.minute !== undefined && event.minute !== null && event.minute !== '') {
        minute = typeof event.minute === 'number' ? event.minute : parseInt(String(event.minute), 10);
      } else if (event.time) {
        const m = parseInt(String(event.time).split(':')[0], 10);
        minute = Number.isNaN(m) ? undefined : m;
      }
      if (Number.isNaN(minute)) minute = undefined;
      // side
      const rawTeam = (event.team || event.teamName || '').toString();
      const side = /^(home|away)$/i.test(rawTeam)
        ? rawTeam.toLowerCase()
        : ((event.teamSide && /^(home|away)$/i.test(event.teamSide)) ? event.teamSide.toLowerCase() :
          ((rawTeam && homeName && rawTeam.toLowerCase() === homeName.toLowerCase()) ? 'home' :
            ((rawTeam && awayName && rawTeam.toLowerCase() === awayName.toLowerCase()) ? 'away' : '')));
      // crest per side
      const crest = side === 'home'
        ? (teamLogos.home || (displayMatchRaw?.homeTeam && typeof displayMatchRaw.homeTeam === 'object' ? displayMatchRaw.homeTeam.crest : ''))
        : side === 'away'
          ? (teamLogos.away || (displayMatchRaw?.awayTeam && typeof displayMatchRaw.awayTeam === 'object' ? displayMatchRaw.awayTeam.crest : ''))
          : '';
      const type = canonicalEventType(event.type);
      const label = eventLabel(type);
      const playerDisplay = (type === 'substitution' && (event.playerOut || event.playerIn))
        ? `${event.playerOut || ''}${event.playerOut && event.playerIn ? ' → ' : ''}${event.playerIn || ''}`
        : (event.player || '');
      const teamName = (/^(home|away)$/i.test(rawTeam) || !rawTeam)
        ? (side === 'home' ? homeName : side === 'away' ? awayName : rawTeam)
        : rawTeam;
      const description = event.description || [label, teamName, playerDisplay].filter(Boolean).join(' - ');
      return { minute, side, crest, type, label, description, teamName };
    });
    const withMinute = resolved.filter(r => r.minute !== undefined && r.minute !== null && !Number.isNaN(r.minute));
    const maxMinute = Math.max(90, ...withMinute.map(r => r.minute).filter(m => typeof m === 'number' && m >= 0 && m <= 150));
    return { events: withMinute, maxMinute };
  }, [events, displayMatchRaw, teamLogos]);

  
  // When navigated directly via URL with only matchId, show a loading shell until details arrive
  if (!match && !matchDetails && matchId) {
    return (
      <div className="match-viewer">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading match details...</p>
        </div>
      </div>
    );
  }

  if (!match && !matchId) {
    return (
      <div className="match-viewer">
        <div className="no-match-selected">
          <h2>Match Viewer</h2>
          <p>Select a match from the Live Sports tab to view details</p>
          <p>Click on any match card to see detailed information here</p>
        </div>
      </div>
    );
  }

  // From here, either `match` or `matchDetails` must be available
  return (
    <div className="match-viewer">
      <div className="match-viewer-header">
        <h2>Match Overview</h2>
        <div className="header-actions">
          {onBack && (
            <button onClick={onBack} className="btn btn-secondary" title="Back to matches">
              ← Back
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading match details...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchMatchDetails} className="btn btn-primary">
            Retry
          </button>
        </div>
      )}

      <div className="match-sections-nav">
        <button 
          className={activeSection === 'details' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('details')}
        >
          Match Details
        </button>
        <button 
          className={activeSection === 'stats' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('stats')}
        >
          Statistics
        </button>

        <button 
          className={activeSection === 'events' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('events')}
        >
          Event Timeline
        </button>

        <button 
  className={activeSection === 'lineups' ? 'nav-btn active' : 'nav-btn'}
  onClick={() => setActiveSection('lineups')}
>
  Lineups
</button>
           <button 
  className={activeSection === 'live-commentary' ? 'nav-btn active' : 'nav-btn'}
  onClick={() => setActiveSection('live-commentary')}
>
  Live Commentary
</button>


        {isAdmin && (
          <button 
            className={activeSection === 'update' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveSection('update')}
          >
            Update Events
          </button>

          


        )}
        {isAdmin && (
          <button
            className={activeSection === 'live-input' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveSection('live-input')}
            title="Admin: enter live data for this match"
          >
            Live Input
          </button>
        )}
      </div>

      {activeSection === 'details' && (
        <div className="match-overview">
          <div className="match-teams">
            <div className="team home-team">
              <div className="team-logo">
                {(teamLogos.home || (displayMatchRaw?.homeTeam && typeof displayMatchRaw.homeTeam === 'object' && displayMatchRaw.homeTeam.crest)) ? (
                  <img src={teamLogos.home || displayMatchRaw.homeTeam.crest} alt={displayMatch.homeTeam} />
                ) : (
                  <div className="team-logo-placeholder">
                    {displayMatch.homeTeam.charAt(0)}
                  </div>
                )}
              </div>
              <div className="team-name">{displayMatch.homeTeam}</div>
              <div className="team-score">{displayMatch.homeScore}</div>
            </div>
            
            <div className="match-status">
              {(displayMatch.status === 'live' && displayMatch.minute) ? (
                <div className="live-indicator">
                  <span className="live-dot"></span>
                  <div className="live-minute" title="Current minute">{displayMatch.minute}'</div>
                </div>
              ) : displayMatch.status === 'paused' ? (
                <div className="match-result" title="Match paused">PAUSED {typeof displayMatch.minute === 'number' ? `• ${displayMatch.minute}'` : ''}</div>
              ) : (
                <div className="match-result">{String(displayMatch.status || '').toUpperCase()}</div>
              )}
              {displayMatch.utcDate && (
                <div className="match-date">
                  {formatDate(displayMatch.utcDate)}
                </div>
              )}
              <div className="match-vs">VS</div>
            </div>
            
            <div className="team away-team">
              <div className="team-logo">
                {(teamLogos.away || (displayMatchRaw?.awayTeam && typeof displayMatchRaw.awayTeam === 'object' && displayMatchRaw.awayTeam.crest)) ? (
                  <img src={teamLogos.away || displayMatchRaw.awayTeam.crest} alt={displayMatch.awayTeam} />
                ) : (
                  <div className="team-logo-placeholder">
                    {displayMatch.awayTeam.charAt(0)}
                  </div>
                )}
              </div>
              <div className="team-name">{displayMatch.awayTeam}</div>
              <div className="team-score">{displayMatch.awayScore}</div>
            </div>
          </div>

          <div className="match-info">
            <div className="info-item">
              <span className="label">Competition:</span>
              <span className="value">{displayMatch.competition}</span>
            </div>
            {displayMatch.venue && displayMatch.venue !== 'TBD' && (
              <div className="info-item">
                <span className="label">Venue:</span>
                <span className="value">{displayMatch.venue}</span>
              </div>
            )}
            {displayMatch.matchday && (
              <div className="info-item">
                <span className="label">Matchday:</span>
                <span className="value">{displayMatch.matchday}</span>
              </div>
            )}
            {displayMatch.referee && (
              <div className="info-item">
                <span className="label">Referee:</span>
                <span className="value">{displayMatch.referee}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'stats' && (
        <MatchStatistics match={displayMatch} />
      )}

      {activeSection === 'lineups' && (
        <LineupsTab match={displayMatch} />
      )}
      {activeSection === 'live-commentary' && (
      <LiveCommentaryFeed matchId={displayMatch?.id} />
      )}

      {activeSection === 'events' && (
        <div className="match-events">
          <h3>Match Events Timeline</h3>
          {/* Horizontal visual timeline */}
          {timelineData.events.length > 0 ? (
            <div className="timeline-section">
              <div className="timeline-legend">
                <div className="legend-item">
                  {teamLogos.home || (displayMatchRaw?.homeTeam && typeof displayMatchRaw.homeTeam === 'object' && displayMatchRaw.homeTeam.crest) ? (
                    <img src={teamLogos.home || displayMatchRaw.homeTeam.crest} alt={displayMatch.homeTeam} />
                  ) : (
                    <div className="legend-placeholder">{displayMatch.homeTeam?.charAt(0)}</div>
                  )}
                  <span>{displayMatch.homeTeam}</span>
                  <span className="legend-side">(top)</span>
                </div>
                <div className="legend-item">
                  {teamLogos.away || (displayMatchRaw?.awayTeam && typeof displayMatchRaw.awayTeam === 'object' && displayMatchRaw.awayTeam.crest) ? (
                    <img src={teamLogos.away || displayMatchRaw.awayTeam.crest} alt={displayMatch.awayTeam} />
                  ) : (
                    <div className="legend-placeholder">{displayMatch.awayTeam?.charAt(0)}</div>
                  )}
                  <span>{displayMatch.awayTeam}</span>
                  <span className="legend-side">(bottom)</span>
                </div>
              </div>
              <div className="timeline-wrapper">
                <div className="timeline-line" />
                {/* dynamic ticks every 15' with major ticks at 0, 45, end */}
                {(() => {
                  const step = 15;
                  const maxTick = Math.max(90, Math.ceil(timelineData.maxMinute / step) * step);
                  const ticks = [];
                  for (let m = 0; m <= maxTick; m += step) {
                    const left = Math.max(0, Math.min(100, (m / maxTick) * 100));
                    const isMajor = m === 0 || m === 45 || m === maxTick;
                    ticks.push(
                      <div key={`tick-${m}`} className={`timeline-tick ${isMajor ? 'major' : 'minor'}`} style={{ left: `${left}%` }}>
                        {isMajor && <span>{`${m}'`}</span>}
                      </div>
                    );
                  }
                  return ticks;
                })()}
                {/* event markers */}
                {timelineData.events
                  .sort((a, b) => a.minute - b.minute)
                  .map((ev, idx) => {
                    const left = Math.max(0, Math.min(100, (ev.minute / timelineData.maxMinute) * 100));
                    return (
                      <div
                        key={`tl-${idx}-${ev.minute}-${ev.teamName}-${ev.type}`}
                        className={`timeline-marker ${ev.side || ''} ${ev.type}`}
                        style={{ left: `${left}%` }}
                        title={`${ev.label} • ${ev.teamName || ''}${ev.teamName ? ' • ' : ''}${ev.minute}'`}
                      >
                        {ev.crest ? (
                          <img src={ev.crest} alt={ev.teamName || 'Team'} />
                        ) : (
                          <div className="marker-dot" />
                        )}
                        <div className="marker-caret" aria-hidden="true" />
                        <div className="marker-tooltip">
                              {isAdmin && (
                                <button
                                  className={activeSection === 'live-input' ? 'nav-btn active' : 'nav-btn'}
                                  onClick={() => setActiveSection('live-input')}
                                  title="Admin: enter live data for this match"
                                >
                                  Live Input
                                </button>
                              )}
                          <div className="tip-line"><strong>{ev.label}</strong> {ev.minute}'</div>
                          {ev.teamName && <div className="tip-line">{ev.teamName}</div>}
                          {ev.description && <div className="tip-line dim">{ev.description}</div>}
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="timeline-toggle"
                  onClick={() => setShowEventList(s => !s)}
                >
                  {showEventList ? 'Show less' : 'Show more'}
                </button>
              </div>
            </div>
          ) : null}
          {showEventList ? (
            events.length > 0 ? (
              <div className="events-timeline">
                {events
                  .slice()
                  .sort((a,b) => {
                    // Sort by minute then created/order (undefined minutes last)
                    const ma = (a.minute === 0 || a.minute) ? a.minute : (a.time ? parseInt(String(a.time).split(':')[0],10) : undefined);
                    const mb = (b.minute === 0 || b.minute) ? b.minute : (b.time ? parseInt(String(b.time).split(':')[0],10) : undefined);
                    if (ma == null && mb == null) return 0;
                    if (ma == null) return 1;
                    if (mb == null) return -1;
                    return ma - mb;
                  })
                  .map((event, index) => {
                  const t = canonicalEventType(event.type);
                  const label = eventLabel(t);
                  // Derive minute but do NOT force 0 (empty instead) to avoid showing misleading 0'
                  let minute;
                  if (event.minute !== undefined && event.minute !== null && event.minute !== '') {
                    if (typeof event.minute === 'number') minute = event.minute;
                    else {
                      const p = parseInt(String(event.minute), 10);
                      minute = Number.isNaN(p) ? undefined : p;
                    }
                  } else if (event.time) {
                    const m = parseInt(String(event.time).split(':')[0], 10);
                    minute = Number.isNaN(m) ? undefined : m;
                  }
                  const minuteDisplay = (minute == null) ? '' : minute; // show 0'
                  const isSub = t === 'substitution';
                  const playerDisplay = isSub && (event.playerOut || event.playerIn)
                    ? `${event.playerOut || ''}${event.playerOut && event.playerIn ? ' → ' : ''}${event.playerIn || ''}`
                    : (event.player || '');
                  // Derive team name even if only side stored
                  const rawTeam = (event.team || event.teamName || '').toString();
                  const side = /^(home|away)$/i.test(rawTeam)
                    ? rawTeam.toLowerCase()
                    : ((event.teamSide && /^(home|away)$/i.test(event.teamSide)) ? event.teamSide.toLowerCase() : '');
                  const teamName = (/^(home|away)$/i.test(rawTeam) || !rawTeam)
                    ? (side === 'home' ? (displayMatch.homeTeam || 'Home') : side === 'away' ? (displayMatch.awayTeam || 'Away') : rawTeam)
                    : rawTeam;
                  const teamNameLc = (teamName || '').toLowerCase();
                  const homeNameLc = (displayMatch.homeTeam || '').toLowerCase();
                  const awayNameLc = (displayMatch.awayTeam || '').toLowerCase();
                  const resolvedSide = side || (teamNameLc && teamNameLc === homeNameLc ? 'home' : teamNameLc && teamNameLc === awayNameLc ? 'away' : '');
                  const crest = resolvedSide === 'home'
                    ? (teamLogos.home || (displayMatchRaw?.homeTeam && typeof displayMatchRaw.homeTeam === 'object' ? displayMatchRaw.homeTeam.crest : ''))
                    : resolvedSide === 'away'
                      ? (teamLogos.away || (displayMatchRaw?.awayTeam && typeof displayMatchRaw.awayTeam === 'object' ? displayMatchRaw.awayTeam.crest : ''))
                      : '';
                  // Build a smart fallback description
                  const fallbackPieces = [];
                  if (!event.description) {
                    fallbackPieces.push(label);
                    if (teamName) fallbackPieces.push(teamName);
                    if (playerDisplay) fallbackPieces.push(playerDisplay);
                  }
                  const descriptionText = event.description || fallbackPieces.join(' - ');
                  return (
                    <div key={event.id || `event-${index}`} className={`event-item ${t}`}>
                      <div className="event-time" title="Match minute">
                        {crest && (
                          <img className="event-time-crest" src={crest} alt={`${teamName || 'Team'} crest`} />
                        )}
                        <span className="event-minute-text">{minuteDisplay !== '' ? `${minuteDisplay}'` : ''}</span>
                      </div>
                      <div className="event-icon" title={label}>{label}</div>
                      <div className="event-details">
                        <div className="event-description">{descriptionText}</div>
                        {!event.description && playerDisplay && teamName && (
                          <div className="event-meta">{teamName} • {playerDisplay}</div>
                        )}
                        {event.description && playerDisplay && <div className="event-player">{playerDisplay}</div>}
                        {event.description && teamName && <div className="event-team">{teamName}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-events">
                <p>No events available for this match</p>
                {displayMatch.status === 'scheduled' && (
                  <p>Events will appear here once the match starts</p>
                )}
              </div>
            )
          ) : null}
          
          <div className="event-comments">
            <h4>Report Event Error</h4>
            <p>See an error in the event timeline? Let us know!</p>

            <button onClick={() => setShowReportPanel(!showReportPanel)} className="btn btn-secondary">
              {showReportPanel ? 'Hide Report Panel' : 'Report an Issue'}
            </button>
            
            {showReportPanel && (
              <div className="report-panel">
                <h4>Report Event Issue</h4>
                <label>Select Event</label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                >
                  <option value="">-- Choose Event --</option>
                  {events.map(ev => (
                    <option key={ev.id || ev._id} value={ev.id || ev._id}>
                      {ev.description || `Event ${ev.id || ev._id}`}
                    </option>
                  ))}
                </select>
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Brief title of the issue"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                />

                <label>Description</label>
                <textarea
                  placeholder="Describe the issue..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                />

                <div className="report-actions">
                  <button onClick={submitEventReport} className="btn btn-primary">Submit</button>
                  <button onClick={() => setShowReportPanel(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'live-input' && isAdmin && (
        <div className="match-live-input">
          <LiveInput
            isAdmin={isAdmin}
            match={displayMatchRaw || matchDetails || match}
            onBackToMatch={() => setActiveSection('details')}
          />
        </div>
      )}

      {activeSection === 'update' && isAdmin && (
        <div className="event-update">
          <h3>Update Event Timeline</h3>
          <div className="match-meta-form">
            <div className="form-row">
              <input 
                type="text" 
                placeholder="Referee" 
                value={meta.referee}
                onChange={(e) => setMeta(m => ({ ...m, referee: e.target.value }))}
              />
              <input 
                type="text" 
                placeholder="Venue" 
                value={meta.venue}
                onChange={(e) => setMeta(m => ({ ...m, venue: e.target.value }))}
              />
              <button onClick={saveMatchMeta} className="btn btn-primary">Save Match Info</button>
            </div>
          </div>
          <div className="add-event-form">
            <div className="form-row">
              <input 
                type="text" 
                placeholder="Time (e.g., 23:45)" 
                value={newEvent.time}
                onChange={(e) => setNewEvent(ev => ({ ...ev, time: e.target.value }))}
              />
              <select value={newEvent.type} onChange={(e) => setNewEvent(ev => ({ ...ev, type: e.target.value }))}>
                <option value="goal">Goal</option>
                <option value="yellow_card">Yellow Card</option>
                <option value="red_card">Red Card</option>
                <option value="substitution">Substitution</option>
                <option value="match_start">Match Start</option>
                <option value="half_time">Half Time</option>
                <option value="match_end">Match End</option>
                <option value="injury">Injury</option>
                <option value="penalty">Penalty</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-row">
              <select value={newEvent.team} onChange={(e) => setNewEvent(ev => ({ ...ev, team: e.target.value }))}>
                <option value="">Select Team</option>
                <option value={matchDetails?.homeTeam || match?.homeTeam}>Home - {matchDetails?.homeTeam || match?.homeTeam}</option>
                <option value={matchDetails?.awayTeam || match?.awayTeam}>Away - {matchDetails?.awayTeam || match?.awayTeam}</option>
              </select>
              <select value={newEvent.player} onChange={(e) => setNewEvent(ev => ({ ...ev, player: e.target.value }))}>
                <option value="">Select Player</option>
                {(newEvent.team === (matchDetails?.homeTeam || match?.homeTeam) ? playerOptions.home : playerOptions.away).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <textarea 
              placeholder="Event description" 
              rows="3"
              value={newEvent.description}
              onChange={(e) => setNewEvent(ev => ({ ...ev, description: e.target.value }))}
            />
            <button onClick={submitNewEvent} className="btn btn-primary">Add Event</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchViewer;