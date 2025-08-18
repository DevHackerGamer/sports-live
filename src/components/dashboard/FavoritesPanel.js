import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { db, ref, onValue, update } from '../../lib/firebase';

const FavoritesPanel = () => {
  const { user } = useUser();
  const uid = user?.id;

  const [favorites, setFavorites] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [matches, setMatches] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const favRef = ref(db, `users/${uid}/favorites`);
    const unsubscribe = onValue(
      favRef,
      (snapshot) => {
        const data = snapshot.val() || [];
        setFavorites(Array.isArray(data) ? data : Object.values(data));
        setLoadingFavorites(false);
      },
      (err) => {
        console.error('Error fetching favorites:', err);
        setFavorites([]);
        setLoadingFavorites(false);
      }
    );
    return () => unsubscribe();
  }, [uid]);

  useEffect(() => {
    const teamsRef = ref(db, 'teams');
    const unsubscribe = onValue(
      teamsRef,
      (snapshot) => {
        const data = snapshot.val() || [];
        setTeams(Array.isArray(data) ? data : Object.values(data));
        setLoadingTeams(false);
      },
      (err) => {
        console.error('Error fetching teams:', err);
        setTeams([]);
        setLoadingTeams(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const matchesRef = ref(db, 'matches');
    const unsubscribe = onValue(
      matchesRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const matchList = Object.values(data);
        setMatches(matchList);
        setLoadingMatches(false);
      },
      (err) => {
        console.error('Error fetching matches:', err);
        setMatches([]);
        setLoadingMatches(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const addFavorite = async () => {
    if (!selectedTeam) return alert('Please select a team');
    if (!teams.includes(selectedTeam)) return alert('Invalid team selected');
    if (favorites.includes(selectedTeam)) return alert('Team already in favorites');

    const newFavorites = [...favorites, selectedTeam];
    try {
      await update(ref(db, `users/${uid}`), { favorites: newFavorites });
      setFavorites(newFavorites);
      setSelectedTeam('');
    } catch (err) {
      console.error('Error updating favorites:', err);
      alert('Failed to add favorite team');
    }
  };

  const removeFavorite = async (teamToRemove) => {
    const newFavorites = favorites.filter((t) => t !== teamToRemove);
    try {
      await update(ref(db, `users/${uid}`), { favorites: newFavorites });
      setFavorites(newFavorites);
    } catch (err) {
      console.error('Error removing favorite:', err);
      alert('Failed to remove favorite team');
    }
  };

  const getTeamMatches = (teamName) => {
    return matches
      .filter(
        (m) => (m.homeTeam === teamName || m.awayTeam === teamName) &&
               (m.status === 'scheduled' || m.status === 'live')
      )
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  };

  const formatDateTime = (utcDate) => {
    const date = new Date(utcDate);
    return `${date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };

  if (!uid) return <div className="favorites-panel" data-testid="no-user">Please log in to see your favorites.</div>;
  if (loadingFavorites || loadingTeams || loadingMatches)
    return <div className="favorites-panel loading-state" data-testid="loading">Loading...</div>;

  return (
    <div className="favorites-panel" data-testid="favorites-panel">
      <h3>Favorites</h3>
      {favorites.length === 0 ? (
        <p data-testid="no-favorites">No favorite teams chosen</p>
      ) : (
        <ul data-testid="favorites-list">
          {favorites.map((team) => {
            const teamMatches = getTeamMatches(team);
            return (
              <li key={team} data-testid={`favorite-${team}`}>
                <strong>{team}</strong>
                <span style={{ margin: '0 10px' }}>({teamMatches.length} matches)</span>
                <button onClick={() => removeFavorite(team)} data-testid={`remove-${team}`}>Remove</button>
                {teamMatches.length > 0 && (
                  <ul className="team-matches" data-testid={`matches-${team}`}>
                    {teamMatches.map((match) => (
                      <li key={match.id} data-testid={`match-${match.id}`}>
                        {match.homeTeam} vs {match.awayTeam} — {formatDateTime(match.utcDate)}
                        {match.status === 'live' && <span className="live-badge" data-testid={`live-${match.id}`}> LIVE {match.minute}'</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="favorites-add" style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }} data-testid="add-favorite-panel">
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          data-testid="team-select"
        >
          <option value="">Select a team...</option>
          {teams.map((team) => (
            <option key={team} value={team} data-testid={`team-option-${team}`}>{team}</option>
          ))}
        </select>
        <button
          onClick={addFavorite}
          disabled={!selectedTeam || favorites.includes(selectedTeam)}
          style={{ padding: '8px 5px', fontSize: '16px', flex: '1' }}
          data-testid="add-favorite-btn"
        >
          Add Favorite
        </button>
      </div>
    </div>
  );
};

export default FavoritesPanel;
