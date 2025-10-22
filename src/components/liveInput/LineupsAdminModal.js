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
        const homeNameRaw = match.homeTeam?.name || match.homeTeam;
        const awayNameRaw = match.awayTeam?.name || match.awayTeam;
        const embeddedHomeId =
          match.homeTeamId || match.homeTeam?.id || match.homeTeam?._id;
        const embeddedAwayId =
          match.awayTeamId || match.awayTeam?.id || match.awayTeam?._id;

        let homeTeamObj = embeddedHomeId
          ? {
              id: embeddedHomeId,
              name: homeNameRaw,
              crest: match.homeTeam?.crest || match.homeTeam?.logo,
            }
          : null;
        let awayTeamObj = embeddedAwayId
          ? {
              id: embeddedAwayId,
              name: awayNameRaw,
              crest: match.awayTeam?.crest || match.awayTeam?.logo,
            }
          : null;

        // fallback: resolve from Teams collection if IDs missing
        if (!homeTeamObj || !awayTeamObj) {
          try {
            const teamsRes = await apiClient.getTeams();
            const teams = teamsRes?.data || teamsRes || [];
            const findTeam = (nm) =>
              teams.find(
                (t) => (t.name || '').toLowerCase() === (nm || '').toLowerCase()
              );
            if (!homeTeamObj) homeTeamObj = findTeam(homeNameRaw);
            if (!awayTeamObj) awayTeamObj = findTeam(awayNameRaw);
          } catch (e) {
            console.warn('⚠️ Could not load teams to resolve missing IDs', e);
          }
        }

        const fetchPlayers = async (teamObj, fallbackName) => {
          if (!teamObj && !fallbackName) return [];
          let teamId = teamObj?.id || teamObj?._id;
          if (teamId && typeof teamId === 'string' && /^\d+$/.test(teamId))
            teamId = parseInt(teamId, 10);

          try {
            if (teamId) {
              const res = await fetch(
                `/api/players?teamId=${encodeURIComponent(teamId)}`
              );
              if (res.ok) {
                const pdata = await res.json();
                if (Array.isArray(pdata.players) && pdata.players.length)
                  return pdata.players;
              }
            }
            if (fallbackName) {
              const resByName = await fetch(
                `/api/players?teamName=${encodeURIComponent(fallbackName)}`
              );
              if (resByName.ok) {
                const pdataByName = await resByName.json();
                if (
                  Array.isArray(pdataByName.players) &&
                  pdataByName.players.length
                )
                  return pdataByName.players;
              }
            }
          } catch (err) {
            console.warn('Player fetch failed', teamId, err);
          }

          console.warn(`⚠️ No players found for ${fallbackName}`);
          return [];
        };

        const [homeList, awayList] = await Promise.all([
          fetchPlayers(homeTeamObj, homeNameRaw),
          fetchPlayers(awayTeamObj, awayNameRaw),
        ]);

        setHomePlayers(homeList);
        setAwayPlayers(awayList);

        // fetch saved lineups
        const savedRes = await apiClient.getLineupsByMatch(match.id);
        const savedLineup = Array.isArray(savedRes)
          ? savedRes
          : savedRes?.data || savedRes?.lineups || [];

        if (savedLineup?.length) {
          setLineups(
            savedLineup.reduce((acc, l) => {
              acc[l.teamId] = l;
              return acc;
            }, {})
          );
        }

        console.log('✅ Home players:', homeList);
        console.log('✅ Away players:', awayList);
      } catch (err) {
        console.error('❌ Error fetching lineups or players', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [match]);

  // ✅ safe team IDs (ensure unique per side)
  const homeTeamId = String(
    match.homeTeam?.id || match.homeTeamId || 'home'
  );
  const awayTeamId = String(
    match.awayTeam?.id || match.awayTeamId || 'away'
  );

  // helper: remaining starter slots per team
  const getRemainingStarters = (teamId) => {
    const teamLineup = lineups[teamId] || { starters: [] };
    return 11 - teamLineup.starters.length;
  };

  // toggle logic (independent per team)
  const handleToggleStarter = (teamId, player) => {
    setLineups((prevLineups) => {
      const newLineups = { ...prevLineups };
      const prevTeamLineup = newLineups[teamId] || {
        starters: [],
        substitutes: [],
      };
      const teamLineup = {
        starters: [...prevTeamLineup.starters],
        substitutes: [...prevTeamLineup.substitutes],
      };

      const isStarter = teamLineup.starters.find((p) => p.id === player.id);

      if (isStarter) {
        // move starter → subs
        teamLineup.starters = teamLineup.starters.filter(
          (p) => p.id !== player.id
        );
        if (!teamLineup.substitutes.find((p) => p.id === player.id)) {
          teamLineup.substitutes.push(player);
        }
      } else {
        if (teamLineup.starters.length < 11) {
          teamLineup.substitutes = teamLineup.substitutes.filter(
            (p) => p.id !== player.id
          );
          teamLineup.starters.push(player);
        } else {
          alert('⚠️ You already have 11 starters for this team!');
          return prevLineups;
        }
      }

      newLineups[teamId] = teamLineup;
      return newLineups;
    });
  };

  const handleSave = async () => {
    try {
      const homeTeamId = String(
        match.homeTeam?.id || match.homeTeamId || 'home'
      );
      const awayTeamId = String(
        match.awayTeam?.id || match.awayTeamId || 'away'
      );

      for (const teamId in lineups) {
        const teamPlayers =
          teamId === homeTeamId ? homePlayers : awayPlayers;

        const teamLineup =
          lineups[teamId] || { starters: [], substitutes: [] };

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
            teamId === homeTeamId
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

  if (loading) return <div className="lineups-loading">Loading lineups...</div>;

  const homeCrest = match.homeTeam?.crest || match.homeTeam?.logo;
  const awayCrest = match.awayTeam?.crest || match.awayTeam?.logo;

  return (
    <div className="lineups-modal-overlay">
      <div className="lineups-modal-content">
        <div className="lineups-modal-header">
          <h3>Edit Match Lineups</h3>
          <button className="lineups-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="lineups-split-layout">
          {/* Home Team */}
          <div className="team-lineup-section home-team">
            <div className="team-header">
              {homeCrest && (
                <img src={homeCrest} alt={`${match.homeTeam?.name} crest`} className="team-crest" />
              )}
              <h4>{match.homeTeam?.name}</h4>
              <div className="starters-remaining">
                {getRemainingStarters(homeTeamId)} starters remaining
              </div>
            </div>
            
            <div className="players-section">
              <h5>Starters ({lineups[homeTeamId]?.starters?.length || 0}/11)</h5>
              <div className="players-grid starters-grid">
                {(lineups[homeTeamId]?.starters || []).map((player) => (
                  <div
                    key={player.id}
                    className="player-card starter"
                    onClick={() => handleToggleStarter(homeTeamId, player)}
                  >
                    <div className="player-name">{player.name}</div>
                    <div className="player-position">{player.position}</div>
                  </div>
                ))}
              </div>

              <h5>Substitutes</h5>
              <div className="players-grid substitutes-grid">
                {homePlayers.map((player) => {
                  const isStarter = lineups[homeTeamId]?.starters?.find(
                    (p) => p.id === player.id
                  );
                  if (!isStarter) {
                    return (
                      <div
                        key={player.id}
                        className="player-card substitute"
                        onClick={() => handleToggleStarter(homeTeamId, player)}
                      >
                        <div className="player-name">{player.name}</div>
                        <div className="player-position">{player.position}</div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>

          {/* Center Divider */}
          <div className="lineups-divider">
            <div className="divider-line"></div>
            <div className="divider-text">VS</div>
            <div className="divider-line"></div>
          </div>

          {/* Away Team */}
          <div className="team-lineup-section away-team">
            <div className="team-header">
              {awayCrest && (
                <img src={awayCrest} alt={`${match.awayTeam?.name} crest`} className="team-crest" />
              )}
              <h4>{match.awayTeam?.name}</h4>
              <div className="starters-remaining">
                {getRemainingStarters(awayTeamId)} starters remaining
              </div>
            </div>
            
            <div className="players-section">
              <h5>Starters ({lineups[awayTeamId]?.starters?.length || 0}/11)</h5>
              <div className="players-grid starters-grid">
                {(lineups[awayTeamId]?.starters || []).map((player) => (
                  <div
                    key={player.id}
                    className="player-card starter"
                    onClick={() => handleToggleStarter(awayTeamId, player)}
                  >
                    <div className="player-name">{player.name}</div>
                    <div className="player-position">{player.position}</div>
                  </div>
                ))}
              </div>

              <h5>Substitutes</h5>
              <div className="players-grid substitutes-grid">
                {awayPlayers.map((player) => {
                  const isStarter = lineups[awayTeamId]?.starters?.find(
                    (p) => p.id === player.id
                  );
                  if (!isStarter) {
                    return (
                      <div
                        key={player.id}
                        className="player-card substitute"
                        onClick={() => handleToggleStarter(awayTeamId, player)}
                      >
                        <div className="player-name">{player.name}</div>
                        <div className="player-position">{player.position}</div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="lineups-modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save Lineups
          </button>
        </div>
      </div>
    </div>
  );
};

export default LineupsAdminModal;
