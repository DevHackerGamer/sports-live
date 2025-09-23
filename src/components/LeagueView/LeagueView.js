import { useState, useEffect, useCallback } from 'react';
import '../../styles/LeagueView.css';
import { apiClient } from '../../lib/api';

// Debug logger
const dlog = (...args) => {
  if (typeof window !== 'undefined' && window.__DEBUG_STANDINGS__) {
    console.log('[Standings]', ...args);
     }
};


const leagueKeyToCode = {
  "PL": "PL",
  "LL": "PD",
  "SA": "SA",
  "BL": "BL1",
  "L1": "FL1",
  "UCL": "CL"
};

const competitions = [
  { code: "PL", name: "Premier League" },
  { code: "SA", name: "Serie A" },
  { code: "BL1", name: "Bundesliga" },
  { code: "PD", name: "La Liga" },
  { code: "FL1", name: "Ligue 1" },
  { code: "CL", name: "Champions League" }
];

const tabs = ['Standings', 'Matches', 'Players'];

const LeagueView = ({ initialLeague = "PL", onBack, onTeamSelect }) => {
  const getCompetitionCode = (league) => leagueKeyToCode[league] || league;
  
  const [competitionCode, setCompetitionCode] = useState(getCompetitionCode(initialLeague));
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teamsMap, setTeamsMap] = useState({}); // Map teamId -> team data
  const [leaguePlayers, setLeaguePlayers] = useState([]);

  const [activeTab, setActiveTab] = useState('Standings');

  useEffect(() => {
    setCompetitionCode(getCompetitionCode(initialLeague));
  }, [initialLeague]);

  // Clear previous data when league changes
useEffect(() => {
  setStandings([]);
  setMatches([]);
  setError('');
}, [competitionCode]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setStandings([]);
    setMatches([]);
  
    const season = '2025';
    try {
      dlog('Fetching', { competitionCode });
      const res = await fetch(`/api/standings?competition=${competitionCode}&season=${season}`);
      const data = await res.json();
      dlog('Returned data', data.data);

      if (Array.isArray(data.data) && data.data.length > 0) {
        const doc = data.data.find(d => d._id === `${competitionCode}-${season}`) || data.data[0];
        const table = doc?.standings?.find(s => s.type === 'TOTAL')?.table || [];
        setStandings(table);

        // Optional: fetch matches & players from same API or different endpoints
        if (doc.matches) setMatches(doc.matches); // assuming API provides
         // assuming API provides
      }
    } catch (err) {
      setError('Failed to load data. Please try again.');
      dlog('Error', err);
    } finally {
      setLoading(false);
    }
  }, [competitionCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchLeagueMatches = useCallback(async () => {
  setLoadingMatches(true);
  setError('');
  try {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 30, 23, 59, 59, 999));

    const toISODate = (d) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;

    // Fetch all matches in this window
    const res = await apiClient.getMatchesByDate(toISODate(start), toISODate(end), 1000);

    // Filter by league code
    const leagueMatches = (res.data || [])
      .filter(m => m.competition?.code === competitionCode || m.competitionCode === competitionCode)
      .map(m => ({
        ...m,
        homeTeam: m.homeTeam || { name: m.homeTeamName || m.home || 'Unknown', crest: m.homeTeam?.crest },
        awayTeam: m.awayTeam || { name: m.awayTeamName || m.away || 'Unknown', crest: m.awayTeam?.crest },
        competition: m.competition?.name || competitionCode
      }))
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

    setMatches(leagueMatches);
  } catch (err) {
    console.error('Error fetching league matches:', err);
    setMatches([]);
    setError('Failed to load upcoming matches.');
  } finally {
    setLoadingMatches(false);
  }
}, [competitionCode]);
useEffect(() => {
  if (activeTab === 'Matches') {
    fetchLeagueMatches();
  }
}, [activeTab, competitionCode, fetchLeagueMatches]);



  const handleTeamClick = (team) => {
    if (onTeamSelect && team) onTeamSelect(team);
  };

  const handleBackClick = () => {
    if (onBack) onBack();
  };

  // Fetch all players from the Players API
const fetchPlayers = async () => {
  try {
    const res = await apiClient.request('/api/players?limit=99999');
    if (res.success) {
      setPlayers(res.players);
    }
  } catch (err) {
    console.error('Failed to fetch players', err);
    setPlayers([]);
  }
};
useEffect(() => {
  fetchPlayers();
}, []);

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
  if (!standings.length || !players.length) {
    setLeaguePlayers([]);
    return;
  }

  const leagueTeamIds = standings.map(s => s.team.id);
  const filteredPlayers = players.filter(p => leagueTeamIds.includes(p.teamId));
  setLeaguePlayers(filteredPlayers);
}, [standings, players]);







const calculateAge = (dob) =>
  Math.floor((new Date() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25));



  // Helper to render standings with qualification/relegation
  const renderStandingsTable = () => (
    <table key={competitionCode} className="league-view-standings-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>P</th>
          <th>W</th>
          <th>D</th>
          <th>L</th>
          <th>GD</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((row, idx) => {
          let rowClass = '';
          if (idx < 4) rowClass = 'league-view-champions-league';
          else if (idx >= 4 && idx < 6) rowClass = 'league-view-europa-league';
          else if (idx >= standings.length - 3) rowClass = 'league-view-relegation';
          return (
            <tr key={row.team.id} className={rowClass}>
              <td>{row.position}</td>
              <td className="league-view-team-cell league-view-clickable" onClick={() => handleTeamClick(row.team)}>
                <img src={row.team.crest || '/default-team-logo.png'} alt={row.team.name} className="league-view-team-logo"/>
                {row.team.name}
              </td>
              <td>{row.playedGames}</td>
              <td>{row.won}</td>
              <td>{row.draw}</td>
              <td>{row.lost}</td>
              <td>{row.goalDifference}</td>
              <td className="league-view-points">{row.points}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
const renderMatches = () => (
  <div className="league-view-matches-list">
    {loadingMatches ? (
      <p>Loading upcoming matches...</p>
    ) : matches.length > 0 ? (
      matches.map((m) => (
        <div key={m.id} className="league-view-match-card ls-clickable" onClick={() => handleTeamClick(m)}>
          <div className="league-view-match-date">
            {new Date(m.utcDate).toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' })}
            {' • '}
            {new Date(m.utcDate).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
          </div>
          <div className="league-view-match-teams">
            {m.homeTeam?.crest && <img src={m.homeTeam.crest} alt={`${m.homeTeam.name} crest`} />}
            <strong>{m.homeTeam?.name}</strong> vs <strong>{m.awayTeam?.name}</strong>
            {m.awayTeam?.crest && <img src={m.awayTeam.crest} alt={`${m.awayTeam.name} crest`} />}
          </div>
          <div className="league-view-match-competition">{m.competition}</div>
        </div>
      ))
    ) : (
      <p>No upcoming matches scheduled for this league.</p>
    )}
  </div>
);

const renderPlayers = () => (
  <div className="league-view-players-list">
    {leaguePlayers.length > 0 ? (
      leaguePlayers.map((p) => {
        const team = teamsMap[p.teamId];
        return (
          <div key={p._id || p.id} className="player-card">
            <h3>{p.name}</h3>
            <p>
              <strong>Team:</strong>{' '}
              {team?.crest && <img src={team.crest} alt={team.name} className="team-icon" />}
              {team?.name || 'Unknown'}
            </p>
            <p><strong>Position:</strong> {p.position}</p>
            <p><strong>Nationality:</strong> {p.nationality}</p>
            <p><strong>Age:</strong> {calculateAge(p.dateOfBirth)}</p>
          </div>
        );
      })
    ) : (
      <p>No players available for this league.</p>
    )}
  </div>
);



  return (
    <div className="league-view-container">
      <div className="league-view-header">
        <h2>{competitions.find(c => c.code === competitionCode)?.name || 'League'}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {onBack && <button onClick={handleBackClick} className="league-view-section-btn">← Home</button>}
        </div>
      </div>

      <div className="league-view-selector">
        <label>Select League:</label>
        <select
          value={competitionCode}
          onChange={(e) => setCompetitionCode(e.target.value)}
        >
          {competitions.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="league-view-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`league-view-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="league-view-error-message">
          <p>{error}</p>
          <button onClick={fetchData} className="league-view-retry-button">Retry</button>
        </div>
      )}

      {loading ? (
        <p>Loading {activeTab.toLowerCase()}...</p>
      ) : (
        <div className="league-view-tab-content">
          {activeTab === 'Standings' && renderStandingsTable()}
          {activeTab === 'Matches' && renderMatches()}
          {activeTab === 'Players' && renderPlayers()}
        </div>
      )}
    </div>
  );
};

export default LeagueView;