import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { isAdminFromUser, getUserRoles } from '../../lib/roles';

// Import components
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import MainContent from '../../components/MainContent/MainContent';
import HomeScreen from '../../components/HomeScreen/HomeScreen';
import AboutUs from '../../components/AboutUs/AboutUs';
import HighlightsTab from '../HighlightsTab/HighlightsTab';

// Import league images
import plLogo from '../../assets/pl_logo.jpg';
import laLigaLogo from '../../assets/LaLiga.jpg';
import serieALogo from '../../assets/serie_A.jpg';
import bundesligaLogo from '../../assets/bundesliga.jpg';
import ligue1Logo from '../../assets/LIGUE1.jpg';
import championsLogo from '../../assets/UCL.jpg';

import '../../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const clerkIsAdmin = isAdminFromUser(user);
  const [isAdmin, setIsAdmin] = useState(!!clerkIsAdmin);
  const getPathname = () => (typeof window !== 'undefined' ? window.location.pathname : '/dashboard');
  const getSearch = () => (typeof window !== 'undefined' ? window.location.search : '');
  const searchParams = useMemo(() => new URLSearchParams(getSearch()), []);
  const urlLeague = searchParams.get('league');
  const routeTab = useMemo(() => {
    const after = getPathname().replace(/^\/dashboard\/?/, '');
    const seg = after.split('/')[0];
    return seg || null;
  }, []);

  const [activeTab, _setActiveTab] = useState(routeTab || 'home');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const initialMatchId = (() => {
    if (typeof window === 'undefined') return null;
    const after = window.location.pathname.replace(/^\/dashboard\/?/, '');
    const parts = after.split('/');
    return (parts[0] === 'matches' && parts[1]) ? parts[1] : null;
  })();
  const [selectedMatchId, setSelectedMatchId] = useState(initialMatchId);
  const [showAboutUs, _setShowAboutUs] = useState(false);
  const [selectedLeague, _setSelectedLeague] = useState(urlLeague);
  const [selectedTeam, setSelectedTeam] = useState(null); 
  const [latestNews, setLatestNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

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
      color: "#c8102eff"
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

  // Keep state in sync when the URL changes (e.g., browser back/forward or reload)
  useEffect(() => {
    _setActiveTab(routeTab || 'home');
    _setShowAboutUs(routeTab === 'about');
    // extract match id if on /dashboard/matches/:id
    const after = (typeof window !== 'undefined' ? window.location.pathname : '').replace(/^\/dashboard\/?/, '');
    const parts = after.split('/');
    if (parts[0] === 'matches' && parts[1]) {
      setSelectedMatchId(parts[1]);
    } else {
      setSelectedMatchId(null);
    }
  }, [routeTab]);

  // Reflect back/forward navigation into local state
  useEffect(() => {
    const onPop = () => {
      const after = getPathname().replace(/^\/dashboard\/?/, '');
      const seg = after.split('/')[0] || 'home';
      _setActiveTab(seg);
      const params = new URLSearchParams(getSearch());
      _setSelectedLeague(params.get('league'));
      _setShowAboutUs(seg === 'about');
      const parts = after.split('/');
      setSelectedMatchId(parts[0] === 'matches' && parts[1] ? parts[1] : null);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', onPop);
      return () => window.removeEventListener('popstate', onPop);
    }
  }, []);

  useEffect(() => {
    _setSelectedLeague(urlLeague || null);
  }, [urlLeague]);

  // Navigation helpers that also update the URL
  const setActiveTab = useCallback((nextTab) => {
    const safeTab = nextTab || 'home';
    _setActiveTab(safeTab);
    // If navigating explicitly to matches root, clear any selected match
    if (safeTab === 'matches') {
      setSelectedMatch(null);
      // If URL path doesn't contain an id, ensure local state cleared
      try {
        const after = getPathname().replace(/^\/dashboard\/?/, '');
        const parts = after.split('/');
        if (!(parts[0] === 'matches' && parts[1])) {
          setSelectedMatchId(null);
        }
      } catch {}
    } else {
      // Switching away from matches should not keep a modal-like viewer active on return
      // We'll keep selectedMatchId but clear selectedMatch to force viewer to re-derive from URL
      setSelectedMatch(null);
    }
    if (typeof window !== 'undefined') {
      const query = new URLSearchParams(getSearch());
      const url = `/dashboard/${safeTab}${query.toString() ? `?${query.toString()}` : ''}`;
      window.history.pushState({}, '', url);
    }
  }, []);

  // Intercept match selection to reflect in URL
  const handleMatchSelect = useCallback((match) => {
    setSelectedMatch(match);
    const id = match?.id || match?._id || match?.matchId;
    setSelectedMatchId(id || null);
    if (typeof window !== 'undefined') {
      const mid = id ? `/${id}` : '';
      window.history.pushState({}, '', `/dashboard/matches${mid}`);
    }
    _setActiveTab('matches');
  }, []);

  const setShowAboutUs = useCallback((show) => {
    _setShowAboutUs(show);
    if (show && typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard/about');
    }
  }, []);

  const setSelectedLeague = useCallback((leagueKey) => {
    _setSelectedLeague(leagueKey);
    if (typeof window !== 'undefined') {
      const query = new URLSearchParams(getSearch());
      if (leagueKey) query.set('league', leagueKey); else query.delete('league');
      const after = getPathname().replace(/^\/dashboard\/?/, '');
      const seg = after.split('/')[0] || activeTab || 'home';
      const url = `/dashboard/${seg}${query.toString() ? `?${query.toString()}` : ''}`;
      window.history.pushState({}, '', url);
    }
  }, [activeTab]);

  // Fetch latest news for dashboard
  useEffect(() => {
    const fetchLatestNews = async () => {
      setNewsLoading(true);
      try {
        const response = await fetch('/api/football-news?limit=6');
        const data = await response.json();
        setLatestNews(data || []);
      } catch (error) {
        console.error('Failed to fetch news:', error);
      } finally {
        setNewsLoading(false);
      }
    };

    if (activeTab === 'home') {
      fetchLatestNews();
    }
  }, [activeTab]);

  // Sync isAdmin with Clerk
  useEffect(() => {
    setIsAdmin(isAdminFromUser(user));
  }, [user]);

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

  const handleBackFromViewer = () => {
    setSelectedMatch(null);
    setSelectedMatchId(null);
    setActiveTab('matches');
  };
  const handleBackFromTeamInfo = () => setSelectedTeam(null);

  return (
    <div className="site-wrap dashboard">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setShowAboutUs={setShowAboutUs}
        setSelectedMatch={setSelectedMatch}
        setSelectedTeam={setSelectedTeam}
        isAdmin={isAdmin}
        selectedMatch={selectedMatch}
        selectedMatchId={selectedMatchId}
      />
      
      <MainContent
        showAboutUs={showAboutUs}
        selectedTeam={selectedTeam}
        selectedMatch={selectedMatch}
        selectedMatchId={selectedMatchId}
        activeTab={activeTab}
        selectedLeague={selectedLeague}
        isAdmin={isAdmin}
        setActiveTab={setActiveTab}
        setShowAboutUs={setShowAboutUs}
        setSelectedMatch={handleMatchSelect}
        setSelectedTeam={setSelectedTeam}
        setSelectedLeague={setSelectedLeague}
        leagues={leagues}
        handleBackFromViewer={handleBackFromViewer}
        handleBackFromTeamInfo={handleBackFromTeamInfo}
        AboutUs={() => <AboutUs setShowAboutUs={setShowAboutUs} setActiveTab={setActiveTab} />}
        HomeScreen={() => (
          <HomeScreen 
            setActiveTab={setActiveTab} 
            setSelectedLeague={setSelectedLeague} 
            leagues={leagues}
            latestNews={latestNews}
            newsLoading={newsLoading}
          />
        )}
        HighlightsTab={() => <HighlightsTab />}
      />
      
      <Footer
        setActiveTab={setActiveTab}
        setShowAboutUs={setShowAboutUs}
        setSelectedMatch={setSelectedMatch}
        setSelectedTeam={setSelectedTeam}
        leagues={leagues}
        setSelectedLeague={setSelectedLeague}
      />
    </div>
  );
};

export default Dashboard;