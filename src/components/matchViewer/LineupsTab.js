import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import '../../styles/LineupsTab.css';

const LineupsTab = ({ match }) => {
  const [homeLineup, setHomeLineup] = useState(null);
  const [awayLineup, setAwayLineup] = useState(null);
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!match) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1️⃣ Normalize team references
        const homeTeamObj = match.homeTeam || { name: match.homeTeam };
        const awayTeamObj = match.awayTeam || { name: match.awayTeam };

        // 2️⃣ Fetch saved lineups (if any)
        const savedLineups = await apiClient.getLineupsByMatch(match.id);
        const lineupMap = Array.isArray(savedLineups)
          ? savedLineups.reduce((acc, l) => {
              acc[l.teamId] = l;
              return acc;
            }, {})
          : {};

        setHomeLineup(lineupMap[homeTeamObj.id] || null);
        setAwayLineup(lineupMap[awayTeamObj.id] || null);

        // 3️⃣ Define safe player fetch helper
        const fetchPlayers = async (teamObj, fallbackName) => {
          if (!teamObj && !fallbackName) return [];
          let teamId = teamObj?.id || teamObj?._id;
          if (teamId && typeof teamId === 'string' && /^\d+$/.test(teamId))
            teamId = parseInt(teamId, 10);

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
          console.info(`No players found for ${fallbackName}`);
          return [];
        };

        // 4️⃣ Fetch players for both teams
        const [homeRes, awayRes] = await Promise.all([
          fetchPlayers(homeTeamObj, homeTeamObj.name),
          fetchPlayers(awayTeamObj, awayTeamObj.name),
        ]);

        setHomePlayers(homeRes);
        setAwayPlayers(awayRes);
      } catch (err) {
        console.error('❌ Error fetching lineups tab data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [match]);

  const calculateAge = (dob) =>
    dob
      ? Math.floor(
          (new Date() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25)
        )
      : 'N/A';

  if (loading) return <p>Loading Lineups...</p>;

  const renderLineupSection = (title, lineup, allPlayers) => {
    if (!lineup && allPlayers.length === 0)
      return <p>No data for {title}</p>;

    const starters = lineup?.starters || [];
    const subs = lineup?.substitutes || [];

    return (
      <div className="team-lineup">
        <h3>{title}</h3>

        {lineup ? (
          <>
            <h4>Starters</h4>
            <div className="players-list">
              {starters.length ? (
                starters.map((p) => (
                  <div key={p.playerId} className="player-card starter">
                    <strong>{p.name}</strong> ({p.position})
                  </div>
                ))
              ) : (
                <p>No starters recorded.</p>
              )}
            </div>

            <h4>Substitutes</h4>
            <div className="players-list">
              {subs.length ? (
                subs.map((p) => (
                  <div key={p.playerId} className="player-card substitute">
                    <strong>{p.name}</strong> ({p.position})
                  </div>
                ))
              ) : (
                <p>No substitutes recorded.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <h4>Full Squad (no saved lineup)</h4>
            <div className="players-list">
              {allPlayers.map((p) => (
                <div key={p._id} className="player-card">
                  <strong>{p.name}</strong> ({p.position}) - {p.nationality} - Age:{' '}
                  {calculateAge(p.dateOfBirth)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="lineups-tab">
      {renderLineupSection(
        match.homeTeam?.name || match.homeTeam,
        homeLineup,
        homePlayers
      )}
      {renderLineupSection(
        match.awayTeam?.name || match.awayTeam,
        awayLineup,
        awayPlayers
      )}
    </div>
  );
};

export default LineupsTab;
