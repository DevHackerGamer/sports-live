import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import '../../styles/TeamInfo.css';

const TeamPlayers = ({ teamId }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!teamId) return;
      setLoading(true);
      try {
        const res = await apiClient.request(`/api/players?teamId=${teamId}`);
        if (res.success) {
          setPlayers(res.players || []);
        }
      } catch (err) {
        console.error('Error fetching team players', err);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [teamId]);

  const calculateAge = (dob) => 
    dob ? Math.floor((new Date() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25)) : 'N/A';

  if (loading) return <p>Loading players...</p>;
  if (!players.length) return <p>No players found for this team.</p>;

  return (
    <div className="team-players-list">
      {players.map((p) => (
        <div className="player-card" key={p._id}>
          <h3>{p.name}</h3>
          <p><strong>Position:</strong> {p.position || 'N/A'}</p>
          <p><strong>Nationality:</strong> {p.nationality || 'N/A'}</p>
          <p><strong>Age:</strong> {calculateAge(p.dateOfBirth)}</p>
        </div>
      ))}
    </div>
  );
};

export default TeamPlayers;
