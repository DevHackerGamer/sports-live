import React, { useEffect, useState } from 'react';
import { db, ref, onValue } from '../../lib/firebase';
import '../../styles/LiveSports.css';

const LiveSports = () => {
  const [sportsData, setSportsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const matchesRef = ref(db, 'matches');

    const unsubscribe = onValue(
      matchesRef,
      snapshot => {
        const data = snapshot.val() || {};
        setSportsData(data);
        setLoading(false);
      },
      err => {
        console.error('Error reading matches from DB:', err);
        setError('Failed to load matches');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatTime = date =>
    date && date !== 'TBA'
      ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'TBA';

  const formatDate = date =>
    date && date !== 'TBA'
      ? new Date(date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      : 'TBA';

  const getStatusBadge = status => {
    const config = {
      live: ['LIVE', 'status-live'],
      final: ['FINAL', 'status-final'],
      scheduled: ['SCHEDULED', 'status-scheduled'],
      upcoming: ['UPCOMING', 'status-default'],
    };
    const [text, className] = config[status] || config.upcoming;
    return <span className={`status-badge ${className}`} data-testid={`status-${status}`}>{text}</span>;
  };

  if (loading) return <div className="live-sports loading-state" data-testid="loading">Loading matches...</div>;
  if (error) return <div className="live-sports error-state" data-testid="error">{error}</div>;
  if (!sportsData || Object.keys(sportsData).length === 0)
    return <div className="live-sports empty-state" data-testid="empty">No matches available</div>;

  const groupedMatches = Object.values(sportsData).reduce((acc, match) => {
    const league = match.competition || 'Other';
    acc[league] = acc[league] || [];
    acc[league].push(match);
    return acc;
  }, {});

  return (
    <div className="live-sports" data-testid="matches-container">
      {Object.entries(groupedMatches).map(([league, matches]) => (
        <section key={league} className="league-section" data-testid={`league-${league}`}>
          <h2 className="league-title">{league}</h2>
          <div className="matches-grid">
            {matches.map(match => (
              <div
                key={match.id}
                className={`match-card ${match.status === 'live' ? 'live-highlight' : ''}`}
                data-testid={`match-${match.id}`}
              >
                <div className="match-header">
                  <span className="competition">{match.competition || 'TBA'}</span>
                  {getStatusBadge(match.status)}
                </div>
                <div className="match-teams">
                  <div className="team">
                    <span className="team-name">{match.homeTeam || 'TBA'}</span>
                    <span className="team-score">
                      {match.homeScore !== 'TBA' ? match.homeScore : '–'}
                    </span>
                  </div>
                  <div className="match-separator">vs</div>
                  <div className="team">
                    <span className="team-name">{match.awayTeam || 'TBA'}</span>
                    <span className="team-score">
                      {match.awayScore !== 'TBA' ? match.awayScore : '–'}
                    </span>
                  </div>
                </div>
                <div className="match-details">
                  {match.minute && match.minute !== 'TBA' && match.status === 'live' && (
                    <span className="match-time">{match.minute}'</span>
                  )}
                  {match.matchday && match.matchday !== 'TBA' && (
                    <span className="matchday">MD {match.matchday}</span>
                  )}
                  {match.venue && match.venue !== 'TBD' && match.venue !== 'TBA' && (
                    <span className="venue">{match.venue}</span>
                  )}
                  {match.utcDate && match.utcDate !== 'TBA' && match.status !== 'live' && (
                    <span className="scheduled-time">
                      {formatDate(match.utcDate)} at {formatTime(match.utcDate)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default LiveSports;
