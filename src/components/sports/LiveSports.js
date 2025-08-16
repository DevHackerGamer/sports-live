import React from 'react';
import { useLiveSports } from '../../hooks/useLiveSports';
import '../../styles/LiveSports.css';



const LiveSports = () => {
  // Update time every 10ms
  const [currentTime, setCurrentTime] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10);
    return () => clearInterval(timer);
  }, []);
  const { 
    sportsData, 
    isConnected, 
    error, 
    lastUpdated, 
    refreshData 
  } = useLiveSports();

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      live: { text: 'LIVE', className: 'status-live' },
      final: { text: 'FINAL', className: 'status-final' },
      scheduled: { text: 'SCHEDULED', className: 'status-scheduled' },
      default: { text: 'UPCOMING', className: 'status-default' }
    };
    
    const config = statusConfig[status] || statusConfig.default;
    return <span className={`status-badge ${config.className}`}>{config.text}</span>;
  };

  if (error) {
    return (
      <div className="live-sports error-state">
        <div className="error-content">
          <h3>Connection Error</h3>
          <p>Unable to fetch live sports data</p>
          <button onClick={refreshData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!sportsData) {
    return (
      <div className="live-sports loading-state">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h3>Loading live matches...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="live-sports">
      <div className="sports-header">
        <div className="header-left">
          <h2>Live Football</h2>
          <div className="connection-indicator">
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
            <span className="status-text">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="header-right">
          <div className="current-time">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          {lastUpdated && (
            <div className="last-updated">
              Updated {formatTime(lastUpdated)}
            </div>
          )}
        </div>
      </div>

      {/* Optional context about the fetched window across competitions */}
      {(sportsData.dateFrom || sportsData.dateTo || sportsData.totalMatches) && (
        <div className="fetch-context" style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '8px 0' }}>
          {sportsData.dateFrom && (
            <span className="date-range">Range: {formatShortDate(sportsData.dateFrom)} → {formatShortDate(sportsData.dateTo)}</span>
          )}
          {typeof sportsData.totalMatches === 'number' && (
            <span className="count">Matches: {sportsData.totalMatches}</span>
          )}
          {sportsData.environment && (
            <span className="env">Env: {sportsData.environment}</span>
          )}
        </div>
      )}

      <div className="matches-grid">
        {sportsData.games && sportsData.games.length > 0 ? (
          sportsData.games.map((game) => (
            <div key={game.id} className="match-card">
              <div className="match-header">
                <span className="competition">
                  {game.competition}
                  {game.competitionCode && (
                    <span className="competition-code" style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>
                      [{game.competitionCode}]
                    </span>
                  )}
                </span>
                {getStatusBadge(game.status)}
              </div>
              
              <div className="match-teams">
                <div className="team">
                  <span className="team-name">{game.homeTeam}</span>
                  <span className="team-score">{game.homeScore}</span>
                </div>
                
                <div className="match-separator">vs</div>
                
                <div className="team">
                  <span className="team-name">{game.awayTeam}</span>
                  <span className="team-score">{game.awayScore}</span>
                </div>
              </div>

              <div className="match-details">
                {game.minute && game.status === 'live' && (
                  <span className="match-time">{game.minute}'</span>
                )}
                {game.matchday && (
                  <span className="matchday" style={{ marginLeft: 8 }}>MD {game.matchday}</span>
                )}
                {game.venue && game.venue !== 'TBD' && (
                  <span className="venue">{game.venue}</span>
                )}
                {game.utcDate && game.status === 'scheduled' && (
                  <span className="scheduled-time">
                    {formatDate(game.utcDate)} at {formatTime(new Date(game.utcDate))}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-matches">
            <p>No matches available</p>
            <button onClick={refreshData} className="refresh-btn">
              Refresh
            </button>
          </div>
        )}
      </div>

      <div className="sports-footer">
        <button onClick={refreshData} className="refresh-btn">
          Refresh Data
        </button>
        <div className="data-info">
          <span className="source">Source: {sportsData?.source || 'Unknown'}</span>
          {sportsData?.totalMatches && (
            <span className="count">{sportsData.totalMatches} matches</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveSports;
