import { useState, useEffect, useCallback } from 'react';
import '../../styles/LeagueView.css';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Standings');

  useEffect(() => {
    setCompetitionCode(getCompetitionCode(initialLeague));
  }, [initialLeague]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setStandings([]);
    setMatches([]);
    setPlayers([]);
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
        if (doc.players) setPlayers(doc.players); // assuming API provides
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

  const handleTeamClick = (team) => {
    if (onTeamSelect && team) onTeamSelect(team);
  };

  const handleBackClick = () => {
    if (onBack) onBack();
  };

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
      {matches.length > 0 ? (
        matches.map((m) => (
          <div key={m.id} className="league-view-match-card">
            <span>{m.utcDate}</span>
            <strong>{m.homeTeam.name}</strong> vs <strong>{m.awayTeam.name}</strong>
          </div>
        ))
      ) : (
        <p>No upcoming matches.</p>
      )}
    </div>
  );

  const renderPlayers = () => (
    <div className="league-view-players-list">
      {players.length > 0 ? (
        players.map((p) => (
          <div key={p.id} className="league-view-player-card">
            <img src={p.photo || '/default-player.png'} alt={p.name} />
            <span>{p.name}</span> - <span>{p.position}</span>
            <span>({p.team})</span>
          </div>
        ))
      ) : (
        <p>No players available.</p>
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