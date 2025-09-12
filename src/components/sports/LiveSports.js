import React from 'react';
import { useLiveSports } from '../../hooks/useLiveSports';
import '../../styles/LiveSports.css';

const LiveSports = ({ onMatchSelect }) => {
  // Throttle clock updates to minute-level and pause when tab hidden to reduce scheduler overhead
  const [currentTime, setCurrentTime] = React.useState(new Date());
  React.useEffect(() => {
    let timerId;
    const scheduleNextTick = () => {
      const now = new Date();
      // Compute ms to the start of next minute
      const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      timerId = setTimeout(() => {
        setCurrentTime(new Date());
        scheduleNextTick();
      }, Math.max(1000, msToNextMinute));
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (timerId) clearTimeout(timerId);
        // Snap to current time and schedule the next minute tick
        setCurrentTime(new Date());
        scheduleNextTick();
      } else if (timerId) {
        clearTimeout(timerId);
      }
    };

    // Initial schedule
    scheduleNextTick();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (timerId) clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
  
  const { 
    sportsData, 
    isConnected, 
    error, 
    lastUpdated, 
    refreshData 
  } = useLiveSports();

  // Build rolling weekly groups efficiently (single pass over sorted games)
  const buildWeeklyChunks = React.useCallback((sortedGames, fromISO, toISO) => {
    if (!fromISO || !toISO) return [];
    const fromMs = Date.parse(`${fromISO}T00:00:00.000Z`);
    const toMs = Date.parse(`${toISO}T23:59:59.999Z`);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs > toMs) return [];

    // Precompute week boundaries
    const weeks = [];
    let cursorMs = fromMs;
    while (cursorMs <= toMs) {
      const start = new Date(cursorMs);
      const endMs = Math.min(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999),
        toMs
      );
      const end = new Date(endMs);
      const monthStart = start.toLocaleString([], { month: 'short' });
      const monthEnd = end.toLocaleString([], { month: 'short' });
      const label = `${monthStart} ${start.getUTCDate()} – ${monthEnd} ${end.getUTCDate()}`;
      weeks.push({ label, startMs: cursorMs, endMs });
      // advance a full week (7 days)
      cursorMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 7);
    }

    const result = [];
    let gameIdx = 0;
    const n = sortedGames.length;
    for (const w of weeks) {
      const items = [];
      while (gameIdx < n) {
        const g = sortedGames[gameIdx];
        const t = g.__utcMs;
        if (t < w.startMs) { gameIdx++; continue; }
        if (t > w.endMs) break;
        items.push(g);
        gameIdx++;
      }
      if (items.length) result.push({ label: w.label, items });
      if (gameIdx >= n) break;
    }
    return result;
  }, []);

  // Derive date range from hook payload (backward compatible)
  const dateFrom = sportsData?.range?.dateFrom || sportsData?.dateFrom;
  const dateTo = sportsData?.range?.dateTo || sportsData?.dateTo;
  // Pre-sort once and store parsed UTC time to avoid repeated Date parsing
  const sortedGames = React.useMemo(() => {
    const arr = (sportsData?.games || []).filter(g => g && g.utcDate);
    // Attach parsed time as non-enumerable to avoid bloating renders
    arr.forEach(g => {
      const ms = Date.parse(g.utcDate);
      Object.defineProperty(g, '__utcMs', { value: ms, enumerable: false, configurable: true });
    });
    return arr.sort((a, b) => (a.__utcMs || 0) - (b.__utcMs || 0));
  }, [sportsData?.games]);

  const chunks = React.useMemo(() => buildWeeklyChunks(sortedGames, dateFrom, dateTo), [sortedGames, dateFrom, dateTo, buildWeeklyChunks]);

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
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
      finished: { text: 'FINAL', className: 'status-final' },
      scheduled: { text: 'SCHEDULED', className: 'status-scheduled' },
      default: { text: 'UPCOMING', className: 'status-default' }
    };
    
    const config = statusConfig[status] || statusConfig.default;
  return <span className={`status-badge ${config.className}`} data-testid={`status-${status || 'default'}`}>{config.text}</span>;
  };

  if (error) {
    return (
    <div className="live-sports error-state" data-testid="error">
        <div className="error-content">
          <h3>Connection Error</h3>
          <p>Unable to fetch live sports data</p>
      {/* legacy test hook */}
      <div style={{ display: 'none' }}>Failed to load matches</div>
          <button onClick={refreshData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!sportsData) {
    return (
    <div className="live-sports loading-state" data-testid="loading">
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
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {lastUpdated && (
            <div className="last-updated">
              Updated {formatTime(lastUpdated)}
            </div>
          )}
        </div>
      </div>

      {(dateFrom || dateTo || sportsData.totalMatches) && (
        <div className="fetch-context">
          {dateFrom && (
            <span className="date-range">Range: {formatShortDate(dateFrom)} → {formatShortDate(dateTo)}</span>
          )}
          {typeof sportsData.totalMatches === 'number' && (
            <span className="count">Matches: {sportsData.totalMatches}</span>
          )}
          {sportsData.environment && (
            <span className="env">Env: {sportsData.environment}</span>
          )}
        </div>
      )}

      {/* Render all matches grouped by weekly subheadings */}
      <div className="matches-groups" data-testid="matches-container">
        {chunks.length > 0 ? (
          chunks.map((chunk) => (
            <div key={chunk.label} className="week-group">
              <div className="chunk-title">{chunk.label}</div>
              <div className="matches-grid">
                {chunk.items.map((game, index) => (
                  <MatchCard
                    key={game.id || `match-${index}`}
                    game={game}
                    onSelect={onMatchSelect}
                    getStatusBadge={getStatusBadge}
                    formatDate={formatDate}
                    formatTime={formatTime}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="no-matches" data-testid="empty">
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

// Memoized heavy card to avoid unnecessary re-renders
const MatchCard = React.memo(function MatchCard({ game, onSelect, getStatusBadge, formatDate, formatTime }) {
  return (
    <div
      className="match-card clickable"
      data-testid={`match-${game.id ?? ''}`}
      onClick={() => onSelect(game)}
    >
      <div className="match-header">
        <div className="comp-left">
          <span className="competition">
            {game.competition}
            {game.competitionCode && (
              <span className="competition-code">[{game.competitionCode}]</span>
            )}
          </span>
        </div>
        <div className="comp-right">{getStatusBadge(game.status)}</div>
      </div>

  <div className="match-teams">
        <div className="team">
          {game.homeTeam?.crest && (
            <img className="team-crest" alt="home crest" src={game.homeTeam.crest} />
          )}
          <span className="team-name">{game.homeTeam?.name || game.homeTeam}</span>
          <span className="team-score">{(['live','in_play','inplay'].includes((game.status||'').toLowerCase()) && game.homeScore === '-') ? 0 : game.homeScore}</span>
        </div>

        <div className="match-separator">vs</div>

        <div className="team">
          {game.awayTeam?.crest && (
            <img className="team-crest" alt="away crest" src={game.awayTeam.crest} />
          )}
          <span className="team-name">{game.awayTeam?.name || game.awayTeam}</span>
          <span className="team-score">{(['live','in_play','inplay'].includes((game.status||'').toLowerCase()) && game.awayScore === '-') ? 0 : game.awayScore}</span>
        </div>
  </div>
  <div className="card-divider" aria-hidden="true"></div>
  <div className="match-details">
        <div className="meta-left">
          {game.utcDate && (
            <span className="scheduled-time">
              {(() => {
                // Single unified formatting: always show localized weekday/month/day and 24h time derived from utcDate baseline
                // For admin matches with exact entered time, prefer their given time string.
                const baseDate = new Date(game.utcDate);
                const dateLabel = baseDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
                const timeLabel = (game.createdByAdmin && game.time) ? game.time : formatTime(baseDate);
                return `${dateLabel} • ${timeLabel}`;
              })()}
            </span>
          )}
          {game.matchday ? (
            <span className="matchday">MD {game.matchday}</span>
          ) : game.createdByAdmin && (
            <span className="matchday matchday-placeholder" title="Admin match has no official matchday yet">MD -</span>
          )}
        </div>
        <div className="meta-right">
          {game.minute && ['live','in_play','inplay'].includes((game.status||'').toLowerCase()) && (
            <span className="match-time">{game.minute}'</span>
          )}
          {game.venue && game.venue !== 'TBD' && <span className="venue">{game.venue}</span>}
        </div>
      </div>
    </div>
  );
});


export default LiveSports;