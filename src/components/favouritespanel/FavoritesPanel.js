import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';
import '../../styles/FavoritesPanel.css';
import '../../styles/LiveSports.css';

const FavoritesPanel = ({ onMatchSelect }) => {
  const { user } = useUser();
  const [favorites, setFavorites] = useState([]);
  const [matches, setMatches] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTeam, setNewTeam] = useState('');
  const [isValidInput, setIsValidInput] = useState(false);

  // Helper functions
  const normalize = (s) => (s || '').toString().toLowerCase().replace(/\./g, '').replace(/[^a-z0-9]/g, '').replace(/fc$/, '');
  const displayName = (team) => !team ? 'Unknown' : typeof team === 'string' ? team : team.name || team.shortName || team.tla || 'Unknown';
  const displayCrest = (team) => !team || typeof team === 'string' ? null : team.crest || null;
  
  const findTeamRecord = (name) => {
    const target = normalize(name);
    return allTeams.find(t => normalize(typeof t === 'string' ? t : (t.name || t.shortName || t.tla || '')) === target);
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

  // Data fetching functions
  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError('');
      
      // MongoDB API first, then fallback
      try {
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 20, 23, 59, 59, 999));
        const toISODate = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
        
        const matchesResponse = await apiClient.getMatchesByDate(toISODate(start), toISODate(end), 1000);
        const transformed = (matchesResponse.data || []).map(match => ({
          ...match,
          homeTeam: match.homeTeam || match.homeTeamName || match.home || match.homeTeamId || match.home_team || match.homeTeamObject,
          awayTeam: match.awayTeam || match.awayTeamName || match.away || match.awayTeamId || match.away_team || match.awayTeamObject,
          competition: match.competition?.name || match.competition || 'Unknown',
          competitionCode: match.competition?.code || match.competitionCode
        }));
        
        setMatches(transformed);
      } catch (apiError) {
        console.warn('MongoDB API failed, trying fallback:', apiError.message);
        // Fallback implementation
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
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTeams = async () => {
    try {
      // MongoDB API first, then fallback
      try {
        const teamsResponse = await apiClient.getTeams();
        setAllTeams(teamsResponse.data || []);
      } catch (apiError) {
        console.warn('MongoDB teams API failed, trying fallback:', apiError.message);
        // Fallback implementation
        const res = await fetch('/api/sports-data?endpoint=teams');
        if (!res.ok) throw new Error('Failed to fetch teams');
        const data = await res.json();
        setAllTeams(data.teams || []);
      }
    } catch (err) {
      console.error('Error fetching all teams:', err);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;
    try {
      const favoritesResponse = await apiClient.getUserFavorites(user.id);
      setFavorites(favoritesResponse.data || []);
      setError('');
    } catch (err) {
      console.error('Error loading favorites:', err);
      setError(err.message);
    }
  };

  // Favorite management functions
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

  const addFavorite = async (teamName) => {
    if (!user || !teamName) return;
    try {
      const team = resolveTeamByInput(teamName);
      if (!team) throw new Error('Team not found');
      
      await apiClient.addUserFavorite(user.id, team.name);
      await loadFavorites(); // Reload favorites to ensure consistency
      setNewTeam('');
      setIsValidInput(false);
    } catch (err) {
      console.error('Error adding favorite:', err);
      setError(err.message);
    }
  };

  const removeFavorite = async (teamName) => {
    if (!user || !teamName) return;
    try {
      await apiClient.removeUserFavorite(user.id, teamName);
      await loadFavorites(); // Reload favorites to ensure consistency
    } catch (err) {
      console.error('Error removing favorite:', err);
      setError(err.message);
    }
  };

  // Formatting functions
  const formatTime = (date) => !date ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      live: { text: 'LIVE', className: 'ls-status-live' },
      final: { text: 'FINAL', className: 'ls-status-final' },
      finished: { text: 'FINAL', className: 'ls-status-final' },
      scheduled: { text: 'SCHEDULED', className: 'ls-status-scheduled' },
      default: { text: 'UPCOMING', className: 'ls-status-default' }
    };
    
    const key = (status || '').toString().toLowerCase();
    const config = statusConfig[key] || statusConfig.default;
    return <span className={`ls-status-badge ${config.className}`}>{config.text}</span>;
  };

  // Effects
  useEffect(() => {
    fetchMatches();
    fetchAllTeams();
  }, []);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  // Render components
  if (!user) return <p data-testid="no-user">Please sign in to manage favorites</p>;

  return (
    <div className="favorites-panel" data-testid="favorites-panel">
      <h2>Favorites</h2>

      {error && <p className="error" data-testid="error">{error}</p>}
      {loading && <p className="loading" data-testid="loading">Loading matches...</p>}

      {/* Favorite Matches Section */}
      {favorites.length > 0 && (
        <div className="favorites-matches">
          <h3>Your Favorite Matches</h3>
          <div className="ls-matches-grid">
            {Array.from(
              new Map(
                matches
                  .filter(m => favorites.some(fav => 
                    teamMatchesFavorite(m.homeTeam, fav, allTeams.find(t => (t.name || t) === fav)) ||
                    teamMatchesFavorite(m.awayTeam, fav, allTeams.find(t => (t.name || t) === fav))
                  ))
                  .map(m => [m.id || `${m.homeTeam}-${m.awayTeam}-${m.utcDate || ''}`, m])
              ).values()
            )
              .sort((a, b) => new Date(a.utcDate || 0) - new Date(b.utcDate || 0))
              .map((game, index) => (
                <MatchCard 
                  key={game.id || `fav-match-${index}`} 
                  game={game} 
                  onSelect={onMatchSelect}
                  displayName={displayName}
                  displayCrest={displayCrest}
                  getStatusBadge={getStatusBadge}
                  formatDate={formatDate}
                  formatTime={formatTime}
                />
              ))}
          </div>
        </div>
      )}

      {/* Favorite Teams Section */}
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

      {/* Favorites List Section */}
      <ul data-testid="favorites-list" className="favorites-list">
        {favorites.length === 0 ? (
          <li className="ls-no-matches" data-testid="no-favorites">
            No favorite teams chosen
          </li>
        ) : (
          favorites.map((teamName) => (
            <FavoriteItem 
              key={teamName}
              teamName={teamName}
              allTeams={allTeams}
              matches={matches}
              teamMatchesFavorite={teamMatchesFavorite}
              onMatchSelect={onMatchSelect}
              displayName={displayName}
              displayCrest={displayCrest}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          ))
        )}
      </ul>

      {/* Add Favorite Section */}
      <AddFavoriteSection 
        newTeam={newTeam}
        setNewTeam={setNewTeam}
        isValidInput={isValidInput}
        setIsValidInput={setIsValidInput}
        allTeams={allTeams}
        favorites={favorites}
        addFavorite={addFavorite}
        resolveTeamByInput={resolveTeamByInput}
      />
    </div>
  );
};

// Sub-components for better organization
const MatchCard = ({ game, onSelect, displayName, displayCrest, getStatusBadge, formatDate, formatTime }) => (
  <div className="ls-match-card ls-clickable" onClick={() => onSelect && onSelect(game)}>
    <div className="ls-match-header">
      <div className="comp-left">
        <span className="ls-competition">
          {game.competition}
          {game.competitionCode && <span className="ls-competition-code">[{game.competitionCode}]</span>}
        </span>
      </div>
      <div className="comp-right">{getStatusBadge(game.status)}</div>
    </div>

    <div className="ls-match-teams">
      <div className="ls-team">
        {displayCrest(game.homeTeam) && <img className="ls-team-crest" alt="home crest" src={displayCrest(game.homeTeam)} />}
        <span className="ls-team-name">{displayName(game.homeTeam)}</span>
        <span className="ls-team-score">{game.homeScore ?? '-'}</span>
      </div>
      <div className="ls-match-separator">vs</div>
      <div className="ls-team">
        {displayCrest(game.awayTeam) && <img className="ls-team-crest" alt="away crest" src={displayCrest(game.awayTeam)} />}
        <span className="ls-team-name">{displayName(game.awayTeam)}</span>
        <span className="ls-team-score">{game.awayScore ?? '-'}</span>
      </div>
    </div>

    <div className="ls-match-details">
      <div className="ls-meta-left">
        {game.utcDate && (
          <span className="ls-scheduled-time">
            {formatDate(game.utcDate)} • {formatTime(new Date(game.utcDate))}
          </span>
        )}
        {game.matchday && <span className="ls-matchday">MD {game.matchday}</span>}
      </div>
      <div className="ls-meta-right">
        {game.minute && (game.status || '').toLowerCase() === 'live' && (
          <span className="ls-match-time">{game.minute}'</span>
        )}
        {game.venue && game.venue !== 'TBD' && <span className="ls-venue">{game.venue}</span>}
      </div>
    </div>
  </div>
);

const FavoriteItem = ({ teamName, allTeams, matches, teamMatchesFavorite, onMatchSelect, displayName, displayCrest, formatDate, formatTime }) => {
  const favRecord = allTeams.find(t => (t.name || t) === teamName);
  const upcoming = matches
    .filter(m => teamMatchesFavorite(m.homeTeam, teamName, favRecord) || teamMatchesFavorite(m.awayTeam, teamName, favRecord))
    .sort((a, b) => new Date(a.utcDate || 0) - new Date(b.utcDate || 0));

  return (
    <li className="favorite-item" data-testid="favorite-item">
      <div className="fav-header">
        <strong data-testid="favorite-name">{teamName}</strong>
        <span className="count-pill">{upcoming.length}</span>
      </div>
      <div className="ls-upcoming-cards" data-testid={`matches-${teamName}`}>
        {upcoming.slice(0, 5).map(match => (
          <div key={match.id} className="ls-up-card ls-clickable" onClick={() => onMatchSelect && onMatchSelect(match)}>
            <div className="ls-up-line">
              <span className="up-date">{formatDate(match.utcDate)}</span>
              <span className="up-time">{formatTime(new Date(match.utcDate))}</span>
            </div>
            <div className="ls-up-teams">
              {displayCrest(match.homeTeam) && <img className="ls-up-crest" alt="home crest" src={displayCrest(match.homeTeam)} />}
              {displayName(match.homeTeam)} <span className="ls-sep">vs</span> {displayName(match.awayTeam)}
              {displayCrest(match.awayTeam) && <img className="ls-up-crest" alt="away crest" src={displayCrest(match.awayTeam)} />}
            </div>
            <div className="ls-up-meta">{match.competition}</div>
          </div>
        ))}
        {upcoming.length > 5 && <div className="ls-more-note">+{upcoming.length - 5} more…</div>}
      </div>
    </li>
  );
};

const AddFavoriteSection = ({ newTeam, setNewTeam, isValidInput, setIsValidInput, allTeams, favorites, addFavorite, resolveTeamByInput }) => (
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
        .map(opt => <option key={opt.key} value={opt.value} />)}
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
);

export default FavoritesPanel;