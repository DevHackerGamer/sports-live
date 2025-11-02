import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MainContent from '../MainContent/MainContent';

// Mock all child components
jest.mock('../sports/LiveSports', () => () => <div data-testid="live-sports">Live Sports</div>);
jest.mock('../favouritespanel/FavoritesPanel', () => () => <div data-testid="favorites-panel">Favorites Panel</div>);
jest.mock('../WatchlistPage/WatchlistPage', () => () => <div data-testid="watchlist-page">Watchlist Page</div>);
jest.mock('../matchViewer/MatchViewer', () => ({ match, onBack }) => (
  <div data-testid="match-viewer">
    <span>MatchViewer: {match?.homeTeam?.name || 'No Match'}</span>
    <button onClick={onBack}>Back</button>
  </div>
));
jest.mock('../matchsetup/MatchSetup', () => ({ isAdmin, onTeamSelect }) => (
  <div data-testid="match-setup">
    Match Setup - Admin: {isAdmin ? 'Yes' : 'No'}
  </div>
));
jest.mock('../liveInput/LiveInput', () => ({ isAdmin, match, onBackToMatch }) => (
  <div data-testid="live-input">
    Live Input - Match: {match?.id || 'No Match'} - Admin: {isAdmin ? 'Yes' : 'No'}
    <button onClick={onBackToMatch}>Back to Match</button>
  </div>
));
jest.mock('../LeagueView/LeagueView', () => ({ initialLeague, onBack, onTeamSelect }) => (
  <div data-testid="league-view">
    League View - {initialLeague}
    <button onClick={onBack}>Back</button>
  </div>
));
jest.mock('../ReportsPage/ReportsPage', () => ({ isAdmin }) => (
  <div data-testid="reports-page">
    Reports Page - Admin: {isAdmin ? 'Yes' : 'No'}
  </div>
));
jest.mock('../PlayersPage/PlayersPage', () => () => <div data-testid="players-page">Players Page</div>);
jest.mock('../TeamInfo/TeamInfo', () => ({ team, onBack }) => (
  <div data-testid="team-info">
    Team Info: {team?.name}
    <button onClick={onBack}>Back</button>
  </div>
));
jest.mock('../FootballNews/FootballNews', () => ({ onBack }) => (
  <div data-testid="football-news">
    Football News
    <button onClick={onBack}>Back</button>
  </div>
));
jest.mock('../HomeScreen/HomeScreen', () => () => <div data-testid="home-screen">Home Screen</div>);
jest.mock('../HighlightsTab/HighlightsTab', () => () => <div data-testid="highlights-tab">Highlights Tab</div>);

// Mock api client
jest.mock('../../lib/api', () => ({
  apiClient: {
    getMatchById: jest.fn(),
  },
}));

const { apiClient } = require('../../lib/api');

describe('MainContent Component', () => {
  const mockSetActiveTab = jest.fn();
  const mockSetShowAboutUs = jest.fn();
  const mockSetSelectedMatch = jest.fn();
  const mockSetSelectedTeam = jest.fn();
  const mockSetSelectedLeague = jest.fn();
  const mockHandleBackFromViewer = jest.fn();
  const mockHandleBackFromTeamInfo = jest.fn();

  const defaultProps = {
    showAboutUs: false,
    selectedTeam: null,
    selectedMatch: null,
    selectedMatchId: null,
    activeTab: 'home',
    selectedLeague: null,
    isAdmin: false,
    setActiveTab: mockSetActiveTab,
    setShowAboutUs: mockSetShowAboutUs,
    setSelectedMatch: mockSetSelectedMatch,
    setSelectedTeam: mockSetSelectedTeam,
    setSelectedLeague: mockSetSelectedLeague,
    leagues: [],
    handleBackFromViewer: mockHandleBackFromViewer,
    handleBackFromTeamInfo: mockHandleBackFromTeamInfo,
    AboutUs: () => <div data-testid="about-us">About Us</div>,
    HomeScreen: () => <div data-testid="home-screen">Home Screen</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders AboutUs when showAboutUs is true', () => {
    render(<MainContent {...defaultProps} showAboutUs={true} />);
    expect(screen.getByTestId('about-us')).toBeInTheDocument();
  });

  it('renders TeamInfo when selectedTeam is provided', () => {
    const mockTeam = { name: 'Arsenal', id: 'team1' };
    render(<MainContent {...defaultProps} selectedTeam={mockTeam} />);
    expect(screen.getByTestId('team-info')).toBeInTheDocument();
    expect(screen.getByText('Team Info: Arsenal')).toBeInTheDocument();
  });

  it('renders HomeScreen for home tab', () => {
    render(<MainContent {...defaultProps} activeTab="home" />);
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
  });

  it('renders PlayersPage for players tab', () => {
    render(<MainContent {...defaultProps} activeTab="players" />);
    expect(screen.getByTestId('players-page')).toBeInTheDocument();
  });

  it('renders MatchSetup for matchSetup tab when admin', () => {
    render(<MainContent {...defaultProps} activeTab="matchSetup" isAdmin={true} />);
    expect(screen.getByTestId('match-setup')).toBeInTheDocument();
    expect(screen.getByText('Match Setup - Admin: Yes')).toBeInTheDocument();
  });

  it('renders LiveInput for liveInput tab when admin', () => {
    const mockMatch = { id: 'match123', homeTeam: { name: 'Team A' } };
    render(
      <MainContent 
        {...defaultProps} 
        activeTab="liveInput" 
        isAdmin={true}
        selectedMatch={mockMatch}
      />
    );
    expect(screen.getByTestId('live-input')).toBeInTheDocument();
    expect(screen.getByText('Live Input - Match: match123 - Admin: Yes')).toBeInTheDocument();
  });

  it('renders LeagueView for leagueStandings tab without selected match', () => {
    render(<MainContent {...defaultProps} activeTab="leagueStandings" selectedLeague="PL" />);
    expect(screen.getByTestId('league-view')).toBeInTheDocument();
    expect(screen.getByText('League View - PL')).toBeInTheDocument();
  });

  it('renders MatchViewer for leagueStandings tab with selected match', () => {
    const mockMatch = { id: 'match123', homeTeam: { name: 'Team A' } };
    render(
      <MainContent 
        {...defaultProps} 
        activeTab="leagueStandings" 
        selectedMatch={mockMatch}
      />
    );
    expect(screen.getByTestId('match-viewer')).toBeInTheDocument();
    expect(screen.getByText('MatchViewer: Team A')).toBeInTheDocument();
  });

  it('renders FootballNewsPage for news tab', () => {
    render(<MainContent {...defaultProps} activeTab="news" />);
    expect(screen.getByTestId('football-news')).toBeInTheDocument();
  });

  it('renders ReportsPage for reports tab when admin', () => {
    render(<MainContent {...defaultProps} activeTab="reports" isAdmin={true} />);
    expect(screen.getByTestId('reports-page')).toBeInTheDocument();
    expect(screen.getByText('Reports Page - Admin: Yes')).toBeInTheDocument();
  });

  it('renders FavoritesPanel for favorites tab', () => {
    render(<MainContent {...defaultProps} activeTab="favorites" />);
    expect(screen.getByTestId('favorites-panel')).toBeInTheDocument();
  });

  it('renders HighlightsTab for highlights tab', () => {
    render(<MainContent {...defaultProps} activeTab="highlights" />);
    expect(screen.getByTestId('highlights-tab')).toBeInTheDocument();
  });

  it('renders WatchlistPage for watchlist tab without selected match', () => {
    render(<MainContent {...defaultProps} activeTab="watchlist" />);
    expect(screen.getByTestId('watchlist-page')).toBeInTheDocument();
  });

  it('renders MatchViewer for watchlist tab with selected match', () => {
    const mockMatch = { id: 'match123', homeTeam: { name: 'Team A' } };
    render(
      <MainContent 
        {...defaultProps} 
        activeTab="watchlist" 
        selectedMatch={mockMatch}
      />
    );
    expect(screen.getByTestId('match-viewer')).toBeInTheDocument();
    expect(screen.getByText('MatchViewer: Team A')).toBeInTheDocument();
  });

  it('renders MatchViewer for matches tab with selected match', () => {
    const mockMatch = { id: 'match123', homeTeam: { name: 'Team A' } };
    render(
      <MainContent 
        {...defaultProps} 
        activeTab="matches" 
        selectedMatch={mockMatch}
      />
    );
    expect(screen.getByTestId('match-viewer')).toBeInTheDocument();
    expect(screen.getByText('MatchViewer: Team A')).toBeInTheDocument();
  });

  it('renders LiveSports for matches tab without selected match', () => {
    render(<MainContent {...defaultProps} activeTab="matches" />);
    expect(screen.getByTestId('live-sports')).toBeInTheDocument();
  });

  it('renders LiveSports for default tab', () => {
    render(<MainContent {...defaultProps} activeTab="unknown" />);
    expect(screen.getByTestId('live-sports')).toBeInTheDocument();
  });

  describe('LiveInputWithLoad', () => {
    it('renders LiveInput when match is provided', () => {
      const mockMatch = { id: 'match123', homeTeam: { name: 'Team A' } };
      render(
        <MainContent 
          {...defaultProps} 
          activeTab="liveInput" 
          isAdmin={true}
          selectedMatch={mockMatch}
        />
      );
      expect(screen.getByTestId('live-input')).toBeInTheDocument();
      expect(screen.getByText('Live Input - Match: match123 - Admin: Yes')).toBeInTheDocument();
    });

    it('loads match when only matchId is provided', async () => {
      const mockMatch = { id: 'match456', homeTeam: { name: 'Team B' } };
      apiClient.getMatchById.mockResolvedValue({ data: mockMatch });

      render(
        <MainContent 
          {...defaultProps} 
          activeTab="liveInput" 
          isAdmin={true}
          selectedMatchId="match456"
        />
      );

      // Initially shows loading
      expect(screen.getByText('Loading match…')).toBeInTheDocument();

      // After loading, shows LiveInput with loaded match
      await waitFor(() => {
        expect(screen.getByTestId('live-input')).toBeInTheDocument();
        expect(screen.getByText('Live Input - Match: match456 - Admin: Yes')).toBeInTheDocument();
      });
    });

    it('shows error message when match loading fails', async () => {
      apiClient.getMatchById.mockRejectedValue(new Error('Failed to load'));

      render(
        <MainContent 
          {...defaultProps} 
          activeTab="liveInput" 
          isAdmin={true}
          selectedMatchId="invalid-match"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No match selected. Select a match first from Live Sports.')).toBeInTheDocument();
      });
    });

    it('shows no match message when no match data is available', () => {
      render(
        <MainContent 
          {...defaultProps} 
          activeTab="liveInput" 
          isAdmin={true}
        />
      );

      expect(screen.getByText('No match selected. Select a match first from Live Sports.')).toBeInTheDocument();
    });
  });

  it('matches snapshot with home tab', () => {
    const { container } = render(<MainContent {...defaultProps} activeTab="home" />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot with selected team', () => {
    const mockTeam = { name: 'Chelsea', id: 'team2' };
    const { container } = render(<MainContent {...defaultProps} selectedTeam={mockTeam} />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot with selected match', () => {
    const mockMatch = { id: 'match789', homeTeam: { name: 'Team C' } };
    const { container } = render(
      <MainContent 
        {...defaultProps} 
        activeTab="matches" 
        selectedMatch={mockMatch}
      />
    );
    expect(container).toMatchSnapshot();
  });
});