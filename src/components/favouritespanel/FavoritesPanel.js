import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';
import '../../styles/FavoritesPanel.css';

const FavoritesPanel = () => {
  const { user } = useUser();
  const [favorites, setFavorites] = useState([]); // store team names
  const [matches, setMatches] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTeam, setNewTeam] = useState('');

  // Fetch upcoming matches using our new MongoDB API
  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Try MongoDB API first
      try {
        const matchesResponse = await apiClient.getMatches();
        // Transform match data to ensure team names are strings
        const transformedMatches = (matchesResponse.data || []).map(match => ({
          ...match,
          homeTeam: match.homeTeam?.name || match.homeTeam || 'Unknown',
          awayTeam: match.awayTeam?.name || match.awayTeam || 'Unknown',
          competition: match.competition?.name || match.competition || 'Unknown'
        }));
        setMatches(transformedMatches);
      } catch (apiError) {
        console.warn('MongoDB API failed, trying fallback:', apiError.message);
        // Fallback to sports-data API
        try {
          const res = await fetch('/api/sports-data?limit=200&range=30');
          if (!res.ok) throw new Error('Failed to fetch matches');
          const data = await res.json();
          setMatches(data.games || []);
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
      return `${match.homeTeam} vs ${match.awayTeam} | ${day} ${month} ${year} | ${hours}:${minutes} -> ${status}`;
    } catch (e) {
      return `${match.homeTeam} vs ${match.awayTeam} | Date TBD -> ${match.status}`;
    }
  };

  // While we get data from API we display this in the meantime 
  if (!user) return <p data-testid="loading-user">Loading user...</p>;

  return (
    <div className="favorites-panel" data-testid="favorites-panel">
      <h2>Favorites</h2>

      {error && <p className="error" data-testid="error">{error}</p>}
      {loading && <p data-testid="loading-matches">Loading matches...</p>}

      <ul data-testid="favorites-list">
        {favorites.length === 0 ? (
          <li className="no-favorites" data-testid="no-favorites">
            No favorite teams chosen
          </li>
        ) : (
          favorites.map((teamName) => {
            const upcoming = matches
              .filter(m => m.homeTeam === teamName || m.awayTeam === teamName)
              .sort((a, b) => new Date(a.utcDate || 0) - new Date(b.utcDate || 0));

            return (
              <li key={teamName} className="favorite-item" data-testid="favorite-item">
                <strong data-testid="favorite-name">{teamName}</strong> — Upcoming Matches: {upcoming.length}
                <button
                  className="remove-btn"
                  onClick={() => removeFavorite(teamName)}
                  data-testid="remove-favorite"
                >
                  Remove
                </button>
                <ul className="upcoming-list" data-testid="upcoming-list">
                  {upcoming.map(match => (
                    <li key={match.id} data-testid="upcoming-match">{formatMatch(match)}</li>
                  ))}
                </ul>
              </li>
            );
          })
        )}
      </ul>

      <div className="add-favorite-section" data-testid="add-favorite-section">
        <input
          type="text"
          value={newTeam}
          onChange={(e) => setNewTeam(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && newTeam.trim()) {
              await addFavorite(newTeam.trim());
            }
          }}
          placeholder="Enter team name"
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
          className="add-btn"
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