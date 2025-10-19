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

  const [teamsMap, setTeamsMap] = useState({}); // Map teamId -> team data
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 50;

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

  const calculateAge = (dob) => {
  if (!dob) return "N/A";
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

  // Reset all filters
  const resetFilters = () => {
    setPlayerName('');
    setTeamName('');
    setPosition('');
    setNationality('');
    setCurrentPage(1); // reset to first page
  };

  // Filter all players client-side
  const filteredPlayers = players.filter((p) => {
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
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + playersPerPage);

  // Pagination window (show ±2 pages around current)
const getPageNumbers = () => {
  const delta = 2;
  const range = [];
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
    range.push(i);
  }
  return range;
};



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
        <button onClick={resetFilters} className="reset-filters">
          Reset Filters
       
  </button>
         
     
      </div>

      {loading ? (
        <p>Loading players...</p>
      ) :
      
      (
        <>
          {filteredPlayers.length === 0 ? (
            <p className="empty-message">No players match your filters.</p>
          ) : (
            <div className="player-cards">
              {paginatedPlayers.map((p) => {
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
          {/* Pagination Controls */}
          {totalPages > 1 && filteredPlayers.length > 0 && (
            <div className="pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </button>

              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  className={currentPage === pageNum ? 'active' : ''}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              {/* show ellipsis + last page when current window doesn't include the last pages */}
              {currentPage + 2 < totalPages && <span className="ellipsis">…</span>}
              {currentPage + 2 < totalPages && (
                <button onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
              )}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};


export default PlayersPage;