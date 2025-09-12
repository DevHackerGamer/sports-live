import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';
import '../../styles/MatchViewer.css';

const MatchViewer = ({ match, initialSection = 'details', onBack, onAddToWatchlist }) => {
  const { user } = useUser();
  const isAdmin = (user?.privateMetadata?.type === 'admin');
  const [matchDetails, setMatchDetails] = useState(null);
  const [events, setEvents] = useState([]);
  // removed unused loading state (was only set, not rendered)
  // const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(initialSection); // 'details', 'stats', 'events', 'update'
  const [comment, setComment] = useState('');
  // removed unused teamsList (never read)
  // const [teamsList, setTeamsList] = useState([]);
  const [homeTeamPlayers, setHomeTeamPlayers] = useState([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState([]);
  // Admin form state
  const [newEvent, setNewEvent] = useState({ type: 'goal', time: '', team: '', player: '', description: '' });
  const [meta, setMeta] = useState({ referee: '', venue: '' });

  useEffect(() => {
    if (match) {
      fetchMatchDetails();
    } else {
      setMatchDetails(null);
      setEvents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match]);

  // Only react when the initialSection prop itself changes; do NOT include activeSection
  // in dependencies or user navigation will be immediately overwritten back to the prop value.
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSection]);

  // Header loader removed to avoid layout shifts pushing action buttons

  const fetchMatchDetails = async () => {
    if (!match) return;
    
  // loading indicator removed
    setError('');
    
    try {
      // Try to get detailed match data from API
      try {
        const matchResponse = await apiClient.getMatchById(match.id || match._id);
        setMatchDetails(matchResponse.data);
        setMeta({ referee: matchResponse.data?.referee || '', venue: matchResponse.data?.venue || '' });
        
        // If the API doesn't return any events, fetch them separately
        if (!matchResponse.data.events || matchResponse.data.events.length === 0) {
          const eventsResponse = await apiClient.getMatchEvents(match.id || match._id);
          setEvents(eventsResponse.data || []);
        } else {
          setEvents(matchResponse.data.events || []);
        }
      } catch (apiError) {
        console.warn('Detailed match API failed:', apiError.message);
        // If API fails, use the basic match data we already have
        setMatchDetails(match);
        setEvents([]);
      }

      // Fetch teams list and players to support admin editing
      try {
  const teamsRes = await apiClient.getTeams();
  const teams = teamsRes.data || [];
        // Try to find team IDs by name
        const homeTeamName = (match.homeTeam?.name || match.homeTeam || '').toString();
        const awayTeamName = (match.awayTeam?.name || match.awayTeam || '').toString();
        const homeTeam = teams.find(t => (t.name || '').toLowerCase() === homeTeamName.toLowerCase());
        const awayTeam = teams.find(t => (t.name || '').toLowerCase() === awayTeamName.toLowerCase());
        if (homeTeam?.id || homeTeam?._id) {
          const teamId = homeTeam.id || homeTeam._id;
          try {
            const playersRes = await fetch(`/api/players?teamId=${encodeURIComponent(teamId)}`);
            if (playersRes.ok) {
              const pdata = await playersRes.json();
              setHomeTeamPlayers(pdata.players || []);
            }
          } catch {}
        }
        if (awayTeam?.id || awayTeam?._id) {
          const teamId = awayTeam.id || awayTeam._id;
          try {
            const playersRes = await fetch(`/api/players?teamId=${encodeURIComponent(teamId)}`);
            if (playersRes.ok) {
              const pdata = await playersRes.json();
              setAwayTeamPlayers(pdata.players || []);
            }
          } catch {}
        }
      } catch (e) {
        console.warn('Failed to load teams/players for admin editing:', e.message);
      }
    } catch (err) {
      console.error('Error fetching match details:', err);
      setError(err.message);
    } finally {
      // loading indicator removed
    }
  };

  // removed unused formatTime helper (not referenced in render)

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

  const getEventIcon = (type) => {
    switch(type) {
      case 'goal': return '⚽';
      case 'yellow_card': return '🟨';
      case 'red_card': return '🟥';
      case 'substitution': return '🔁';
      case 'match_start': return '▶️';
      case 'match_end': return '⏹️';
      case 'half_time': return '⏸️';
      case 'injury': return '🤕';
      case 'penalty': return '🎯';
      default: return '🔔';
    }
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (comment.trim()) {
      //TODO: Integrate with backend to submit comment(BAKEND PEOPLE!!)
      console.log('Error report submitted:', comment);
      alert('Thank you for your report. We will review it shortly.');
      setComment('');
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
      competition: displayMatchRaw?.competition?.name || displayMatchRaw?.competition || '',
    };
    const rawStatus = (dm.status || '').toString();
    if (rawStatus === 'IN_PLAY') dm.status = 'live';
    return dm;
  }, [displayMatchRaw]);

  if (!match) {
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

  return (
    <div className="match-viewer">
      <div className="match-viewer-header">
        <h2>Match Overview</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {onAddToWatchlist && match && (
            <button
              onClick={() => onAddToWatchlist(match)}
              className="section-btn"
              title="Add both teams to your favorites"
            >
              + Add to Watchlist
            </button>
          )}
          {onBack && (
            <button onClick={onBack} className="section-btn" title="Back to matches">
              ← Back
            </button>
          )}
        </div>
  {/* Loading indicator intentionally omitted from header to keep actions fixed at top-right */}
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchMatchDetails} className="retry-button">
            Retry
          </button>
        </div>
      )}

      <div className="match-sections-nav">
        <button 
          className={activeSection === 'details' ? 'section-btn active' : 'section-btn'}
          onClick={() => setActiveSection('details')}
        >
          Match Details
        </button>
        <button 
          className={activeSection === 'stats' ? 'section-btn active' : 'section-btn'}
          onClick={() => setActiveSection('stats')}
        >
          Statistics
        </button>
        <button 
          className={activeSection === 'events' ? 'section-btn active' : 'section-btn'}
          onClick={() => setActiveSection('events')}
        >
          Event Timeline
        </button>
        {isAdmin && (
          <button 
            className={activeSection === 'update' ? 'section-btn active' : 'section-btn'}
            onClick={() => setActiveSection('update')}
          >
            Update Events
          </button>
        )}
      </div>

      {activeSection === 'details' && (
        <div className="match-overview">
          <div className="match-teams">
            <div className="team home-team">
              <div className="team-name">{displayMatch.homeTeam}</div>
              <div className="team-score">{displayMatch.homeScore}</div>
            </div>
            
            <div className="match-status">
              {displayMatch.status === 'live' && displayMatch.minute ? (
                <div className="live-minute" title="Current minute">{displayMatch.minute}'</div>
              ) : (
                <div className="match-result">{displayMatch.status.toUpperCase()}</div>
              )}
              {displayMatch.utcDate && (
                <div className="match-date">
                  {formatDate(displayMatch.utcDate)}
                </div>
              )}
            </div>
            
            <div className="team away-team">
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
        <div className="match-statistics">
          <h3>Statistics</h3>
          {displayMatch.statistics ? (
            <div className="stats-grid">
              {displayMatch.statistics.map((stat, index) => (
                <div key={index} className="stat-item">
                  <span className="stat-label">{stat.type}:</span>
                  <span className="stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-stats">
              <p>No statistics available for this match</p>
            </div>
          )}
        </div>
      )}

      {activeSection === 'events' && (
        <div className="match-events">
          <h3>Match Events Timeline</h3>
          {events.length > 0 ? (
            <div className="events-timeline">
              {events.map((event, index) => (
                <div key={event.id || `event-${index}`} className={`event-item ${event.type}`}>
                  <div className="event-time">{event.time || event.minute}'</div>
                  <div className="event-icon">{getEventIcon(event.type)}</div>
                  <div className="event-details">
                    <div className="event-description">{event.description}</div>
                    {event.player && (
                      <div className="event-player">{event.player}</div>
                    )}
                    {event.team && (
                      <div className="event-team">{event.team}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-events">
              <p>No events available for this match</p>
              {displayMatch.status === 'scheduled' && (
                <p>Events will appear here once the match starts</p>
              )}
            </div>
          )}
          
          <div className="event-comments">
            <h4>Report Event Error</h4>
            <p>See an error in the event timeline? Let us know!</p>
            <form onSubmit={handleCommentSubmit}>
              <textarea 
                placeholder="Describe the issue you noticed..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="3"
              />
              <button type="submit">Submit Report</button>
            </form>
          </div>
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
              <button onClick={saveMatchMeta}>Save Match Info</button>
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
            <button onClick={submitNewEvent}>Add Event</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchViewer;