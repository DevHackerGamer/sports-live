import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';
import { useLiveSports } from '../../hooks/useLiveSports';
import TeamInfo from '../TeamInfo/TeamInfo';
import '../../styles/LiveSports.css';

const LiveSports = ({ onMatchSelect }) => {
  const { user } = useUser();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [watchlistIds, setWatchlistIds] = useState(new Set());
  
  useEffect(() => {
    let timerId;
    const scheduleNextTick = () => {
      const now = new Date();
      const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      timerId = setTimeout(() => {
        setCurrentTime(new Date());
        scheduleNextTick();
      }, Math.max(1000, msToNextMinute));
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (timerId) clearTimeout(timerId);
        setCurrentTime(new Date());
        scheduleNextTick();
      } else if (timerId) {
        clearTimeout(timerId);
      }
    };

    scheduleNextTick();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (timerId) clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
  
  // Load user's watchlist when user changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setWatchlistIds(new Set()); return; }
      try {
        const res = await apiClient.getUserWatchlist(user.id);
        const ids = new Set((res.data || []).map(i => String(i.matchId)));
        if (!cancelled) setWatchlistIds(ids);
      } catch (e) {
        if (!cancelled) setWatchlistIds(new Set());
      }
    })();
    return () => { cancelled = true; };
  }, [user]);
  
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
   // Group games by date and then by league (FotMob-style)
const groupByDateAndLeague = React.useCallback((games) => {
  if (!Array.isArray(games) || games.length === 0) return [];

  const groups = {};
  games.forEach((g) => {
    const dateKey = new Date(g.utcDate).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const league = g.competition || 'Other Competitions';
    if (!groups[dateKey]) groups[dateKey] = {};
    if (!groups[dateKey][league]) groups[dateKey][league] = [];
    groups[dateKey][league].push(g);
  });

  return Object.entries(groups).map(([date, leagues]) => ({
    date,
    leagues: Object.entries(leagues).map(([league, items]) => ({
      league,
      items: items.sort((a, b) => (a.__utcMs || 0) - (b.__utcMs || 0)),
    })),
  }));
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
      live: { text: 'LIVE', className: 'ls-status-live' },
      paused: { text: 'PAUSED', className: 'ls-status-paused' },
      final: { text: 'FINAL', className: 'ls-status-final' },
      finished: { text: 'FINAL', className: 'ls-status-final' },
      scheduled: { text: 'SCHEDULED', className: 'ls-status-scheduled' },
      default: { text: 'UPCOMING', className: 'ls-status-default' }
    };
    
    const config = statusConfig[status] || statusConfig.default;
    return <span className={`ls-status-badge ${config.className}`} data-testid={`status-${status || 'default'}`}>{config.text}</span>;
  };

  // Render TeamInfo if a team is selected
  if (selectedTeam) {
    return <TeamInfo team={selectedTeam} onBack={() => setSelectedTeam(null)} />;
  }

  if (error) {
    return (
      <div className="ls-live-sports ls-error-state" data-testid="error">
        <div className="ls-error-content">
          <h3>Connection Error</h3>
          <p>Unable to fetch live sports data</p>
          <div style={{ display: 'none' }}>Failed to load matches</div>
          <button onClick={refreshData} className="ls-retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!sportsData) {
    return (
      <div className="ls-live-sports ls-loading-state" data-testid="loading">
        <div className="ls-loading-content">
          <div className="ls-loading-spinner"></div>
          <h3>Loading live matches...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="ls-live-sports">
      <div className="ls-sports-header">
        <div className="ls-header-left">
          <h2>Live Football</h2>
          <div className="ls-connection-indicator">
            <div className={`ls-status-dot ${isConnected ? 'ls-connected' : 'ls-disconnected'}`}></div>
            <span className="ls-status-text">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="ls-header-right">
          <div className="ls-current-time">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {lastUpdated && (
            <div className="ls-last-updated">
              Updated {formatTime(lastUpdated)}
            </div>
          )}
        </div>
      </div>

      {(dateFrom || dateTo || sportsData.totalMatches) && (
        <div className="ls-fetch-context">
          {dateFrom && (
            <span className="ls-date-range">Range: {formatShortDate(dateFrom)} → {formatShortDate(dateTo)}</span>
          )}
          {typeof sportsData.totalMatches === 'number' && (
            <span className="ls-count">Matches: {sportsData.totalMatches}</span>
          )}
          {sportsData.environment && (
            <span className="ls-env">Env: {sportsData.environment}</span>
          )}
        </div>
      )}

      {/* Render all matches grouped by week, date, and league */}
<div className="ls-matches-groups" data-testid="matches-container">
  {chunks.length > 0 ? (
    chunks.map((chunk) => {
      const groupedDays = groupByDateAndLeague(chunk.items);
      return (
        <div key={chunk.label} className="ls-week-group">
          <div className="ls-chunk-title">{chunk.label}</div>

          {groupedDays.map((day) => (
            <div key={day.date} className="ls-day-group">
              <h3 className="ls-day-header">{day.date}</h3>

              {day.leagues.map((lg) => (
                <div key={lg.league} className="ls-league-group">
                  <h4 className="ls-league-header">{lg.league}</h4>
                  <div className="ls-matches-grid">
                    {lg.items.map((game, index) => (
                      <MatchCard
                        key={game.id || `match-${index}`}
                        game={game}
                        onSelect={onMatchSelect}
                        onTeamSelect={setSelectedTeam}
                        getStatusBadge={getStatusBadge}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        inWatchlist={watchlistIds.has(String(game.id ?? game._id ?? game.matchId))}
                        onWatchlistAdded={(mid) => {
                          setWatchlistIds(prev => {
                            const next = new Set(prev);
                            next.add(String(mid));
                            return next;
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    })
  ) : (
    <div className="ls-no-matches" data-testid="empty">
      <p>No matches available</p>
      <button onClick={refreshData} className="ls-refresh-btn">
        Refresh
      </button>
    </div>
  )}
</div>


      <div className="ls-sports-footer">
        <button onClick={refreshData} className="ls-refresh-btn">
          Refresh Data
        </button>
        <div className="ls-data-info">
          <span className="ls-source">Source: {sportsData?.source || 'Unknown'}</span>
          {sportsData?.totalMatches && (
            <span className="ls-count">{sportsData.totalMatches} matches</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoized heavy card to avoid unnecessary re-renders
const MatchCard = React.memo(function MatchCard({ 
  game, 
  onSelect, 
  onTeamSelect,
  getStatusBadge, 
  formatDate, 
  formatTime,
  inWatchlist,
  onWatchlistAdded,
}) {
  const { user } = useUser();
  const [homeScore, setHomeScore] = useState(game.homeScore);
  const [awayScore, setAwayScore] = useState(game.awayScore);
  const [showGoalAnimation, setShowGoalAnimation] = useState(false);
  const [scoringTeam, setScoringTeam] = useState(null);
  const [scoreUpdating, setScoreUpdating] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(!!inWatchlist);

  // Keep local state in sync with parent-provided watchlist status
  useEffect(() => {
    setAdded(!!inWatchlist);
  }, [inWatchlist]);

  // Derive minute if live and missing
  let displayMinute = game.minute;
  const statusKey = (game.status || '').toLowerCase();
  
  useEffect(() => {
    // Check if score has changed
    if (game.homeScore !== homeScore || game.awayScore !== awayScore) {
      // Determine which team scored
      const teamScored = game.homeScore > homeScore ? 'home' : 'away';
      setScoringTeam(teamScored);
      
      // Show goal animation
      setShowGoalAnimation(true);
      setScoreUpdating(true);
      
      // After animation completes, update score and hide animation
      const animationTimer = setTimeout(() => {
        setHomeScore(game.homeScore);
        setAwayScore(game.awayScore);
        setShowGoalAnimation(false);
      }, 1000);
      
      const scoreUpdateTimer = setTimeout(() => {
        setScoreUpdating(false);
      }, 1500);
      
      return () => {
        clearTimeout(animationTimer);
        clearTimeout(scoreUpdateTimer);
      };
    }
  }, [game.homeScore, game.awayScore, homeScore, awayScore]);

  const handleTeamClick = (team, event) => {
    event.stopPropagation(); // Prevent triggering the match select
    if (team) {
      onTeamSelect(team);
    }
  };

  if ((statusKey === 'live' || statusKey === 'in_play' || statusKey === 'inplay' || statusKey === 'paused') && (displayMinute == null || displayMinute === '')) {
    // Try to compute from utcDate
    if (game.utcDate) {
      const startMs = Date.parse(game.utcDate);
      if (!isNaN(startMs)) {
        const diff = Math.floor((Date.now() - startMs) / 60000);
        if (diff >= 0 && diff <= 130) displayMinute = diff;
      }
    }
  }

  return (
    <div
      className="ls-match-card ls-clickable"
      data-testid={`match-${game.id ?? ''}`}
      onClick={() => onSelect(game)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover action: Add to Watchlist */}
      {hovered && user && !added && (
        <button
          className="ls-watchlist-btn"
          disabled={adding}
          title="Add match to your watchlist"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              setAdding(true);
              await apiClient.addUserMatch(user.id, game);
              setAdded(true);
              const mid = game.id ?? game._id ?? game.matchId;
              if (onWatchlistAdded && mid != null) onWatchlistAdded(mid);
            } catch (err) {
              console.error('Add to watchlist failed', err);
              alert('Failed to add to watchlist');
            } finally {
              setAdding(false);
            }
          }}
        >
          {adding ? 'Adding…' : '+ Watchlist'}
        </button>
      )}
      <div className="ls-match-header">
        <div className="ls-comp-left">
          <span className="ls-competition">
            {game.competition}
            {game.competitionCode && (
              <span className="ls-competition-code">[{game.competitionCode}]</span>
            )}
          </span>
        </div>
        <div className="ls-comp-right">{getStatusBadge(game.status)}</div>
      </div>

      <div className="ls-match-teams">
        <div className={`ls-team ${scoringTeam === 'home' ? 'ls-team-scoring' : ''}`}>
          {game.homeTeam?.crest && (
            <img 
              className="ls-team-crest ls-clickable" 
              alt="home crest" 
              src={game.homeTeam.crest} 
              onClick={(e) => handleTeamClick(game.homeTeam, e)}
            />
          )}
          <span className="ls-team-name">{game.homeTeam?.name || game.homeTeam}</span>
          {showGoalAnimation && scoringTeam === 'home' && (
            <div className="ls-goal-animation">⚽</div>
          )}
          <span className={`ls-team-score ${scoreUpdating && scoringTeam === 'home' ? 'ls-score-updating' : ''}`}>
            {(['live','in_play','inplay','paused'].includes((game.status||'').toLowerCase()) && homeScore === '-') ? 0 : homeScore}
          </span>
        </div>

        <div className="ls-match-separator">vs</div>

        <div className={`ls-team ${scoringTeam === 'away' ? 'ls-team-scoring' : ''}`}>
          {game.awayTeam?.crest && (
            <img 
              className="ls-team-crest ls-clickable" 
              alt="away crest" 
              src={game.awayTeam.crest} 
              onClick={(e) => handleTeamClick(game.awayTeam, e)}
            />
          )}
          <span className="ls-team-name">{game.awayTeam?.name || game.awayTeam}</span>
          {showGoalAnimation && scoringTeam === 'away' && (
            <div className="ls-goal-animation">⚽</div>
          )}
          <span className={`ls-team-score ${scoreUpdating && scoringTeam === 'away' ? 'ls-score-updating' : ''}`}>
            {(['live','in_play','inplay','paused'].includes((game.status||'').toLowerCase()) && awayScore === '-') ? 0 : awayScore}
          </span>
        </div>
      </div>
      
      <div className="ls-card-divider" aria-hidden="true"></div>
      
      <div className="ls-match-details">
        <div className="ls-meta-left">
          {game.utcDate && (
            <span className="ls-scheduled-time">
              {(() => {
                const baseDate = new Date(game.utcDate);
                const dateLabel = baseDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
                const timeLabel = (game.createdByAdmin && game.time) ? game.time : formatTime(baseDate);
                return `${dateLabel} • ${timeLabel}`;
              })()}
            </span>
          )}
          {game.matchday ? (
            <span className="ls-matchday">MD {game.matchday}</span>
          ) : game.createdByAdmin && (
            <span className="ls-matchday ls-matchday-placeholder" title="Admin match has no official matchday yet">MD -</span>
          )}
        </div>
        <div className="ls-meta-right">
          {(['live','in_play','inplay','paused'].includes(statusKey) && displayMinute != null && displayMinute !== '') && (
            <span className="ls-match-time">{displayMinute}'</span>
          )}
          {game.venue && game.venue !== 'TBD' && <span className="ls-venue">{game.venue}</span>}
        </div>
      </div>
    </div>
  );
});

export default LiveSports;