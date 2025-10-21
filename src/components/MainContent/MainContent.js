// components/MainContent/MainContent.js
import React, { useEffect, useState } from 'react';
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
import FootballNewsPage from '../FootballNews/FootballNews';
import HomeScreen from '../HomeScreen/HomeScreen';
import HighlightsTab from '../HighlightsTab/HighlightsTab';
import { apiClient } from '../../lib/api';

// Lightweight wrapper to ensure LiveInput has a match object even after reloads
const LiveInputWithLoad = ({ isAdmin, match, matchId, onBackToMatch }) => {
  const [loadedMatch, setLoadedMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const hasMatch = !!match || !!loadedMatch;

  useEffect(() => {
    let cancelled = false;
    if (!match && matchId) {
      setLoading(true);
      (async () => {
        try {
          const res = await apiClient.getMatchById(matchId);
          if (!cancelled) setLoadedMatch(res?.data || res || null);
        } catch (_) {
          if (!cancelled) setLoadedMatch(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }
    return () => { cancelled = true; };
  }, [match, matchId]);

  if (match) return <LiveInput isAdmin={isAdmin} match={match} onBackToMatch={onBackToMatch} />;
  if (loadedMatch) return <LiveInput isAdmin={isAdmin} match={loadedMatch} onBackToMatch={onBackToMatch} />;
  if (loading) return <div style={{ padding: 16 }}>Loading match…</div>;
  return <div style={{ padding: 16 }}>No match selected. Select a match first from Live Sports.</div>;
};

const MainContent = ({
  showAboutUs,
  selectedTeam,
  selectedMatch,
  selectedMatchId,
  activeTab,
  selectedLeague,
  isAdmin,
  setActiveTab,
  setShowAboutUs,
  setSelectedMatch,
  setSelectedTeam,
  setSelectedLeague,
  leagues,
  handleBackFromViewer,
  handleBackFromTeamInfo,
  AboutUs,
  HomeScreen
}) => {
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

    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'players':
        return <PlayersPage />;
      case 'matchSetup':
        return <MatchSetup isAdmin={isAdmin} onTeamSelect={setSelectedTeam} />;
      case 'liveInput':
        return (
          <LiveInputWithLoad
            isAdmin={isAdmin}
            match={selectedMatch}
            matchId={selectedMatchId}
            onBackToMatch={() => setActiveTab('matches')}
          />
        );
      case 'leagueStandings':
        return <LeagueView initialLeague={selectedLeague || "PL"} onBack={() => setActiveTab('home')} onTeamSelect={setSelectedTeam} />;
      case 'news':
        return <FootballNewsPage onBack={() => setActiveTab('home')} />;
      case 'reports':
        return <ReportsPage isAdmin={isAdmin} />;
      case 'favorites':
        return <FavoritesPanel onMatchSelect={setSelectedMatch} />;
      case 'highlights':
        return <HighlightsTab />;
     case 'watchlist':
  return selectedMatch ? (
    <MatchViewer
      match={selectedMatch}
      onBack={handleBackFromViewer}
    />
  ) : (
    <WatchlistPage onMatchSelect={setSelectedMatch} onTeamSelect={setSelectedTeam} />
  );
      case 'matches':
      default:
        return (selectedMatch || selectedMatchId) ? (
          <MatchViewer
            match={selectedMatch}
            matchId={selectedMatchId}
            onBack={handleBackFromViewer}
          />
        ) : (
          <LiveSports onMatchSelect={setSelectedMatch} onTeamSelect={setSelectedTeam} />
        );
    }
  };

  return (
    <main className="site-main">
      {renderContent()}
    </main>
  );
};

export default MainContent;