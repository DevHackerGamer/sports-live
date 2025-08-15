import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { db } from '../../lib/firebase';
import { ref, get, set } from 'firebase/database';

const FavoritesPanel = () => {
  const { user } = useUser();
  const [favorites, setFavorites] = useState([]); // store team names
  const [matches, setMatches] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTeam, setNewTeam] = useState('');

  // Fetchs upcoming matchs and limited to 200 due to some error 429 of request limit by free tier that leads to internal server error 500
  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/sports-data?limit=200&range=30');
      if (!res.ok) throw new Error('Failed to fetch matches');
      const data = await res.json();
      setMatches(data.games || []);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // This one instead fetchs all teams to be able to validate team name and for dropdown for valid team selection 
  const fetchAllTeams = async () => {
    try {
      const res = await fetch('/api/sports-data?endpoint=teams');
      if (!res.ok) throw new Error('Failed to fetch teams');
      const data = await res.json();
      setAllTeams(data.teams || []);
    } catch (err) {
      console.error('Error fetching all teams:', err);
    }
  };

  // load autorized user fav from firebase rdb
  const loadFavorites = async () => {
    if (!user) return;
    try {
      const favRef = ref(db, `users/${user.id}/favorites`);
      const snapshot = await get(favRef);
      if (snapshot.exists()) {
        setFavorites(snapshot.val());
      } else {
        setFavorites([]);
      }
    } catch (err) {
      console.error('Error loading favorites:', err);
      setError(err.message);
    }
  };

  // Ensuures whatever user has entered is a valid team before updating db
  const validateTeam = (teamName) => {
    const team = allTeams.find(t => t.name.toLowerCase() === teamName.toLowerCase());
    if (!team) throw new Error('Team not found');
    return team;
  };

  // Validate team and adds to firebase rdb
  const addFavorite = async (teamName) => {
    if (!user || !teamName) return;
    try {
      const team = validateTeam(teamName);
      const favRef = ref(db, `users/${user.id}/favorites`);
      const updated = Array.from(new Set([...favorites, team.name]));
      await set(favRef, updated);
      setFavorites(updated);
      setNewTeam('');
    } catch (err) {
      console.error('Error adding favorite:', err);
      setError(err.message);
    }
  };

  // Remove team from fav and updates firebase rdb
  const removeFavorite = async (teamName) => {
    if (!user || !teamName) return;
    try {
      const favRef = ref(db, `users/${user.id}/favorites`);
      const updated = favorites.filter(f => f !== teamName);
      await set(favRef, updated);
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
    return `${match.homeTeam} vs ${match.awayTeam} | ${day} ${month} ${year} | ${hours}:${minutes} -> ${status}`;
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
            const upcoming = matches
              .filter(m => m.homeTeam === teamName || m.awayTeam === teamName)
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
          <option value="" disabled selected>Select a team...</option>
          {allTeams
            .filter(t => !favorites.includes(t.name))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(t => (
              <option key={t.id} value={t.name} data-testid="dropdown-option">{t.name}</option>
            ))}
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
