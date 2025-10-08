import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api'; 
import TeamPlayers from './TeamPlayers';

import '../../styles/TeamInfo.css';

const TeamInfo = ({ team, onBack }) => {
  const [activeTab, setActiveTab] = useState('about');
  const [loading, setLoading] = useState(false);
  const [teamDetails, setTeamDetails] = useState(team);
  const [nextMatches, setNextMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!team?.id) return;
      setLoading(true);
      try {
        const res = await apiClient.getTeamById(team.id);
        if (res.success) setTeamDetails(res.data);
      } catch (err) {
        console.error("Error fetching team info", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [team]);

  useEffect(() => {
  const fetchTeamMatches = async () => {
    if (!team?.id || activeTab !== 'matches') return;

    setLoadingMatches(true);
    try {
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 30, 23, 59, 59, 999));
      const toISODate = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
      
      const res = await apiClient.getMatchesByDate(toISODate(start), toISODate(end), 1000);
      const teamMatches = (res.data || []).filter(m =>
        (m.homeTeam?.id === team.id || m.awayTeam?.id === team.id)
      ).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

      setNextMatches(teamMatches);
    } catch (err) {
      console.error("Error fetching team matches:", err);
      setNextMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  fetchTeamMatches();
}, [team, activeTab]);



  if (!teamDetails) return null;

  return (
    <div className="team-info-container">
      <div className="team-info-header">
        <button className="back-button" onClick={onBack}>
          ← Back 
        </button>
        <div className="team-header-content">
          {teamDetails.crest && (
            <img className="team-info-crest" alt={`${teamDetails.name} crest`} src={teamDetails.crest} />
          )}
          <h1 className="team-info-name">{teamDetails.name}</h1>
        </div>
      </div>

      <nav className="team-info-nav">
        <button 
          className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About Team
        </button>
        <button 
          className={`nav-tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          Next Matches
        </button>
        <button 
          className={`nav-tab ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          Players
        </button>
      </nav>

      <div className="team-info-content">
        {activeTab === 'about' && (
          <div className="tab-content">
            <h2>About {teamDetails.name}</h2>
            <ul className="team-info-list">
              <li><strong>Founded:</strong> {teamDetails.founded}</li>
              <li><strong>Short Name:</strong> {teamDetails.shortName}</li>
              <li><strong>Abbreviation (TLA):</strong> {teamDetails.tla}</li>
              <li><strong>Venue:</strong> {teamDetails.venue}</li>
              <li><strong>Address:</strong> {teamDetails.address}</li>
              <li><strong>Club Colors:</strong> {teamDetails.clubColors}</li>
              <li><strong>Website:</strong> <a href={teamDetails.website} target="_blank" rel="noreferrer">{teamDetails.website}</a></li>
            </ul>
          </div>
        )}
         {activeTab === 'players' && (
          <div className="tab-content">
            <h2>Team Players</h2>
            <TeamPlayers teamId={teamDetails.id} />
          </div>
        )}
        
        {activeTab === 'matches' && (
  <div className="tab-content">
    <h2>Upcoming Matches</h2>
    {loadingMatches ? (
      <p>Loading upcoming matches...</p>
    ) : nextMatches.length ? (
      <div className="team-next-matches">
        {nextMatches.map((match) => (
          <div
            key={match.id}
            className="team-next-match ls-clickable"
            onClick={() => onBack(match)} // Opens MatchViewer
          >
            {/* Match header: Date & Time */}
            <div className="match-header">
              <span className="match-date">
                {new Date(match.utcDate).toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="match-time">
                {new Date(match.utcDate).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Teams section */}
            <div className="match-teams">
              <div className="team-info-match-team">
                {match.homeTeam?.crest && (
                  <img
                    src={match.homeTeam.crest}
                    alt={`${match.homeTeam.name} crest`}
                    className="team-crest"
                    onClick={(e) => e.stopPropagation()} // optional: prevent triggering card click
                  />
                )}
                <span>{match.homeTeam?.name}</span>
              </div>

              <div className="team-info-match-vs">vs</div>

              <div className="team-info-match-team">
                {match.awayTeam?.crest && (
                  <img
                    src={match.awayTeam.crest}
                    alt={`${match.awayTeam.name} crest`}
                    className="team-crest"
                    onClick={(e) => e.stopPropagation()} // optional
                  />
                )}
                <span>{match.awayTeam?.name}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p>No upcoming matches scheduled for {teamDetails.name}.</p>
    )}
  </div>
)}

       
      </div>
    </div>
  );
};

export default TeamInfo;
