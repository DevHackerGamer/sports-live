import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';

const FavoritesPanel = () => {
  const { user } = useUser();
  const [favorites, setFavorites] = useState([]); // store team names
  const [matches, setMatches] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTeam, setNewTeam] = useState('');

  // Helper: normalize strings for matching (case-insensitive, remove punctuation and trailing FC)
  const normalize = (s) => (s || '')
    .toString()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/fc$/, '');

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
        // Request a wider window so favorites with upcoming games appear
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 20, 23, 59, 59, 999));
        const toISODate = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
        const matchesResponse = await apiClient.getMatchesByDate(toISODate(start), toISODate(end), 1000);
        const transformedMatches = (matchesResponse.data || []).map(match => ({
          ...match,
          homeTeam: match.homeTeam || match.homeTeamName || match.home || match.homeTeamId || match.home_team || match.homeTeamObject,
          awayTeam: match.awayTeam || match.awayTeamName || match.away || match.awayTeamId || match.away_team || match.awayTeamObject,
          competition: match.competition?.name || match.competition || 'Unknown'
        }));
        setMatches(transformedMatches);
      } catch (apiError) {
        console.warn('MongoDB API failed, trying fallback:', apiError.message);
        // Fallback to sports-data API
        const res = await fetch('/api/sports-data?limit=200&range=30');
        if (!res.ok) throw new Error('Failed to fetch matches');
        const data = await res.json();
        const transformed = (data.games || []).map(match => ({
          ...match,
          homeTeam: match.homeTeam || { name: match.homeTeamName || match.home || 'Unknown' },
          awayTeam: match.awayTeam || { name: match.awayTeamName || match.away || 'Unknown' },
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
        const res = await fetch('/api/sports-data?endpoint=teams');
        if (!res.ok) throw new Error('Failed to fetch teams');
        const data = await res.json();
        setAllTeams(data.teams || []);
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
    const team = allTeams.find(t => {
      const name = typeof t === 'string' ? t : t.name;
      return name.toLowerCase() === teamName.toLowerCase();
    });
    if (!team) throw new Error('Team not found');
    return typeof team === 'string' ? { name: team } : team;
  };

  // Validate team and add to MongoDB
  const addFavorite = async (teamName) => {
    if (!user || !teamName) return;
    try {
      const team = validateTeam(teamName);
      await apiClient.addUserFavorite(user.id, team.name);
      const updated = Array.from(new Set([...favorites, team.name]));
      setFavorites(updated);
      setNewTeam('');
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
      const updated = favorites.filter(f => f !== teamName);
      setFavorites(updated);
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

  // Display for upcoming matchs for user fav team -> FrontEnd its all you now :)
  const formatMatch = (match) => {
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
  };

  // While we get data from firebase rdb we display this in the meantime 
  if (!user) return <p data-testid="loading-user">Loading user...</p>;

  return (
    <div className="favorites-panel" style={{ marginBottom: '24px' }} data-testid="favorites-panel">
      <h2>Favorites</h2>

      {error && <p className="error" data-testid="error">{error}</p>}
      {loading && <p data-testid="loading-matches">Loading matches...</p>}

      <ul data-testid="favorites-list">
        {favorites.length === 0 ? (
          <li style={{ fontStyle: 'italic', color: '#666' }} data-testid="no-favorites">
            No favorite teams chosen
          </li>
        ) : (
          favorites.map((teamName) => {
            const favRecord = allTeams.find(t => (t.name || t) === teamName);
            const upcoming = matches
              .filter(m => teamMatchesFavorite(m.homeTeam, teamName, favRecord) || teamMatchesFavorite(m.awayTeam, teamName, favRecord))
              .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

            return (
              <li key={teamName} style={{ marginBottom: '12px' }} data-testid="favorite-item">
                <strong data-testid="favorite-name">{teamName}</strong> — Upcoming Matches: {upcoming.length}
                <button
                  style={{ marginLeft: '12px', padding: '4px 8px', cursor: 'pointer' }}
                  onClick={() => removeFavorite(teamName)}
                  data-testid="remove-favorite"
                >
                  Remove
                </button>
                <ul style={{ marginTop: '4px', marginLeft: '16px' }} data-testid="upcoming-list">
                  {upcoming.map(match => (
                    <li key={match.id} data-testid="upcoming-match">{formatMatch(match)}</li>
                  ))}
                </ul>
              </li>
            );
          })
        )}
      </ul>

      <div style={{ marginTop: '16px' }} data-testid="add-favorite-section">
        <input
          type="text"
          value={newTeam}
          onChange={(e) => setNewTeam(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && newTeam.trim()) {
              await addFavorite(newTeam.trim());
            }
          }}
          data-testid="add-input"
        />
        <select
          value=""
          onChange={async (e) => {
            if (e.target.value) {
              await addFavorite(e.target.value);
            }
          }}
          data-testid="add-dropdown"
        >
          <option value="" disabled>Select a team...</option>
          {allTeams
            .filter(t => {
              const teamName = typeof t === 'string' ? t : t.name;
              return !favorites.includes(teamName);
            })
            .sort((a, b) => {
              const aName = typeof a === 'string' ? a : a.name;
              const bName = typeof b === 'string' ? b : b.name;
              return aName.localeCompare(bName);
            })
            .map((t, index) => {
              const teamName = typeof t === 'string' ? t : t.name;
              const teamId = typeof t === 'string' ? `team-${index}` : (t._id || t.id || `team-${index}`);
              return (
                <option key={teamId} value={teamName} data-testid="dropdown-option">
                  {teamName}
                </option>
              );
            })}
        </select>
        <button
          onClick={async () => {
            if (newTeam.trim()) {
              await addFavorite(newTeam.trim());
            }
          }}
          data-testid="add-button"
        >
          Add
        </button>
      </div>
    </div>
  );
};

export default FavoritesPanel;
