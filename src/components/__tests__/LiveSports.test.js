import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LiveSports from '../sports/LiveSports';
import * as ClerkReact from '@clerk/clerk-react';
import * as api from '../../lib/api';

// Mock Clerk hooks
jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
}));

// Mock API client
jest.mock('../../lib/api', () => ({
  apiClient: {
    getUserWatchlist: jest.fn(),
    getMatchesByDate: jest.fn(),
    getTeams: jest.fn(),
    addUserMatch: jest.fn(),
  },
}));

// Mock custom hooks
jest.mock('../../hooks/useLiveSports', () => ({
  useLiveSports: jest.fn(),
}));

// Mock child components and utilities
jest.mock('../TeamInfo/TeamInfo', () => ({ team, onBack }) => (
  <div data-testid="team-info">
    Team Info: {team?.name}
    <button onClick={onBack}>Back to Matches</button>
  </div>
));

jest.mock('../../lib/leagueNames', () => ({
  getLeagueName: jest.fn((code) => code || 'Unknown League'),
}));

// Mock FontAwesome
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ icon, ...props }) => <span data-testid="font-awesome-icon" {...props} />,
}));

describe('LiveSports Component', () => {
  const mockOnMatchSelect = jest.fn();
  const mockUser = { id: 'user123', firstName: 'John' };

  const mockSportsData = {
    games: [
      {
        id: 'match1',
        homeTeam: { name: 'Arsenal' },
        awayTeam: { name: 'Chelsea' },
        homeScore: 2,
        awayScore: 1,
        status: 'live',
        competition: 'Premier League',
        competitionCode: 'PL',
        utcDate: '2024-01-15T15:00:00Z',
        venue: 'Emirates Stadium',
        matchday: 1,
        __utcMs: Date.parse('2024-01-15T15:00:00Z'),
      },
      {
        id: 'match2',
        homeTeam: { name: 'Liverpool' },
        awayTeam: { name: 'Manchester City' },
        homeScore: 0,
        awayScore: 0,
        status: 'scheduled',
        competition: 'Premier League',
        competitionCode: 'PL',
        utcDate: '2024-01-16T17:30:00Z',
        venue: 'Anfield',
        matchday: 1,
        __utcMs: Date.parse('2024-01-16T17:30:00Z'),
      },
    ],
    range: {
      dateFrom: '2024-01-15',
      dateTo: '2024-01-21',
    },
    totalMatches: 2,
    source: 'ESPN',
    environment: 'production',
  };

  const mockTeamsData = {
    data: [
      { name: 'Arsenal', crest: '/arsenal.png' },
      { name: 'Chelsea', crest: '/chelsea.png' },
      { name: 'Liverpool', crest: '/liverpool.png' },
      { name: 'Manchester City', crest: '/mancity.png' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    ClerkReact.useUser.mockReturnValue({ user: mockUser });
    
    // Mock useLiveSports hook
    const { useLiveSports } = require('../../hooks/useLiveSports');
    useLiveSports.mockReturnValue({
      sportsData: mockSportsData,
      isConnected: true,
      error: null,
      lastUpdated: new Date('2024-01-15T14:30:00Z'),
    });

    // Mock API responses
    api.apiClient.getUserWatchlist.mockResolvedValue({ data: [] });
    api.apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
    api.apiClient.getTeams.mockResolvedValue(mockTeamsData);
    api.apiClient.addUserMatch.mockResolvedValue({});

    // Mock league names
    const { getLeagueName } = require('../../lib/leagueNames');
    getLeagueName.mockImplementation((code) => {
      const leagues = { PL: 'Premier League', UCL: 'Champions League' };
      return leagues[code] || code || 'Unknown League';
    });
  });

  it('renders loading state initially', () => {
    const { useLiveSports } = require('../../hooks/useLiveSports');
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: false,
      error: null,
      lastUpdated: null,
    });

    render(<LiveSports onMatchSelect={mockOnMatchSelect} />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByText('Loading live matches...')).toBeInTheDocument();
  });

  it('renders error state when there is an error', () => {
    const { useLiveSports } = require('../../hooks/useLiveSports');
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: false,
      error: new Error('Connection failed'),
      lastUpdated: null,
    });

    render(<LiveSports onMatchSelect={mockOnMatchSelect} />);

    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to fetch live sports data')).toBeInTheDocument();
  });

  it('renders main content with matches when data is available', async () => {
    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    expect(screen.getByText('Live Football')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByTestId('matches-container')).toBeInTheDocument();
  });

  it('shows connection status and current time', async () => {
    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it('handles match selection when match card is clicked', async () => {
    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    const matchCards = screen.getAllByTestId(/match-/);
    fireEvent.click(matchCards[0]);

    expect(mockOnMatchSelect).toHaveBeenCalledWith(mockSportsData.games[0]);
  });

  it('switches between upcoming and past view modes', async () => {
    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    // Initially in upcoming view
    expect(screen.getByText('Upcoming')).toHaveClass('ls-active');

    // Switch to past view
    const pastButton = screen.getByText('Past Results');
    fireEvent.click(pastButton);

    expect(screen.getByText('Past Results')).toHaveClass('ls-active');
  });

  it('loads past matches when switching to past view', async () => {
    const pastMatches = [
      {
        id: 'past1',
        homeTeam: { name: 'Arsenal' },
        awayTeam: { name: 'Tottenham' },
        homeScore: 3,
        awayScore: 1,
        status: 'finished',
        competition: 'Premier League',
        competitionCode: 'PL',
        utcDate: '2024-01-14T15:00:00Z',
        venue: 'Emirates Stadium',
        matchday: 1,
        __utcMs: Date.parse('2024-01-14T15:00:00Z'),
      },
    ];

    api.apiClient.getMatchesByDate.mockResolvedValue({ data: pastMatches });

    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    // Switch to past view
    const pastButton = screen.getByText('Past Results');
    await act(async () => {
      fireEvent.click(pastButton);
    });

    await waitFor(() => {
      expect(api.apiClient.getMatchesByDate).toHaveBeenCalled();
    });
  });

  it('handles team selection when team name or crest is clicked', async () => {
    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    const teamNames = screen.getAllByText('Arsenal');
    fireEvent.click(teamNames[0]);

    // Should show TeamInfo component
    expect(screen.getByTestId('team-info')).toBeInTheDocument();
    expect(screen.getByText('Team Info: Arsenal')).toBeInTheDocument();
  });

  it('adds match to watchlist when watchlist button is clicked', async () => {
    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    // Hover over a match card to show watchlist button
    const matchCard = screen.getAllByTestId(/match-/)[0];
    fireEvent.mouseEnter(matchCard);

    const watchlistButton = await screen.findByText('+ Watchlist');
    await act(async () => {
      fireEvent.click(watchlistButton);
    });

    expect(api.apiClient.addUserMatch).toHaveBeenCalledWith(
      mockUser.id,
      mockSportsData.games[0]
    );
  });

  it('fetches user watchlist on component mount', async () => {
    const watchlistData = { data: [{ matchId: 'match1' }] };
    api.apiClient.getUserWatchlist.mockResolvedValue(watchlistData);

    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    expect(api.apiClient.getUserWatchlist).toHaveBeenCalledWith(mockUser.id);
  });

  it('handles missing user gracefully', async () => {
    ClerkReact.useUser.mockReturnValue({ user: null });

    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    // Should still render without errors
    expect(screen.getByText('Live Football')).toBeInTheDocument();
  });

  it('displays different status badges correctly', async () => {
    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    // Check for live status badge
    expect(screen.getByTestId('status-live')).toBeInTheDocument();
    expect(screen.getByTestId('status-scheduled')).toBeInTheDocument();
  });

  it('shows empty state when no matches are available', async () => {
    const { useLiveSports } = require('../../hooks/useLiveSports');
    useLiveSports.mockReturnValue({
      sportsData: { games: [], totalMatches: 0 },
      isConnected: true,
      error: null,
      lastUpdated: new Date(),
    });

    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    expect(screen.getByText('No upcoming matches in this date range')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    api.apiClient.getTeams.mockRejectedValue(new Error('Failed to fetch teams'));

    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    // Should still render matches even if team crests fail
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
  });

  it('formats dates and times correctly', async () => {
    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    // Check if date range is displayed
    expect(screen.getByText(/Range:/)).toBeInTheDocument();
    expect(screen.getByText(/Matches: 2/)).toBeInTheDocument();
  });

  it('displays match scores and minute for live matches', async () => {
    await act(async () => {
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    });

    expect(screen.getByText('2')).toBeInTheDocument(); // Arsenal score
    expect(screen.getByText('1')).toBeInTheDocument(); // Chelsea score
  });

  it('matches snapshot with loaded data', async () => {
    await act(async () => {
      const { container } = render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
      expect(container).toMatchSnapshot();
    });
  });

  it('matches snapshot in loading state', () => {
    const { useLiveSports } = require('../../hooks/useLiveSports');
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: false,
      error: null,
      lastUpdated: null,
    });

    const { container } = render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot in error state', () => {
    const { useLiveSports } = require('../../hooks/useLiveSports');
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: false,
      error: new Error('Test error'),
      lastUpdated: null,
    });

    const { container } = render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
    expect(container).toMatchSnapshot();
  });

  describe('TeamInfo integration', () => {
    it('shows TeamInfo when a team is selected', async () => {
      await act(async () => {
        render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
      });

      const teamNames = screen.getAllByText('Arsenal');
      fireEvent.click(teamNames[0]);

      expect(screen.getByTestId('team-info')).toBeInTheDocument();
      expect(screen.getByText('Back to Matches')).toBeInTheDocument();
    });

    it('returns to matches view when back button is clicked in TeamInfo', async () => {
      await act(async () => {
        render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
      });

      // Select a team
      const teamNames = screen.getAllByText('Arsenal');
      fireEvent.click(teamNames[0]);

      // Click back button
      const backButton = screen.getByText('Back to Matches');
      fireEvent.click(backButton);

      expect(screen.queryByTestId('team-info')).not.toBeInTheDocument();
    });
  });

  describe('Watchlist functionality', () => {
    it('shows watchlist button only when user is logged in', async () => {
      ClerkReact.useUser.mockReturnValue({ user: null });

      await act(async () => {
        render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
      });

      const matchCard = screen.getAllByTestId(/match-/)[0];
      fireEvent.mouseEnter(matchCard);

      expect(screen.queryByText('+ Watchlist')).not.toBeInTheDocument();
    });

    it('does not show watchlist button for already added matches', async () => {
      const watchlistData = { data: [{ matchId: 'match1' }] };
      api.apiClient.getUserWatchlist.mockResolvedValue(watchlistData);

      await act(async () => {
        render(<LiveSports onMatchSelect={mockOnMatchSelect} />);
      });

      const matchCard = screen.getAllByTestId(/match-/)[0];
      fireEvent.mouseEnter(matchCard);

      expect(screen.queryByText('+ Watchlist')).not.toBeInTheDocument();
    });
  });
});
