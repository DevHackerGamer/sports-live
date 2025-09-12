import { useState, useEffect, useCallback } from 'react';
import '../../styles/LeagueStandings.css';

// Lightweight debug logger (enable by setting window.__DEBUG_STANDINGS__ = true in console)
const dlog = (...args) => {
  if (typeof window !== 'undefined' && window.__DEBUG_STANDINGS__) {
    // eslint-disable-next-line no-console
    console.log('[Standings]', ...args);
  }
};

const competitions = [
  { code: "PL", name: "Premier League" },
  { code: "SA", name: "Serie A" },
  { code: "BL1", name: "Bundesliga" },
  { code: "PD", name: "La Liga" },
  { code: "FL1", name: "Ligue 1" },
  { code: "CL", name: "Champions League" }
];

const LeagueStandings = ({ initialLeague = "PL", onBack }) => {
  const [competitionCode, setCompetitionCode] = useState(initialLeague);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Memoize fetchStandings so eslint hook rules are satisfied and we avoid redefining
  const fetchStandings = useCallback(async () => {
    setLoading(true);
    setError('');
    setStandings([]);
    const season = '2025'; // Default season year
    try {
      dlog('Fetching', { competitionCode });
      const res = await fetch(`/api/standings?competition=${competitionCode}&season=${season}`);
      const data = await res.json();
      dlog('Returned ids', Array.isArray(data.data) ? data.data.map(d => d._id) : data.data);
      let doc = null;

      if (Array.isArray(data.data) && data.data.length > 0) {
        dlog('Raw length', data.data.length);
        doc = data.data.find(d => d._id === `${competitionCode}-${season}`);
           if (!doc) {
                doc = data.data.find(d => d.competition?.code?.toUpperCase() === competitionCode.toUpperCase());
      }
      // fallback to first returned doc
      if (!doc) doc = data.data[0];
        dlog('Resolved doc id', doc?._id);
        const table = doc?.standings?.find(s => s.type === 'TOTAL')?.table || doc?.standings?.[0]?.table || [];
        setStandings(table);
      } 
    } catch (err) {
      setError('Failed to load standings. Please try again.');
      dlog('Error', err);
    } finally {
      setLoading(false);
    }
  }, [competitionCode]);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  return (
    <div className="league-standings">
      <div className="league-header">
        <h2>League Standings</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {onBack && (
            <button onClick={onBack} className="section-btn" title="Back">
              ← Back
            </button>
          )}
        </div>
      </div>

      <div className="league-selector">
        <label>Select League:</label>
        <select
          value={competitionCode}
          onChange={(e) => {
            setCompetitionCode(e.target.value);
            dlog('League changed', e.target.value);
          }}
            
          
          
        >
          {competitions.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchStandings} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p>Loading standings...</p>
      ) : (
        <div className="standings-table">
          {standings.length > 0 ? (
            <table key={competitionCode}>
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
                {standings.map((row) => (
                  <tr key={row.team.id}>
                    <td>{row.position}</td>
                    <td className="team-cell">
                      <img
                        src={row.team.crest || '/default-team-logo.png'}
                        alt={row.team.name}
                        className="team-logo"
                      />
                      {row.team.name}
                    </td>
                    <td>{row.playedGames}</td>
                    <td>{row.won}</td>
                    <td>{row.draw}</td>
                    <td>{row.lost}</td>
                    <td>{row.goalDifference}</td>
                    <td className="points">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No standings available</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LeagueStandings;
