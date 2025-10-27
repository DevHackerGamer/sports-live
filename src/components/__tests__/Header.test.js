import React, { useState } from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

const Header = ({
  activeTab,
  setActiveTab,
  setShowAboutUs,
  setSelectedMatch,
  setSelectedTeam,
  isAdmin,
  selectedMatch,
  selectedMatchId
}) => {
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setShowAboutUs(false);
    setSelectedMatch(null); // ✅ Added for test compatibility
    setSelectedTeam(null);  // ✅ Added for test compatibility
    setMobileMenuOpen(false); // Close mobile menu after navigation
  };

  const handleAboutClick = () => {
    setShowAboutUs(true);
    setActiveTab('about');
    setSelectedMatch(null); // ✅ Added for test compatibility
    setSelectedTeam(null);  // ✅ Added for test compatibility
    setMobileMenuOpen(false); // Close mobile menu after navigation
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        {/* Burger Menu Button - Only visible on mobile */}
        <button
          className="burger-menu-button"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} />
        </button>

        {/* Logo - Hidden on mobile, shown on desktop */}
        <div className="logo-trapezoid desktop-logo">
          <span className="logo-text">SportsLive</span>
        </div>

        {/* Navigation Menu */}
        <nav
          className={`dashboard-nav ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}
          role="navigation"
        >
          {/* Logo inside mobile menu */}
          <div className="mobile-menu-logo">
            <div className="logo-trapezoid">
              <span className="logo-text">SportsLive</span>
            </div>
          </div>

          <ul>
            <li><button onClick={() => handleNavClick('home')}>Home</button></li>
            <li><button onClick={() => handleNavClick('favorites')}>Favourites</button></li>
            <li><button onClick={() => handleNavClick('watchlist')}>Watchlist</button></li>
            {isAdmin && (
              <>
                <li><button onClick={() => handleNavClick('matchSetup')}>Setup</button></li>
                {(selectedMatch || selectedMatchId) && (
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
          <span className="user-greeting">Welcome, {user?.firstName || 'User'}</span>
          <UserButton />
        </div>
      </div>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={toggleMobileMenu}
          role="button"
          tabIndex={0}
          aria-label="Close menu overlay"
        />
      )}
    </header>
  );
};

export default Header;
