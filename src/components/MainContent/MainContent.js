// components/MainContent/MainContent.js
import React from 'react';
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

const MainContent = ({
  showAboutUs,
  selectedTeam,
  selectedMatch,
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
        return <MatchSetup isAdmin={isAdmin} />;
      case 'liveInput':
        return <LiveInput isAdmin={isAdmin} match={selectedMatch} onBackToMatch={() => setActiveTab('matches')} />;
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
        return <WatchlistPage onMatchSelect={setSelectedMatch} />;
      case 'matches':
      default:
        return selectedMatch ? (
          <MatchViewer
            match={selectedMatch}
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