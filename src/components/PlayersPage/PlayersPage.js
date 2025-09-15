import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import '../../styles/PlayersPage.css';

const PlayersPage = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [playerName, setPlayerName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [position, setPosition] = useState('');
  const [nationality, setNationality] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const [teamsMap, setTeamsMap] = useState({}); // Map teamId -> team data

  // Fetch all players once
  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.request('/api/players?limit=99999'); // fetch all players
      if (res.success) {
        setPlayers(res.players);
      }
    } catch (err) {
      console.error('Failed to fetch players', err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch teams for crest + name lookup
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await apiClient.getTeams();
        const map = {};
        res.data.forEach(team => {
          map[team.id] = { name: team.name, crest: team.crest };
        });
        setTeamsMap(map);
      } catch (err) {
        console.error('Failed to fetch teams', err);
      }
    };

    fetchTeams();
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const calculateAge = (dob) =>
    Math.floor((new Date() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25));

  // Reset all filters
  const resetFilters = () => {
    setPlayerName('');
    setTeamName('');
    setPosition('');
    setNationality('');
  };

  // Filter all players client-side
  const filteredPlayers = players
    .filter((p) => {
      const team = teamsMap[p.teamId]?.name || '';

      const matchesPlayer = playerName
        ? p.name?.toLowerCase().includes(playerName.toLowerCase())
        : true;

      const matchesTeam = teamName
        ? team.toLowerCase().includes(teamName.toLowerCase())
        : true;

      const matchesPosition = position
        ? p.position?.toLowerCase().includes(position.toLowerCase())
        : true;

      const matchesNationality = nationality
        ? p.nationality?.toLowerCase().includes(nationality.toLowerCase())
        : true;

      return matchesPlayer && matchesTeam && matchesPosition && matchesNationality;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'position') return a.position.localeCompare(b.position);
      if (sortBy === 'teamName') {
        const teamA = teamsMap[a.teamId]?.name || '';
        const teamB = teamsMap[b.teamId]?.name || '';
        return teamA.localeCompare(teamB);
      }
      if (sortBy === 'nationality') return a.nationality.localeCompare(b.nationality);
      return 0;
    });

  return (
    <div className="players-page">
      <h1>Players</h1>

      <div className="filters">
        <input
          placeholder="Player Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <input
          placeholder="Team Name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
        <input
          placeholder="Position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
        <input
          placeholder="Nationality"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
        />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="position">Sort by Position</option>
          <option value="teamName">Sort by Team</option>
          <option value="nationality">Sort by Nationality</option>
        </select>
        <button onClick={resetFilters} className="reset-filters">
          Reset Filters
        </button>
      </div>

      {loading ? (
        <p>Loading players...</p>
      ) : (
        <div className="player-cards">
          {filteredPlayers.map((p) => {
            const team = teamsMap[p.teamId];
            return (
              <div className="player-card" key={p._id}>
                <h3>{p.name}</h3>
                <p>
                  <strong>Team:</strong>{' '}
                  {team?.crest && (
                    <img
                      src={team.crest}
                      alt={team.name}
                      className="team-icon"
                    />
                  )}
                  {team?.name || 'Unknown'}
                </p>
                <p>
                  <strong>Position:</strong> {p.position}
                </p>
                <p>
                  <strong>Nationality:</strong> {p.nationality}
                </p>
                <p>
                  <strong>Age:</strong> {calculateAge(p.dateOfBirth)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlayersPage;
