// LineupsAdminModal.js
import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import '../../styles/LineupsAdminModal.css';

const LineupsAdminModal = ({ match, onClose }) => {
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [lineups, setLineups] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!match) return;
      setLoading(true);

      try {
        const homeTeamObj = match?.homeTeam || null;
        const awayTeamObj = match?.awayTeam || null;
        const homeNameRaw = homeTeamObj?.name || 'Home';
        const awayNameRaw = awayTeamObj?.name || 'Away';
        const homeNameLc = homeNameRaw.toLowerCase();
        const awayNameLc = awayNameRaw.toLowerCase();

        // ✅ More robust player-fetch logic
        const fetchPlayers = async (teamObj, fallbackName) => {
          if (!teamObj && !fallbackName) return [];
          let teamId = teamObj?.id || teamObj?._id;

          // Normalize numeric ID
          if (teamId && typeof teamId === 'string' && /^\d+$/.test(teamId))
            teamId = parseInt(teamId, 10);

          // Try fetching players by teamId
          if (teamId) {
            try {
              const res = await fetch(`/api/players?teamId=${encodeURIComponent(teamId)}`);
              if (res.ok) {
                const pdata = await res.json();
                if (Array.isArray(pdata.players) && pdata.players.length)
                  return pdata.players;
              }
            } catch (err) {
              console.warn('Player fetch by teamId failed', teamId, err);
            }
          }

          if (fallbackName) {
            console.info(
              `No players returned for ${fallbackName}. Ensure Players collection has matching teamId.`
            );
          }
          return [];
        };

        const [homeRes, awayRes] = await Promise.all([
          fetchPlayers(homeTeamObj, homeNameRaw),
          fetchPlayers(awayTeamObj, awayNameRaw),
        ]);

        setHomePlayers(homeRes);
        setAwayPlayers(awayRes);

        // Fetch any saved lineups
        const savedLineup = await apiClient.getLineupsByMatch(match.id);
        if (Array.isArray(savedLineup) && savedLineup.length > 0) {
          setLineups(
            savedLineup.reduce((acc, l) => {
              acc[l.teamId] = l;
              return acc;
            }, {})
          );
        }

        console.log('✅ Home players:', homeRes);
        console.log('✅ Away players:', awayRes);
      } catch (err) {
        console.error('❌ Error fetching lineups or players', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [match]);

  // Inside the component, add a helper to get remaining starter slots
const getRemainingStarters = (teamId) => {
  const teamLineup = lineups[teamId] || { starters: [] };
  return 11 - teamLineup.starters.length;
};

// Updated toggle logic
const handleToggleStarter = (teamId, player) => {
  const teamLineup = lineups[teamId] || { starters: [], substitutes: [] };
  const isStarter = teamLineup.starters.find((p) => p.id === player.id);

  if (isStarter) {
    // Move starter to substitutes
    teamLineup.starters = teamLineup.starters.filter((p) => p.id !== player.id);
    teamLineup.substitutes.push(player);
  } else {
    if (teamLineup.starters.length < 11) {
      // Move from substitutes or new player to starters
      teamLineup.substitutes = teamLineup.substitutes.filter((p) => p.id !== player.id);
      teamLineup.starters.push(player);
    } else {
      // If 11 starters, add to substitutes only if not already there
      if (!teamLineup.substitutes.find((p) => p.id === player.id)) {
        teamLineup.substitutes.push(player);
      }
    }
  }

  setLineups({ ...lineups, [teamId]: teamLineup });
};


  const handleSave = async () => {
  try {
    const homeTeamId = String(match.homeTeam?.id);
    const awayTeamId = String(match.awayTeam?.id);

    for (const teamId in lineups) {
     

      const teamPlayers =
        teamId === homeTeamId ? homePlayers : awayPlayers;

      const teamLineup = lineups[teamId] || { starters: [], substitutes: [] };

      // Ensure substitutes include all non-starters
      const startersIds = teamLineup.starters.map((p) => p.id);
      const allSubstitutes = [
        ...teamLineup.substitutes,
        ...teamPlayers.filter((p) => !startersIds.includes(p.id)),
      ];

      const lineupToSave = {
  ...teamLineup,
  matchId: match.id,
  teamId,
  teamName:
    teamId === String(match.homeTeam?.id)
      ? match.homeTeam?.name
      : match.awayTeam?.name,
  lastUpdated: new Date().toISOString(),
  substitutes: allSubstitutes,
};


      await apiClient.saveLineup(lineupToSave);
    }
    alert('✅ Lineups saved successfully');
    onClose();
  } catch (e) {
    console.error('Error saving lineups:', e);
    alert('❌ Failed to save lineups');
  }
};

  if (loading) return <div>Loading lineups...</div>;

  return (
    <div className="lineups-modal">
     <h3>{match.homeTeam?.name} Lineup</h3>
<p>
  Click a player to toggle Starter/Substitute. 
  <strong>{getRemainingStarters(match.homeTeam?.id)} starter slots remaining</strong>
</p>
<div className="lineup-grid">
  {homePlayers.map((player) => {
    const isStarter = lineups[match.homeTeam?.id]?.starters?.find(
      (p) => p.id === player.id
    );
    return (
      <div
        key={player.id}
        className={`player-card ${isStarter ? 'starter' : 'substitute'}`}
        onClick={() => handleToggleStarter(match.homeTeam?.id, player)}
      >
        {player.name} ({player.position})
      </div>
    );
  })}
</div>

<h3>{match.awayTeam?.name} Lineup</h3>
<p>
  Click a player to toggle Starter/Substitute. 
  <strong>{getRemainingStarters(match.awayTeam?.id)} starter slots remaining</strong>
</p>
<div className="lineup-grid">
  {awayPlayers.map((player) => {
    const isStarter = lineups[match.awayTeam?.id]?.starters?.find(
      (p) => p.id === player.id
    );
    return (
      <div
        key={player.id}
        className={`player-card ${isStarter ? 'starter' : 'substitute'}`}
        onClick={() => handleToggleStarter(match.awayTeam?.id, player)}
      >
        {player.name} ({player.position})
      </div>
    );
  })}
</div>

      {/* ✅ Starter summary display */}
      <div className="lineup-summary">
        <h4>Starters Summary</h4>
        <div className="summary-section">
          <strong>{match.homeTeam?.name}:</strong>
          <ul>
            {(lineups[match.homeTeam?.id]?.starters || []).map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </div>
        <div className="summary-section">
          <strong>{match.awayTeam?.name}:</strong>
          <ul>
            {(lineups[match.awayTeam?.id]?.starters || []).map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </div>
      </div>

      <button onClick={handleSave} className="btn btn-primary">
        Save Lineups
      </button>
      <button onClick={onClose} className="btn btn-secondary" style={{ marginLeft: 8 }}>
        Cancel
      </button>
    </div>
  );
};

export default LineupsAdminModal;
