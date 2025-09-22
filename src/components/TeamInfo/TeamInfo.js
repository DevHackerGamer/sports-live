import React, { useState } from 'react';
import '../../styles/TeamInfo.css';

const TeamInfo = ({ team, onBack }) => {
  const [activeTab, setActiveTab] = useState('players');
  
  if (!team) return null;

  return (
    <div className="team-info-container">
      <div className="team-info-header">
        <button className="back-button" onClick={onBack}>
          ← Back 
        </button>
        <div className="team-header-content">
          {team.crest && (
            <img className="team-info-crest" alt={`${team.name} crest`} src={team.crest} />
          )}
          <h1 className="team-info-name">{team.name}</h1>
        </div>
      </div>

      <nav className="team-info-nav">
        <button 
          className={`nav-tab ${activeTab === ' about' ? 'active' : ''}`}
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
            <h2>Team Information</h2>
            <p>Team information will be displayed here.</p>
            {/* Add about team component here */}
          </div>
        )}
        
        {activeTab === 'matches' && (
          <div className="tab-content">
            <h2>Upcoming Matches</h2>
            <p>Next matches for {team.name} will be displayed here.</p>
            {/* Add matches component here */}
          </div>
        )}
        
        {activeTab === 'players' && (
          <div className="tab-content">
            <h2>Team Players</h2>
            <p>Player information will be displayed here.</p>
            {/* Add player list component here */}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamInfo;