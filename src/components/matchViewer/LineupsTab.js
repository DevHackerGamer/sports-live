import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import '../../styles/LineupsTab.css';

const LineupsTab = ({ match, matchDetails }) => {
  const [lineups, setLineups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamLogos, setTeamLogos] = useState({ home: '', away: '' });
  const [teamNames, setTeamNames] = useState({ home: '', away: '' });

  useEffect(() => {
    if (!match) return;

    const fetchLineupsAndTeams = async () => {
      try {
        setLoading(true);

        // 1️⃣ Determine display names
        const displayMatchRaw = matchDetails || match;
        const homeName = displayMatchRaw?.homeTeam?.name || displayMatchRaw?.homeTeam || '';
        const awayName = displayMatchRaw?.awayTeam?.name || displayMatchRaw?.awayTeam || '';
        setTeamNames({ home: homeName, away: awayName });

        // 2️⃣ Fetch all teams to resolve logos
        const teamsRes = await apiClient.getTeams();
        const teams = teamsRes.data || [];

        const homeTeamObj = teams.find((t) => (t.name || '').toLowerCase() === homeName.toLowerCase());
        const awayTeamObj = teams.find((t) => (t.name || '').toLowerCase() === awayName.toLowerCase());

        // 3️⃣ Set team logos (matchDetails first, fallback to teams collection)
        setTeamLogos({
          home:
            displayMatchRaw.homeTeam?.crest ||
            displayMatchRaw.homeTeam?.logo ||
            homeTeamObj?.crest ||
            homeTeamObj?.logo ||
            '',
          away:
            displayMatchRaw.awayTeam?.crest ||
            displayMatchRaw.awayTeam?.logo ||
            awayTeamObj?.crest ||
            awayTeamObj?.logo ||
            '',
        });

        // 4️⃣ Fetch lineups
        const lineupData = await apiClient.getLineupsByMatch(match.id);

        // 5️⃣ Normalize "home"/"away" IDs to actual numeric IDs for easier UI handling
        const normalizedLineups = (lineupData || []).map((l) => {
          if (l.teamId === 'home') return { ...l, teamId: homeTeamObj?.id || 'home' };
          if (l.teamId === 'away') return { ...l, teamId: awayTeamObj?.id || 'away' };
          return l;
        });

        setLineups(normalizedLineups);
      } catch (err) {
        console.error('Error fetching lineups:', err);
        setError(err.message || 'Failed to fetch lineups');
      } finally {
        setLoading(false);
      }
    };

    fetchLineupsAndTeams();
  }, [match, matchDetails]);

  if (loading) return <div>Loading lineups...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!lineups.length) return <div>⚠️ No lineup data found for this match.</div>;

  // Resolve lineups by teamName first (more reliable across sources)
  const homeLineup =
    lineups.find(
      (l) => (l.teamName || '').toLowerCase() === (teamNames.home || '').toLowerCase()
    ) || lineups[0];
  const awayLineup =
    lineups.find(
      (l) => (l.teamName || '').toLowerCase() === (teamNames.away || '').toLowerCase()
    ) || lineups.find((l) => l !== homeLineup) || lineups[1];

  const renderTable = (lineup, teamName, logo) => (
    <div className="lineup-section">
      <h3>
        <img src={logo} alt={teamName} style={{ width: 32, marginRight: 8 }} />
        {teamName}
      </h3>

      <h4 className="lineup-header starters">Starters</h4>
      <table className="lineups-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Position</th>
            <th>Nationality</th>
          </tr>
        </thead>
        <tbody>
          {(lineup?.starters || []).map((p, i) => (
            <tr key={p._id || p.id || i}>
              <td>{p.jersey || i + 1}</td>
              <td>{p.name}</td>
              <td>{p.position}</td>
              <td>{p.nationality}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="lineup-header substitutes">Substitutes</h4>
      <table className="lineups-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Position</th>
            <th>Nationality</th>
          </tr>
        </thead>
        <tbody>
          {(lineup?.substitutes || []).map((p, i) => (
            <tr key={p._id || p.id || i}>
              <td>{p.jersey || i + 1}</td>
              <td>{p.name}</td>
              <td>{p.position}</td>
              <td>{p.nationality}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="lineups-tab horizontal">
      {renderTable(
        lineups.find((l) => l.teamId === homeLineup?.teamId) || {},
        teamNames.home,
        teamLogos.home
      )}
      {renderTable(
        lineups.find((l) => l.teamId === awayLineup?.teamId) || {},
        teamNames.away,
        teamLogos.away
      )}
    </div>
  );
};

export default LineupsTab;
