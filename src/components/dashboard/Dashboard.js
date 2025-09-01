import React, { useEffect, useState } from 'react';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import LiveSports from '../sports/LiveSports';
import FavoritesPanel from '../favouritespanel/FavoritesPanel';
import MatchViewer from '../matchViewer/MatchViewer';
import MatchSetup from '../matchsetup/MatchSetup';
import LiveInput from '../liveInput/LiveInput';
import { isAdminFromUser, getUserRoles } from '../../lib/roles';
import '../../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useUser();
  const { getToken, isSignedIn } = useAuth();
  // Seed from Clerk metadata so admins see tabs immediately (case-insensitive)
  const clerkIsAdmin = isAdminFromUser(user);
  const [isAdmin, setIsAdmin] = useState(!!clerkIsAdmin);

  // Keep isAdmin in sync with Clerk metadata on user change
  useEffect(() => {
    setIsAdmin(isAdminFromUser(user));
  }, [user?.id, user?.privateMetadata?.type, user?.publicMetadata?.type]);
  // Resolve role from backend to honor Clerk private metadata
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = new Headers();
  // Try Clerk session token for server-side verification
        try {
          const token = await getToken();
          if (token) headers.set('Authorization', `Bearer ${token}`);
        } catch {}
  // Always include client-known role as hint for servers without Clerk
  const userRoles = getUserRoles(user);
  const devType = (userRoles[0] || '').toString();
  const roleHeader = userRoles.join(',');
  if (devType) headers.set('X-User-Type', devType);
  if (roleHeader) headers.set('X-User-Role', roleHeader);

  const res = await fetch('/api/auth-me', { headers });
        const data = await res.json().catch(() => ({}));
  if (!cancelled) setIsAdmin(prev => !!prev || !!data.isAdmin);
      } catch (e) {
        // Don't downgrade an already-true admin flag on transient errors
        if (!cancelled) setIsAdmin(prev => !!prev);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, isSignedIn, getToken, user?.privateMetadata?.type, user?.publicMetadata?.type]);
  const [activeTab, setActiveTab] = useState('liveSports');
  const [selectedMatch, setSelectedMatch] = useState(null);

  const handleMatchSelect = (match) => {
    console.log('Match selected:', match);
    setSelectedMatch(match);
  };

  const handleBackFromViewer = () => {
    setSelectedMatch(null);
    // Keep user on the same tab (liveSports)
  };

  const handleAddToWatchlist = async (match) => {
    try {
      if (!user) return;
      const home = match?.homeTeam?.name || match?.homeTeam;
      const away = match?.awayTeam?.name || match?.awayTeam;
      // Add both teams to favorites (dedup handled server-side)
      if (home) await fetch('/api/users/' + encodeURIComponent(user.id) + '/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamName: home }) });
      if (away) await fetch('/api/users/' + encodeURIComponent(user.id) + '/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamName: away }) });
      // Optional: provide lightweight feedback
      console.log('Added to watchlist:', { home, away });
    } catch (e) {
      console.error('Failed to add to watchlist', e);
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'matchSetup':
        return <MatchSetup isAdmin={isAdmin} />;
      case 'liveInput':
        return <LiveInput isAdmin={isAdmin} />;
      case 'liveSports':
      default:
        return selectedMatch ? (
          <MatchViewer 
            match={selectedMatch} 
            initialSection={'details'}
            onBack={handleBackFromViewer}
            onAddToWatchlist={handleAddToWatchlist}
          />
        ) : (
          <>
            <FavoritesPanel onMatchSelect={handleMatchSelect} />
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
            // appearance={{
            //   elements: {
            //     avatarBox: "w-10 h-10",
            //     userButtonPopover: "shadow-lg border"
            //   }
            // }}
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
  {/* Match Viewer is now contextual; no persistent tab */}
        {isAdmin && (
          <>
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
          </>
        )}
      </nav>

      <main className="dashboard-main">
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;