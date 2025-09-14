import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import '../../styles/PlayersPage.css';

const PlayersPage = () => {
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [position, setPosition] = useState('');
  const [nationality, setNationality] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const params = { limit, offset };
      if (teamName) params.teamName = teamName;
      if (position) params.position = position;
      if (nationality) params.nationality = nationality;
      if (sortBy) params.sortBy = sortBy;

      const res = await apiClient.request('/api/players', { params });
      if (res.success) {
        setPlayers(res.players);
        setTotal(res.total);
      }
    } catch (err) {
      console.error('Failed to fetch players', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [teamName, position, nationality, sortBy, limit, offset]);

  const calculateAge = (dob) => Math.floor((new Date() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25));

  return (
    <div className="players-page">
      <h1>Players</h1>

      <div className="filters">
        <input placeholder="Team Name" value={teamName} onChange={e => setTeamName(e.target.value)} />
        <input placeholder="Position" value={position} onChange={e => setPosition(e.target.value)} />
        <input placeholder="Nationality" value={nationality} onChange={e => setNationality(e.target.value)} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="position">Sort by Position</option>
        </select>
      </div>

      {loading ? <p>Loading players...</p> : (
        <div className="player-cards">
          {players.map(p => (
            <div className="player-card" key={p._id}>
              <h3>{p.name}</h3>
              <p><strong>Team:</strong> {p.teamName}</p>
              <p><strong>Position:</strong> {p.position}</p>
              <p><strong>Nationality:</strong> {p.nationality}</p>
              <p><strong>Age:</strong> {calculateAge(p.dateOfBirth)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="pagination">
        <button onClick={() => setOffset(Math.max(offset - limit, 0))} disabled={offset === 0}>Prev</button>
        <span>{offset + 1} - {Math.min(offset + limit, total)} of {total}</span>
        <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total}>Next</button>
      </div>
    </div>
  );
};

export default PlayersPage;
