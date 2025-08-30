import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import '../../styles/MatchViewer.css';

const MatchViewer = ({ match }) => {
  const [matchDetails, setMatchDetails] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('details'); // 'details', 'stats', 'events', 'update'
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (match) {
      fetchMatchDetails();
    } else {
      // If no match is passed, show empty state
      setMatchDetails(null);
      setEvents([]);
    }
  }, [match]);

  const fetchMatchDetails = async () => {
    if (!match) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Try to get detailed match data from API
      try {
        const matchResponse = await apiClient.getMatchById(match.id || match._id);
        setMatchDetails(matchResponse.data);
        
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
    } catch (err) {
      console.error('Error fetching match details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  const displayMatch = matchDetails || match;

  return (
    <div className="match-viewer">
      <div className="match-viewer-header">
        <h2>Match Overview</h2>
        {loading && (
          <div className="header-loading">
            <div className="loading-spinner small"></div>
            <span>Loading...</span>
          </div>
        )}
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
        <button 
          className={activeSection === 'update' ? 'section-btn active' : 'section-btn'}
          onClick={() => setActiveSection('update')}
        >
          Update Events
        </button>
      </div>

      {activeSection === 'details' && (
        <div className="match-overview">
          <div className="match-teams">
            <div className="team home-team">
              <div className="team-name">{displayMatch.homeTeam}</div>
              <div className="team-score">{displayMatch.homeScore}</div>
            </div>
            
            <div className="match-status">
              {displayMatch.status === 'live' && displayMatch.minute && (
                <div className="live-minute">{displayMatch.minute}'</div>
              )}
              <div className="match-result">
                {displayMatch.status.toUpperCase()}
              </div>
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

      {activeSection === 'update' && (
        <div className="event-update">
          <h3>Update Event Timeline</h3>
          <div className="add-event-form">
            <div className="form-row">
              <input 
                type="text" 
                placeholder="Time (e.g., 23:45)" 
              />
              <select>
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
              <input 
                type="text" 
                placeholder="Team" 
              />
              <input 
                type="text" 
                placeholder="Player" 
              />
            </div>
            <textarea 
              placeholder="Event description" 
              rows="3"
            />
            <button>Add Event</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchViewer;