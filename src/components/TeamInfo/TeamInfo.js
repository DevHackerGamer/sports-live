import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api'; 
import TeamPlayers from './TeamPlayers';

import '../../styles/TeamInfo.css';

const TeamInfo = ({ team, onBack }) => {
  const [activeTab, setActiveTab] = useState('about');
  const [loading, setLoading] = useState(false);
  const [teamDetails, setTeamDetails] = useState(team);

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
        
        {activeTab === 'matches' && (
          <div className="tab-content">
            <h2>Upcoming Matches</h2>
            <p>Next matches for {teamDetails.name} will be displayed here.</p>
            {/* TODO: Add matches component */}
          </div>
        )}
        
        {activeTab === 'players' && (
          <div className="tab-content">
            <h2>Team Players</h2>
            <TeamPlayers teamId={teamDetails.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamInfo;
