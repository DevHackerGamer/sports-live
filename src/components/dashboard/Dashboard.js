import React from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import LiveSports from '../sports/LiveSports';
import FavoritesPanel from './FavoritesPanel';
import '../../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useUser();
  // frontend do some justice to this :(
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

      <main className="dashboard-main">
        {/* Favorites panel updates in real-time from Firebase */}
        <FavoritesPanel />
        {/* LiveSports updates in real-time from Firebase */}
        <LiveSports />
      </main>
    </div>
  );
};

export default Dashboard;
