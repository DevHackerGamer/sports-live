import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import '../../styles/LineupsTab.css';

const LineupsTab = ({ match, matchDetails }) => {
  const [lineups, setLineups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamLogos, setTeamLogos] = useState({ home: '', away: '' });
  const [teamIds, setTeamIds] = useState({ home: null, away: null });
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
       

        // 2️⃣ Fetch all teams to resolve IDs & logos
        const teamsRes = await apiClient.getTeams();
        const teams = teamsRes.data || [];
        

        const homeTeamObj = teams.find(
          (t) => (t.name || '').toLowerCase() === homeName.toLowerCase()
        );
        const awayTeamObj = teams.find(
          (t) => (t.name || '').toLowerCase() === awayName.toLowerCase()
        );

        const homeTeamId = homeTeamObj?.id || homeTeamObj?._id;
        const awayTeamId = awayTeamObj?.id || awayTeamObj?._id;
        setTeamIds({ home: homeTeamId, away: awayTeamId });
        

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
        console.log('Resolved team logos:', teamLogos);

        // 4️⃣ Fetch lineups from API
        const lineupData = await apiClient.getLineupsByMatch(match.id);
        

        setLineups(lineupData || []);
        

      } catch (err) {
        ;
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

  // Find lineups by resolved IDs
  const homeLineup = lineups.find((l) => String(l.teamId) === String(teamIds.home));
  const awayLineup = lineups.find((l) => String(l.teamId) === String(teamIds.away));

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
          {(lineup?.starters || []).map((p, i) => {
           
            return (
              <tr key={p._id || i}>
                <td>{i + 1}</td>
                <td>{p.name}</td>
                <td>{p.position}</td>
                <td>{p.nationality}</td>
              </tr>
            );
          })}
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
          {(lineup?.substitutes || []).map((p, i) => {
            
            return (
              <tr key={p._id || i}>
                <td>{i + 1}</td>
                <td>{p.name}</td>
                <td>{p.position}</td>
                <td>{p.nationality}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
 <div className="lineups-tab horizontal">
  {renderTable(homeLineup, teamNames.home, teamLogos.home)}
  {renderTable(awayLineup, teamNames.away, teamLogos.away)}
</div>

  );
};

export default LineupsTab;
