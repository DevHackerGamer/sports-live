import React, { useState } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import LiveSports from '../sports/LiveSports';
import FavoritesPanel from '../favouritespanel/FavoritesPanel';
import MatchViewer from '../matchViewer/MatchViewer';
import MatchSetup from '../matchsetup/MatchSetup';
import LiveInput from '../liveInput/LiveInput';
import '../../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('liveSports');
  const [selectedMatch, setSelectedMatch] = useState(null);

  const handleMatchSelect = (match) => {
    console.log('Match selected:', match);
    setSelectedMatch(match);
    setActiveTab('matchViewer');
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'matchViewer':
        return <MatchViewer match={selectedMatch} />;
      case 'matchSetup':
        return <MatchSetup />;
      case 'liveInput':
        return <LiveInput />;
      case 'liveSports':
      default:
        return (
          <>
            <FavoritesPanel />
            <LiveSports onMatchSelect={handleMatchSelect} />
          </>
        );
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="brand-section">
          <h1 className="app-title">Sports Live</h1>
          <p className="app-subtitle">Real-time football scores and live match updates</p>
        </div>
        <div className="user-section">
          <span className="user-greeting">Welcome, {user?.firstName || 'User'}</span>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10",
                userButtonPopover: "shadow-lg border"
              }
            }}
          />
        </div>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={activeTab === 'liveSports' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('liveSports')}
        >
          Live Sports
        </button>
        <button 
          className={activeTab === 'matchViewer' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('matchViewer')}
        >
          Match Viewer
        </button>
        <button 
          className={activeTab === 'matchSetup' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('matchSetup')}
        >
          Match Setup
        </button>
        <button 
          className={activeTab === 'liveInput' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('liveInput')}
        >
          Live Input
        </button>
      </nav>

      <main className="dashboard-main">
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;