// __tests__/MainContent.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import MainContent from '../MainContent/MainContent';

// Mock all imported components
jest.mock('../sports/LiveSports', () => () => <div>LiveSports</div>);
jest.mock('../favouritespanel/FavoritesPanel', () => () => <div>FavoritesPanel</div>);
jest.mock('../WatchlistPage/WatchlistPage', () => () => <div>WatchlistPage</div>);
jest.mock('../matchViewer/MatchViewer', () => () => <div>MatchViewer</div>);
jest.mock('../matchsetup/MatchSetup', () => () => <div>MatchSetup</div>);
jest.mock('../liveInput/LiveInput', () => () => <div>LiveInput</div>);
jest.mock('../LeagueView/LeagueView', () => () => <div>LeagueView</div>);
jest.mock('../ReportsPage/ReportsPage', () => () => <div>ReportsPage</div>);
jest.mock('../PlayersPage/PlayersPage', () => () => <div>PlayersPage</div>);
jest.mock('../TeamInfo/TeamInfo', () => () => <div>TeamInfo</div>);
jest.mock('../FootballNews/FootballNews', () => () => <div>FootballNewsPage</div>);
jest.mock('../HomeScreen/HomeScreen', () => () => <div>HomeScreen</div>);
jest.mock('../HighlightsTab/HighlightsTab', () => () => <div>HighlightsTab</div>);

describe('MainContent', () => {
  const defaultProps = {
    showAboutUs: false,
    selectedTeam: null,
    selectedMatch: null,
    activeTab: 'matches',
    selectedLeague: null,
    isAdmin: false,
    setActiveTab: jest.fn(),
    setShowAboutUs: jest.fn(),
    setSelectedMatch: jest.fn(),
    setSelectedTeam: jest.fn(),
    setSelectedLeague: jest.fn(),
    leagues: [],
    handleBackFromViewer: jest.fn(),
    handleBackFromTeamInfo: jest.fn(),
    AboutUs: () => <div>AboutUs</div>,
    HomeScreen: () => <div>HomeScreen</div>,
  };

  it('renders AboutUs when showAboutUs is true', () => {
    render(<MainContent {...defaultProps} showAboutUs={true} />);
    expect(screen.getByText('AboutUs')).toBeInTheDocument();
  });

  it('renders TeamInfo when selectedTeam is set', () => {
    render(<MainContent {...defaultProps} selectedTeam={{ name: 'Team A' }} />);
    expect(screen.getByText('TeamInfo')).toBeInTheDocument();
  });

  it('renders HomeScreen when activeTab is home', () => {
    render(<MainContent {...defaultProps} activeTab="home" />);
    expect(screen.getByText('HomeScreen')).toBeInTheDocument();
  });

  it('renders PlayersPage when activeTab is players', () => {
    render(<MainContent {...defaultProps} activeTab="players" />);
    expect(screen.getByText('PlayersPage')).toBeInTheDocument();
  });

  it('renders MatchSetup when activeTab is matchSetup', () => {
    render(<MainContent {...defaultProps} activeTab="matchSetup" isAdmin={true} />);
    expect(screen.getByText('MatchSetup')).toBeInTheDocument();
  });

  it('renders LiveInput when activeTab is liveInput', () => {
    render(<MainContent {...defaultProps} activeTab="liveInput" selectedMatch={{ id: 1 }} />);
    expect(screen.getByText('LiveInput')).toBeInTheDocument();
  });

  it('renders LeagueView when activeTab is leagueStandings', () => {
    render(<MainContent {...defaultProps} activeTab="leagueStandings" />);
    expect(screen.getByText('LeagueView')).toBeInTheDocument();
  });

  it('renders FootballNewsPage when activeTab is news', () => {
    render(<MainContent {...defaultProps} activeTab="news" />);
    expect(screen.getByText('FootballNewsPage')).toBeInTheDocument();
  });

  it('renders ReportsPage when activeTab is reports', () => {
    render(<MainContent {...defaultProps} activeTab="reports" isAdmin={true} />);
    expect(screen.getByText('ReportsPage')).toBeInTheDocument();
  });

  it('renders FavoritesPanel when activeTab is favorites', () => {
    render(<MainContent {...defaultProps} activeTab="favorites" />);
    expect(screen.getByText('FavoritesPanel')).toBeInTheDocument();
  });

  it('renders HighlightsTab when activeTab is highlights', () => {
    render(<MainContent {...defaultProps} activeTab="highlights" />);
    expect(screen.getByText('HighlightsTab')).toBeInTheDocument();
  });

  it('renders WatchlistPage when activeTab is watchlist', () => {
    render(<MainContent {...defaultProps} activeTab="watchlist" />);
    expect(screen.getByText('WatchlistPage')).toBeInTheDocument();
  });

  it('renders MatchViewer when selectedMatch is set and activeTab is matches', () => {
    render(<MainContent {...defaultProps} selectedMatch={{ id: 1 }} />);
    expect(screen.getByText('MatchViewer')).toBeInTheDocument();
  });

  it('renders LiveSports when no match selected and activeTab is matches', () => {
    render(<MainContent {...defaultProps} />);
    expect(screen.getByText('LiveSports')).toBeInTheDocument();
  });
});