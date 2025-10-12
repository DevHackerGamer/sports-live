import React, { useEffect, useState } from 'react';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import LiveSports from '../sports/LiveSports';
import FavoritesPanel from '../favouritespanel/FavoritesPanel';
import WatchlistPage from '../WatchlistPage/WatchlistPage';
import MatchViewer from '../matchViewer/MatchViewer';
import MatchSetup from '../matchsetup/MatchSetup';
import LiveInput from '../liveInput/LiveInput';
import LeagueView from '../LeagueView/LeagueView';
import ReportsPage from '../ReportsPage/ReportsPage';
import PlayersPage from '../PlayersPage/PlayersPage';
import TeamInfo from '../TeamInfo/TeamInfo';
import { isAdminFromUser, getUserRoles } from '../../lib/roles';

// Import league images
import plLogo from '../../assets/pl_logo.jpg';
import laLigaLogo from '../../assets/LaLiga.jpg';
import serieALogo from '../../assets/serie_A.jpg';
import bundesligaLogo from '../../assets/bundesliga.jpg';
import ligue1Logo from '../../assets/LIGUE1.jpg';
import championsLogo from '../../assets/UCL.jpg';

import '../../styles/Dashboard.css';


//refreshing page logic usin states
// --- Dashboard State Persistence Helpers ---
const DASHBOARD_STATE_KEY = "sportslive-dashboard-state";

const saveDashboardState = (state) => {
  try {
    localStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Error saving dashboard state:", err);
  }
};

const loadDashboardState = () => {
  try {
    const saved = localStorage.getItem(DASHBOARD_STATE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (err) {
    console.error("Error loading dashboard state:", err);
    return null;
  }
};


const Dashboard = () => {
  const { user } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const clerkIsAdmin = isAdminFromUser(user);
  const [isAdmin, setIsAdmin] = useState(!!clerkIsAdmin);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null); 
  const [selectedTabTitle, setSelectedTabTitle] = useState('home');

  // Sync isAdmin with Clerk
  useEffect(() => {
    setIsAdmin(isAdminFromUser(user));
  }, [user]);

  //refreshing page logic usin states
// --- Dashboard State Persistence Helpers ---
useEffect(() => {
  const saved = loadDashboardState();
  if (saved) {
    if (saved.activeTab) setActiveTab(saved.activeTab);
    if (saved.selectedMatch) setSelectedMatch(saved.selectedMatch);
    if (saved.selectedTeam) setSelectedTeam(saved.selectedTeam);
    if (saved.selectedLeague) setSelectedLeague(saved.selectedLeague);
    if (saved.showAboutUs !== undefined) setShowAboutUs(saved.showAboutUs);
  }
}, []);

useEffect(() => {
  saveDashboardState({
    activeTab,
    selectedMatch,
    selectedTeam,
    selectedLeague,
    showAboutUs,
  });
}, [activeTab, selectedMatch, selectedTeam, selectedLeague, showAboutUs]);





  // Resolve role from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = new Headers();
        try {
          const token = await getToken();
          if (token) headers.set('Authorization', `Bearer ${token}`);
        } catch {}
        const userRoles = getUserRoles(user);
        const devType = (userRoles[0] || '').toString();
        const roleHeader = userRoles.join(',');
        if (devType) headers.set('X-User-Type', devType);
        if (roleHeader) headers.set('X-User-Role', roleHeader);

        const res = await fetch('/api/auth-me', { headers });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setIsAdmin(prev => !!prev || !!data.isAdmin);
      } catch (e) {
        if (!cancelled) setIsAdmin(prev => !!prev);
      }
    })();
    return () => { cancelled = true; };
  }, [user, isSignedIn, getToken]);

  const handleMatchSelect = (match) => setSelectedMatch(match);
  const handleBackFromViewer = () => setSelectedMatch(null);
  const handleTeamSelect = (team) => setSelectedTeam(team); 
  const handleBackFromTeamInfo = () => setSelectedTeam(null);

  // Watchlist now handled via LiveSports hover UI and user-matches API.

  // League Data
  const leagues = [
    {
      key: "PL",
      name: "Premier League",
      img: plLogo,
      desc: "The most-watched league in the world, known for its relentless pace, physicality, and electrifying atmospheres.",
      color: "#331160ff"
    },
    {
      key: "LL",
      name: "La Liga",
      img: laLigaLogo,
      desc: "Home of technical mastery and tactical artistry, where legendary rivalries and world-class talent take center stage.",
      color: "Red"
    },
    {
      key: "SA",
      name: "Serie A",
      img: serieALogo,
      desc: "The birthplace of 'Catenaccio,' renowned for its tactical sophistication, defensive rigor, and storied history.",
      color: "#0c4491"
    },
    {
      key: "BL",
      name: "Bundesliga",
      desc: "A league famous for its passionate fan culture, high-scoring games, and the development of world-class young talent.",
      img: bundesligaLogo,
      color: "#d71218"
    },
    {
      key: "L1",
      name: "Ligue 1",
      img: ligue1Logo,
      desc: "A rapidly growing league celebrated for its exciting blend of emerging superstars and established international stars.",
      color: "#0055A4"
    },
    {
      key: "UCL",
      name: "Champions League",
      img: championsLogo,
      desc: "The ultimate stage in club football, where European giants collide in pursuit of the most coveted trophy in the sport.",
      color: "#272727"
    },
  ];

  // Home screen
  const HomeScreen = () => {
    const features = [
      { 
        title: "Live Match Updates", 
        description: "Real-time scores and updates", 
        icon: "⚽",
        action: () => setActiveTab('matches')
      },
      { 
        title: "Player Statistics", 
        description: "Detailed stats for all players", 
        icon: "👤",
        action: () => setActiveTab('players')
      },
      { 
        title: "Team Standings", 
        description: "Track team positions in league tables", 
        icon: "🏆",
        action: () => setActiveTab('leagueStandings')
      },
      { 
        title: "Personalized Experience", 
        description: "Follow your favorite teams and players", 
        icon: "❤️",
        action: () => setActiveTab('favorites')
      }
    ];

    return (
      <div className="home-screen">
        {/* Hero Section - Top part */}
        <section className="hero">
          <div className="hero-content">
            <h1>Experience Football <span>Like Never Before</span></h1>
            <p>Real-time scores, in-depth statistics, and coverage of all major leagues.</p>
          </div>
        </section>

        {/* Features */}
        <section className="features-section">
          <h2 className="section-title">Why Choose Sports Live?</h2>
          <p className="section-subtitle">Everything you need to stay connected to the world of football</p>
          <div className="features-grid">
            {features.map((f, idx) => (
              <div className="feature-card" key={idx} onClick={f.action}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* League Cards */}
        <section className="league-cards">
          <h2 className="section-title">Top Leagues</h2>
          <p className="section-subtitle">Follow your favorite leagues with comprehensive coverage</p>
          <div className="cards-grid">
            {leagues.map((league, idx) => (
              <div className="league-card" key={idx}>
                <div className="league-card-inner">
                  <div className="league-card-front">
                    <div className="league-img-container">
                      <img src={league.img} alt={league.name} className="league-img" />
                    </div>
                  </div>
                  <div className="league-card-back" style={{ backgroundColor: league.color }}>
                    <div className="league-card-content">
                      <p>{league.desc}</p>
                      <button 
                        className="btn btn-small"
                        onClick={() => {
                          setSelectedLeague(league.key);
                          setActiveTab('leagueStandings');
                        }}
                      >
                        View {league.name}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  // About Us Section 
  const AboutUs = () => (
    <div className="about-us-container">
      <div className="container">
        <h2>About Sports Live</h2>
        <div className="about-content">
          <p>Sports Live is the premier destination for football enthusiasts who want real-time updates, comprehensive statistics, and in-depth coverage of all major football leagues around the world.</p>
          <h3>Our Mission</h3>
          <p>To provide football fans with the most accurate, timely, and comprehensive football data and match coverage in an intuitive and engaging platform.</p>
          <h3>What We Offer</h3>
          <ul>
            <li>Real-time match updates and live scores</li>
            <li>Detailed player and team statistics</li>
            <li>League standings and tournament progress</li>
            <li>Personalized favorites system to follow your preferred teams</li>
            <li>Comprehensive coverage of Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and European competitions</li>
          </ul>
          <h3>Our Team</h3>
          <p>We are a passionate group of football enthusiasts, data analysts, and developers dedicated to creating the best football experience for fans worldwide.</p>
          <h3>Contact Us</h3>
          <p>Have questions or feedback? Reach out to us at support@sportslive.com</p>
        </div>
        <button 
          className="btn btn-secondary mt-3" 
          onClick={() => {
            setShowAboutUs(false);
            setActiveTab('home');
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  // Footer Component
  const Footer = () => (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>Sports Live</h3>
          <p>Your ultimate destination for real-time football updates, statistics, and league coverage.</p>
        </div>
        
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul className="footer-quick-links">
            <li><button onClick={() => { setActiveTab('home'); setShowAboutUs(false); setSelectedMatch(null); setSelectedTeam(null); }}>Home</button></li>
            <li><button onClick={() => { setActiveTab('matches'); setShowAboutUs(false); setSelectedMatch(null); setSelectedTeam(null); }}>Matches</button></li>
            <li><button onClick={() => { setActiveTab('favorites'); setShowAboutUs(false); setSelectedMatch(null); setSelectedTeam(null); }}>Favorites</button></li>
            <li><button onClick={() => { setActiveTab('players'); setShowAboutUs(false); setSelectedMatch(null); setSelectedTeam(null); }}>Players</button></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Leagues</h3>
          <ul className="footer-quick-links">
            {leagues.map(l => (
              <li key={l.key}>
                <button onClick={() => {
                  setSelectedLeague(l.key);
                  setActiveTab('leagueStandings');
                  setShowAboutUs(false);
                  setSelectedMatch(null);
                  setSelectedTeam(null);
                }}>
                  {l.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Newsletter</h3>
          <p>Subscribe to get updates on new features and matches</p>
          <div className="newsletter-form">
            <input type="email" placeholder="Your email address" />
            <button>Subscribe</button>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Sports Live. All rights reserved.</p>
      </div>
    </footer>
  );

const renderContent = () => {
  if (showAboutUs) return <AboutUs />;

    if (selectedTeam) {
    return (
      <TeamInfo 
        team={selectedTeam} 
        onBack={handleBackFromTeamInfo} 
      />
    );
  }

  // from match cards
  const handleMatchSelect = (match) => {
  setSelectedMatch(match);
  setActiveTab('matches'); // 
};

const handleBackFromViewer = () => {
  setSelectedMatch(null);
  setActiveTab('leagueStandings');
};





  switch (activeTab) {
    case 'home':
      return <HomeScreen />;
    case 'players':
      return <PlayersPage />;
    case 'matchSetup':
      return <MatchSetup isAdmin={isAdmin} />;
    case 'liveInput':
      return <LiveInput isAdmin={isAdmin} match={selectedMatch} onBackToMatch={() => setActiveTab('matches')} />;
    case 'leagueStandings':
      return <LeagueView initialLeague={selectedLeague || "PL"} onBack={() => setActiveTab('home')} onTeamSelect={handleTeamSelect} onMatchSelect={handleMatchSelect} />;
    case 'reports':
      return <ReportsPage isAdmin={isAdmin} />;
    case 'favorites':
      return <FavoritesPanel onMatchSelect={handleMatchSelect} />;
    case 'watchlist':
      return <WatchlistPage onMatchSelect={handleMatchSelect} />;
    case 'matches':
    default:
      return selectedMatch ? (
        <MatchViewer
          match={selectedMatch}
          onBack={handleBackFromViewer}
        />
      ) : (
        <LiveSports onMatchSelect={handleMatchSelect} onTeamSelect={handleTeamSelect} />
      );
  }
};


  return (
    <div className="site-wrap dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-trapezoid">
            <span className="logo-text">SportsLive</span>
          </div>
          <nav className="dashboard-nav">
            <ul>
              <li><button onClick={() => { setActiveTab('home'); setShowAboutUs(false); setSelectedTeam(null); }}>Home</button></li>
              <li><button onClick={() => { setActiveTab('favorites'); setShowAboutUs(false); setSelectedMatch(null); setSelectedTeam(null); }}>Favourites</button></li>
              <li><button onClick={() => { setActiveTab('watchlist'); setShowAboutUs(false); setSelectedMatch(null); setSelectedTeam(null); }}>Watchlist</button></li>
              {isAdmin && (
                <>
                  <li><button onClick={() => { setActiveTab('matchSetup'); setShowAboutUs(false);  setSelectedTeam(null); }}>Setup</button></li>
                  {selectedMatch && (
                    <li>
                      <button
                        onClick={() => {
                          setActiveTab('liveInput');
                          setShowAboutUs(false);
                          setSelectedTeam(null);
                        }}
                        title="Enter live input for the selected match"
                      >
                        Live Input
                      </button>
                    </li>
                  )}
                  <li><button onClick={() => { setActiveTab('reports'); setShowAboutUs(false); setSelectedMatch(null); setSelectedTeam(null); }}>Reports</button></li>
                </>
              )}
              <li><button onClick={() => { setShowAboutUs(true); setActiveTab(''); setSelectedMatch(null); setSelectedTeam(null); }}>About</button></li>
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
      <main className="site-main">{renderContent()}</main>
      <Footer />
    </div>
  );
};

export default Dashboard;