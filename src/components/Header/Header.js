// components/Header/Header.js
import React from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';

const Header = ({ 
  activeTab, 
  setActiveTab, 
  setShowAboutUs, 
  setSelectedMatch, 
  setSelectedTeam, 
  isAdmin, 
  selectedMatch 
}) => {
  const { user } = useUser();

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setShowAboutUs(false);
    setSelectedMatch(null);
    setSelectedTeam(null);
  };

  const handleAboutClick = () => {
    setShowAboutUs(true);
    setActiveTab('');
    setSelectedMatch(null);
    setSelectedTeam(null);
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <div className="logo-trapezoid">
          <span className="logo-text">SportsLive</span>
        </div>
        <nav className="dashboard-nav">
          <ul>
            <li><button onClick={() => handleNavClick('home')}>Home</button></li>
            <li><button onClick={() => handleNavClick('favorites')}>Favourites</button></li>
            <li><button onClick={() => handleNavClick('watchlist')}>Watchlist</button></li>
            {isAdmin && (
              <>
                <li><button onClick={() => handleNavClick('matchSetup')}>Setup</button></li>
                {selectedMatch && (
                  <li>
                    <button
                      onClick={() => handleNavClick('liveInput')}
                      title="Enter live input for the selected match"
                    >
                      Live Input
                    </button>
                  </li>
                )}
                <li><button onClick={() => handleNavClick('reports')}>Reports</button></li>
              </>
            )}
            <li><button onClick={handleAboutClick}>About</button></li>
          </ul>
        </nav>
      </div>
      <div className="header-right">
        <div className="user-section">
          <span>Welcome, {user?.firstName || 'User'}</span>
          <UserButton />
        </div>
      </div>
    </header>
  );
};

export default Header;