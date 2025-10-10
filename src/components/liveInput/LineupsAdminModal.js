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

  // ✅ Fix toggle logic (consistent with player.id)
  const handleToggleStarter = (teamId, player) => {
    const teamLineup = lineups[teamId] || { starters: [], substitutes: [] };

    const isStarter = teamLineup.starters.find((p) => p.id === player.id);

    if (isStarter) {
      teamLineup.starters = teamLineup.starters.filter((p) => p.id !== player.id);
      teamLineup.substitutes.push(player);
    } else {
      teamLineup.substitutes = teamLineup.substitutes.filter((p) => p.id !== player.id);
      teamLineup.starters.push(player);
    }

    setLineups({ ...lineups, [teamId]: teamLineup });
  };

  const handleSave = async () => {
    try {
      for (const teamId in lineups) {
        const lineupToSave = {
          ...lineups[teamId],
          matchId: match.id,
          teamId,
          teamName:
            teamId === match.homeTeam?.id
              ? match.homeTeam?.name
              : match.awayTeam?.name,
          lastUpdated: new Date().toISOString(),
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
      <p>Click a player to toggle Starter/Substitute</p>

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
