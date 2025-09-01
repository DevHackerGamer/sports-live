import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';
import '../../styles/FavoritesPanel.css';
import '../../styles/LiveSports.css';

const FavoritesPanel = ({ onMatchSelect }) => {
  const { user } = useUser();
  const [favorites, setFavorites] = useState([]); // store team names
  const [matches, setMatches] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTeam, setNewTeam] = useState('');
  const [isValidInput, setIsValidInput] = useState(false);

  // Helper: normalize strings for matching (case-insensitive, remove punctuation and trailing FC)
  const normalize = (s) => (s || '')
    .toString()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/fc$/, '');

  const displayName = (team) => {
    if (!team) return 'Unknown';
    if (typeof team === 'string') return team;
    return team.name || team.shortName || team.tla || 'Unknown';
  };

  const displayCrest = (team) => {
    if (!team || typeof team === 'string') return null;
    return team.crest || null;
  };

  const findTeamRecord = (name) => {
    const target = normalize(name);
    return allTeams.find(t => {
      const n = typeof t === 'string' ? t : (t.name || t.shortName || t.tla || '');
      return normalize(n) === target;
    });
  };

  const teamMatchesFavorite = (team, favName, favRecord) => {
    if (!team && !favName) return false;
    const nameCandidates = [];
    if (typeof team === 'string') nameCandidates.push(team);
    if (team && typeof team === 'object') {
      if (team.name) nameCandidates.push(team.name);
      if (team.shortName) nameCandidates.push(team.shortName);
      if (team.tla) nameCandidates.push(team.tla);
    }
    const favCandidates = [favName];
    if (favRecord && typeof favRecord === 'object') {
      if (favRecord.name) favCandidates.push(favRecord.name);
      if (favRecord.shortName) favCandidates.push(favRecord.shortName);
      if (favRecord.tla) favCandidates.push(favRecord.tla);
    }
    const favSet = new Set(favCandidates.map(normalize));
    return nameCandidates.some(n => favSet.has(normalize(n)));
  };

  // Fetch upcoming matches using our new MongoDB API
  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Try MongoDB API first
      try {
        // Request a wider window (21 days) so favorites with upcoming games appear
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 20, 23, 59, 59, 999));
        const toISODate = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
        const matchesResponse = await apiClient.getMatchesByDate(toISODate(start), toISODate(end), 1000);
        const transformed = (matchesResponse.data || []).map(match => ({
          ...match,
          // preserve team objects so we can match by name/shortName/tla and render crests
          homeTeam: match.homeTeam || match.homeTeamName || match.home || match.homeTeamId || match.home_team || match.homeTeamObject,
          awayTeam: match.awayTeam || match.awayTeamName || match.away || match.awayTeamId || match.away_team || match.awayTeamObject,
          competition: match.competition?.name || match.competition || 'Unknown',
          competitionCode: match.competition?.code || match.competitionCode
        }));
        setMatches(transformed);
      } catch (apiError) {
        console.warn('MongoDB API failed, trying fallback:', apiError.message);
        // Fallback to sports-data API
        try {
          const res = await fetch('/api/sports-data?limit=200&range=30');
          if (!res.ok) throw new Error('Failed to fetch matches');
          const data = await res.json();
          const transformed = (data.games || []).map(match => ({
            ...match,
            homeTeam: match.homeTeam || { name: match.homeTeamName || match.home || 'Unknown' },
            awayTeam: match.awayTeam || { name: match.awayTeamName || match.away || 'Unknown' },
            competitionCode: match.competition?.code || match.competitionCode
          }));
          setMatches(transformed);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          setMatches([]);
        }
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all teams using our new MongoDB API
  const fetchAllTeams = async () => {
    try {
      // Try MongoDB API first
      try {
        const teamsResponse = await apiClient.getTeams();
        setAllTeams(teamsResponse.data || []);
      } catch (apiError) {
        console.warn('MongoDB teams API failed, trying fallback:', apiError.message);
        // Fallback to sports-data API
        try {
          const res = await fetch('/api/sports-data?endpoint=teams');
          if (!res.ok) throw new Error('Failed to fetch teams');
          const data = await res.json();
          setAllTeams(data.teams || []);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          setAllTeams([]);
        }
      }
    } catch (err) {
      console.error('Error fetching all teams:', err);
    }
  };

  // Load authorized user favorites from MongoDB
  const loadFavorites = async () => {
    if (!user) return;
    try {
      const favoritesResponse = await apiClient.getUserFavorites(user.id);
      setFavorites(favoritesResponse.data || []);
    } catch (err) {
      console.error('Error loading favorites:', err);
      setError(err.message);
    }
  };

  // Ensures whatever user has entered is a valid team before updating db
  const validateTeam = (teamName) => {
    const norm = normalize(teamName);
    const team = allTeams.find(t => {
      const name = typeof t === 'string' ? t : (t.name || '');
      const shortName = typeof t === 'string' ? '' : (t.shortName || '');
      const tla = typeof t === 'string' ? '' : (t.tla || '');
      return [name, shortName, tla].some(v => normalize(v) === norm);
    });
    if (!team) throw new Error('Team not found');
    return typeof team === 'string' ? { name: team } : team;
  };

  const resolveTeamByInput = (input) => {
    if (!input) return null;
    try { return validateTeam(input); } catch { return null; }
  };

  // Validate team and add to MongoDB
  const addFavorite = async (teamName) => {
    if (!user || !teamName) return;
    try {
  const team = resolveTeamByInput(teamName);
  if (!team) throw new Error('Team not found');
      await apiClient.addUserFavorite(user.id, team.name);
      const updated = Array.from(new Set([...favorites, team.name]));
      setFavorites(updated);
      setNewTeam('');
  setIsValidInput(false);
    } catch (err) {
      console.error('Error adding favorite:', err);
      setError(err.message);
    }
  };

  // Remove team from favorites and update MongoDB
  const removeFavorite = async (teamName) => {
    if (!user || !teamName) return;
    try {
  await apiClient.removeUserFavorite(user.id, teamName);
  // Re-fetch from server to ensure persistence
  const favoritesResponse = await apiClient.getUserFavorites(user.id);
  setFavorites(favoritesResponse.data || []);
    } catch (err) {
      console.error('Error removing favorite:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchMatches();
    fetchAllTeams();
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [user]);

  // Display for upcoming matches for user fav team
  const formatMatch = (match) => {
    try {
      const date = new Date(match.utcDate);
      const day = date.getDate();
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const status = match.status.charAt(0).toUpperCase() + match.status.slice(1);
  const homeName = typeof match.homeTeam === 'string' ? match.homeTeam : (match.homeTeam?.name || match.homeTeam?.shortName || match.homeTeam?.tla || 'Unknown');
  const awayName = typeof match.awayTeam === 'string' ? match.awayTeam : (match.awayTeam?.name || match.awayTeam?.shortName || match.awayTeam?.tla || 'Unknown');
  return `${homeName} vs ${awayName} | ${day} ${month} ${year} | ${hours}:${minutes} -> ${status}`;
    } catch (e) {
  const homeName = typeof match.homeTeam === 'string' ? match.homeTeam : (match.homeTeam?.name || match.homeTeam?.shortName || match.homeTeam?.tla || 'Unknown');
  const awayName = typeof match.awayTeam === 'string' ? match.awayTeam : (match.awayTeam?.name || match.awayTeam?.shortName || match.awayTeam?.tla || 'Unknown');
  return `${homeName} vs ${awayName} | Date TBD -> ${match.status}`;
    }
  };

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

  const getStatusBadge = (status) => {
    const statusConfig = {
      live: { text: 'LIVE', className: 'status-live' },
      final: { text: 'FINAL', className: 'status-final' },
      finished: { text: 'FINAL', className: 'status-final' },
      scheduled: { text: 'SCHEDULED', className: 'status-scheduled' },
      default: { text: 'UPCOMING', className: 'status-default' }
    };
    const key = (status || '').toString().toLowerCase();
    const config = statusConfig[key] || statusConfig.default;
    return <span className={`status-badge ${config.className}`}>{config.text}</span>;
  };

  // While we get data from API we display this in the meantime 
  if (!user) return <p data-testid="no-user">Please sign in to manage favorites</p>;

  return (
    <div className="favorites-panel" data-testid="favorites-panel">
      <h2>Favorites</h2>

      {error && <p className="error" data-testid="error">{error}</p>}
  {loading && <p data-testid="loading">Loading matches...</p>}

      {/* Favorite matches as clickable cards at the top */}
      {favorites.length > 0 && (
        <div className="favorites-matches">
          <h3>Your favorite matches</h3>
          <div className="matches-grid">
            {Array.from(
              new Map(
                matches
                  .filter(m => {
                    return favorites.some(fav => teamMatchesFavorite(m.homeTeam, fav, allTeams.find(t => (t.name || t) === fav))
                      || teamMatchesFavorite(m.awayTeam, fav, allTeams.find(t => (t.name || t) === fav)));
                  })
                  .map(m => [m.id || `${m.homeTeam}-${m.awayTeam}-${m.utcDate || ''}`, m])
              ).values()
            )
              .sort((a, b) => new Date(a.utcDate || 0) - new Date(b.utcDate || 0))
              .map((game, index) => (
                <div
                  key={game.id || `fav-match-${index}`}
                  className="match-card clickable"
                  onClick={() => onMatchSelect && onMatchSelect(game)}
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
                      {displayCrest(game.homeTeam) && (
                        <img className="team-crest" alt="home crest" src={displayCrest(game.homeTeam)} />
                      )}
                      <span className="team-name">{displayName(game.homeTeam)}</span>
                      <span className="team-score">{game.homeScore ?? '-'}</span>
                    </div>
                    <div className="match-separator">vs</div>
                    <div className="team">
                      {displayCrest(game.awayTeam) && (
                        <img className="team-crest" alt="away crest" src={displayCrest(game.awayTeam)} />
                      )}
                      <span className="team-name">{displayName(game.awayTeam)}</span>
                      <span className="team-score">{game.awayScore ?? '-'}</span>
                    </div>
                  </div>

                  <div className="match-details">
                    <div className="meta-left">
                      {game.utcDate && (
                        <span className="scheduled-time">
                          {formatDate(game.utcDate)} • {formatTime(new Date(game.utcDate))}
                        </span>
                      )}
                      {game.matchday && (
                        <span className="matchday">MD {game.matchday}</span>
                      )}
                    </div>
                    <div className="meta-right">
                      {game.minute && (game.status || '').toLowerCase() === 'live' && (
                        <span className="match-time">{game.minute}'</span>
                      )}
                      {game.venue && game.venue !== 'TBD' && (
                        <span className="venue">{game.venue}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Favorite team chips */}
      <div className="favorite-chips">
        {favorites.map((team) => {
          const rec = findTeamRecord(team);
          const crest = rec && typeof rec === 'object' ? rec.crest : null;
          return (
            <div key={team} className="chip">
              {crest && <img className="chip-crest" src={crest} alt={`${team} crest`} />}
              <span className="chip-label">{team}</span>
              <button className="chip-remove" onClick={() => removeFavorite(team)} aria-label={`Remove ${team}`}>×</button>
            </div>
          );
        })}
      </div>

  <ul data-testid="favorites-list" className="favorites-list">
        {favorites.length === 0 ? (
          <li className="no-favorites" data-testid="no-favorites">
            No favorite teams chosen
          </li>
        ) : (
          favorites.map((teamName) => {
    const favRecord = allTeams.find(t => (t.name || t) === teamName);
    const upcoming = matches
      .filter(m => teamMatchesFavorite(m.homeTeam, teamName, favRecord) || teamMatchesFavorite(m.awayTeam, teamName, favRecord))
              .sort((a, b) => new Date(a.utcDate || 0) - new Date(b.utcDate || 0));

            return (
              <li key={teamName} className="favorite-item card" data-testid="favorite-item">
                <div className="fav-header">
                  <strong data-testid="favorite-name">{teamName}</strong>
                  <span className="count-pill">{upcoming.length}</span>
                </div>
                <div className="upcoming-cards" data-testid={`matches-${teamName}`}>
                  {upcoming.slice(0, 5).map(match => (
                    <div key={match.id} className="up-card clickable" onClick={() => onMatchSelect && onMatchSelect(match)}>
                      <div className="up-line">
                        <span className="up-date">{formatDate(match.utcDate)}</span>
                        <span className="up-time">{formatTime(new Date(match.utcDate))}</span>
                      </div>
                      <div className="up-teams">
                        {displayCrest(match.homeTeam) && <img className="up-crest" alt="home crest" src={displayCrest(match.homeTeam)} />}
                        {displayName(match.homeTeam)} <span className="sep">vs</span> {displayName(match.awayTeam)}
                        {displayCrest(match.awayTeam) && <img className="up-crest" alt="away crest" src={displayCrest(match.awayTeam)} />}
                      </div>
                      <div className="up-meta">{match.competition}</div>
                    </div>
                  ))}
                  {upcoming.length > 5 && (
                    <div className="more-note">+{upcoming.length - 5} more…</div>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="add-favorite-section" data-testid="add-favorite-section">
        <input
          type="text"
          list="team-options"
          value={newTeam}
          onChange={(e) => {
            const v = e.target.value;
            setNewTeam(v);
            setIsValidInput(!!resolveTeamByInput(v));
          }}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && newTeam.trim() && resolveTeamByInput(newTeam.trim())) {
              await addFavorite(newTeam.trim());
            }
          }}
          placeholder="Start typing a team..."
          data-testid="add-input"
          autoComplete="off"
        />
        <datalist id="team-options" data-testid="team-datalist">
          {allTeams
            .filter(t => {
              const teamName = typeof t === 'string' ? t : (t.name || '');
              return !favorites.includes(teamName);
            })
            .flatMap((t, index) => {
              if (typeof t === 'string') return [{ key: `team-${index}`, value: t }];
              const out = [{ key: t._id || t.id || `team-${index}`, value: t.name }];
              if (t.tla && t.tla !== t.name) out.push({ key: `${out[0].key}-tla`, value: t.tla });
              if (t.shortName && t.shortName !== t.name && t.shortName !== t.tla) out.push({ key: `${out[0].key}-short`, value: t.shortName });
              return out;
            })
            .sort((a, b) => a.value.localeCompare(b.value))
            .map(opt => (
              <option key={opt.key} value={opt.value} />
            ))}
        </datalist>
        <button
          className="add-btn"
          onClick={async () => { if (newTeam.trim() && resolveTeamByInput(newTeam.trim())) { await addFavorite(newTeam.trim()); } }}
          data-testid="add-button"
          disabled={!isValidInput}
          title={!isValidInput ? 'Select a valid team from suggestions' : 'Add favorite'}
        >
          Add
        </button>
      </div>
    </div>
  );
};

export default FavoritesPanel;