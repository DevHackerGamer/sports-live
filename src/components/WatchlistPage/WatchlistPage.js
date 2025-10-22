import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';
import { getLeagueName } from '../../lib/leagueNames';
import '../../styles/WatchlistPage.css';

const normalize = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
};

const WatchlistPage = ({ onMatchSelect, onTeamSelect }) => {
  const { user } = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [teamCrests, setTeamCrests] = useState({});

  const fetchWatchlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.getUserWatchlist(user.id);
      setItems(res.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchWatchlist();
  }, [user, fetchWatchlist]);

  // Fetch team crests for watchlist items
  useEffect(() => {
    let cancelled = false;
    
    const stripCommonPrefixes = (name) => {
      if (!name) return '';
      return name
        .replace(/\b(fc|sc|rc|ac|cd|sv|us|ss|cf|cs)\b/gi, '')
        .replace(/^[\s\d\.-]+/, '')  
        .trim();
    };

    const findCrest = (teamName, normalizedTeams) => {
      if (!teamName) return '/placeholder.png';
      const norm = normalize(stripCommonPrefixes(teamName));

      if (normalizedTeams[norm]) return normalizedTeams[norm];
      
      const partial = Object.keys(normalizedTeams).find(k => norm.includes(k) || k.includes(norm));
      if (partial) return normalizedTeams[partial];

      const words = norm.split(' ').filter(Boolean);
      for (let i = words.length - 1; i >= 0; i--) {
        const lastWordMatch = Object.keys(normalizedTeams).find(k => k.includes(words[i]));
        if (lastWordMatch) return normalizedTeams[lastWordMatch];
      }

      const sortedWords = words.sort((a, b) => b.length - a.length);
      for (const w of sortedWords) {
        const longestWordMatch = Object.keys(normalizedTeams).find(k => k.includes(w));
        if (longestWordMatch) return normalizedTeams[longestWordMatch];
      }

      return '/placeholder.png';
    };

    (async () => {
      try {
        const teamsRes = await apiClient.getTeams();
        const teams = teamsRes.data || [];

        if (cancelled) return;

        const normalizedTeams = {};
        teams.forEach(t => {
          const norm = normalize(stripCommonPrefixes(t.name));
          normalizedTeams[norm] = t.crest || t.logo || '/placeholder.png';
        });

        const crestMap = {};
        items.forEach(item => {
          const homeName = item.homeTeam;
          const awayName = item.awayTeam;
          
          if (homeName) {
            crestMap[homeName] = findCrest(homeName, normalizedTeams);
            crestMap[normalize(homeName)] = findCrest(homeName, normalizedTeams);
          }
          if (awayName) {
            crestMap[awayName] = findCrest(awayName, normalizedTeams);
            crestMap[normalize(awayName)] = findCrest(awayName, normalizedTeams);
          }
        });

        setTeamCrests(crestMap);
      } catch (err) {
        console.error('Failed to fetch team crests', err);
      }
    })();

    return () => { cancelled = true; };
  }, [items]);

  const handleMatchClick = (entry) => {
    const matchData = {
      id: entry.matchId,
      homeTeam: { 
        name: entry.homeTeam,
        crest: teamCrests[entry.homeTeam] || teamCrests[normalize(entry.homeTeam)]
      },
      awayTeam: { 
        name: entry.awayTeam,
        crest: teamCrests[entry.awayTeam] || teamCrests[normalize(entry.awayTeam)]
      },
      competition: entry.competition,
      utcDate: entry.utcDate,
      status: entry.status || 'scheduled',
      homeScore: entry.homeScore,
      awayScore: entry.awayScore
    };
    if (onMatchSelect) onMatchSelect(matchData);
  };

  const handleTeamClick = (teamName, event) => {
    event.stopPropagation();
    if (onTeamSelect && teamName) {
      const teamData = {
        name: teamName,
        crest: teamCrests[teamName] || teamCrests[normalize(teamName)]
      };
      onTeamSelect(teamData);
    }
  };

  const handleRemove = async (entry, event) => {
    event.stopPropagation();
    if (!user) return;
    try {
      setRemovingId(entry.matchId);
      await apiClient.removeUserMatch(user.id, entry.matchId);
      setItems((prev) => prev.filter((i) => i.matchId !== entry.matchId));
    } catch (e) {
      alert('Failed to remove from watchlist');
    } finally {
      setRemovingId(null);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
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

  if (!user) {
    return (
      <div className="wl-container">
        <div className="wl-empty">
          <h3>Sign in required</h3>
          <p>Please sign in to view your watchlist.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wl-container">
        <div className="wl-loading">
          <div className="wl-spinner" />
          <div>Loading watchlist…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wl-container">
        <div className="wl-error">
          <h3>Could not load watchlist</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wl-container">
      <div className="wl-header">
        <h2>Your Watchlist</h2>
      </div>
      
      {items.length === 0 ? (
        <div className="wl-empty">
          <p>No matches in your watchlist yet.</p>
          <p>Add matches from the Live Matches page to see them here!</p>
        </div>
      ) : (
        <div className="wl-matches-grid">
          {items.map((item) => {
            const homeCrest = teamCrests[item.homeTeam] || teamCrests[normalize(item.homeTeam)] || '/placeholder.png';
            const awayCrest = teamCrests[item.awayTeam] || teamCrests[normalize(item.awayTeam)] || '/placeholder.png';
            
            return (
              <div
                key={`${item.userId}-${item.matchId}`}
                className="wl-match-card wl-clickable"
                onClick={() => handleMatchClick(item)}
              >
                <div className="wl-match-header">
                  <div className="wl-comp-left">
                    <span className="wl-competition">
                      {getLeagueName(item.competitionCode || item.competition) || '—'}
                    </span>
                  </div>
                  <div className="wl-comp-right">
                    <span className="wl-status-badge wl-status-scheduled">
                      WATCHLIST
                    </span>
                  </div>
                </div>

                <div className="wl-match-teams">
                  <div className="wl-team">
                    <img 
                      className="wl-team-crest wl-clickable" 
                      alt="home crest" 
                      src={homeCrest} 
                      onClick={(e) => handleTeamClick(item.homeTeam, e)}
                    />
                    <span 
                      className="wl-team-name wl-clickable" 
                      onClick={(e) => handleTeamClick(item.homeTeam, e)}
                    >
                      {item.homeTeam || 'Home'}
                    </span>
                    <span className="wl-team-score">
                      {item.homeScore || '-'}
                    </span>
                  </div>

                  <div className="wl-match-separator">vs</div>

                  <div className="wl-team">
                    <img 
                      className="wl-team-crest wl-clickable" 
                      alt="away crest" 
                      src={awayCrest} 
                      onClick={(e) => handleTeamClick(item.awayTeam, e)}
                    />
                    <span 
                      className="wl-team-name wl-clickable" 
                      onClick={(e) => handleTeamClick(item.awayTeam, e)}
                    >
                      {item.awayTeam || 'Away'}
                    </span>
                    <span className="wl-team-score">
                      {item.awayScore || '-'}
                    </span>
                  </div>
                </div>
                
                <div className="wl-card-divider" aria-hidden="true"></div>
                
                <div className="wl-match-details">
                  <div className="wl-meta-left">
                    {item.utcDate && (
                      <span className="wl-scheduled-time">
                        {formatDate(item.utcDate)} • {formatTime(item.utcDate)}
                      </span>
                    )}
                  </div>
                  <div className="wl-meta-right">
                    <button 
                      className="wl-remove-btn"
                      disabled={removingId === item.matchId}
                      onClick={(e) => handleRemove(item, e)}
                      title="Remove from watchlist"
                    >
                      {removingId === item.matchId ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WatchlistPage;