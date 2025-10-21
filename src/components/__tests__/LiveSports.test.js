// src/components/__tests__/LiveSports.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useUser } from '@clerk/clerk-react';
import { useLiveSports } from '../../hooks/useLiveSports';
import { apiClient } from '../../lib/api';
import LiveSports from '../sports/LiveSports';

// Mock dependencies
jest.mock('@clerk/clerk-react');
jest.mock('../../hooks/useLiveSports');
jest.mock('../../lib/api');

// Mock TeamInfo component
jest.mock('../TeamInfo/TeamInfo', () => {
  return function MockTeamInfo({ team, onBack }) {
    return (
      <div data-testid="team-info">
        <div>Team Info: {team?.name}</div>
        <button onClick={onBack}>Back to Matches</button>
      </div>
    );
  };
});

describe('LiveSports Component', () => {
  const mockUseUser = useUser;
  const mockUseLiveSports = useLiveSports;
  const mockApiClient = apiClient;

  const mockUser = {
    id: 'user123',
    firstName: 'John',
    lastName: 'Doe'
  };

  const mockGames = [
    {
      id: '1',
      homeTeam: { name: 'Arsenal', id: 'arsenal' },
      awayTeam: { name: 'Chelsea', id: 'chelsea' },
      competition: 'Premier League',
      competitionCode: 'PL',
      status: 'LIVE',
      minute: 45,
      homeScore: 2,
      awayScore: 1,
      utcDate: '2024-01-15T15:00:00Z',
      venue: 'Emirates Stadium',
      matchday: 22,
      createdByAdmin: false
    },
    {
      id: '2',
      homeTeam: { name: 'Manchester United', id: 'manutd' },
      awayTeam: { name: 'Liverpool', id: 'liverpool' },
      competition: 'Premier League',
      competitionCode: 'PL',
      status: 'SCHEDULED',
      homeScore: 0,
      awayScore: 0,
      utcDate: '2024-01-20T17:30:00Z',
      venue: 'Old Trafford',
      matchday: 23,
      createdByAdmin: false
    },
    {
      id: '3',
      homeTeam: { name: 'Barcelona', id: 'barca' },
      awayTeam: { name: 'Real Madrid', id: 'realmadrid' },
      competition: 'La Liga',
      competitionCode: 'LL',
      status: 'FINISHED',
      homeScore: 3,
      awayScore: 2,
      utcDate: '2024-01-10T20:00:00Z',
      venue: 'Camp Nou',
      matchday: 18,
      createdByAdmin: true,
      time: '20:00'
    }
  ];

  const mockSportsData = {
    games: mockGames,
    totalMatches: 3,
    source: 'API',
    environment: 'test',
    range: {
      dateFrom: '2024-01-10',
      dateTo: '2024-01-20'
    }
  };

  const mockTeams = [
    { name: 'Arsenal', crest: '/arsenal.png', logo: '/arsenal.png' },
    { name: 'Chelsea', crest: '/chelsea.png', logo: '/chelsea.png' },
    { name: 'Manchester United', crest: '/manutd.png', logo: '/manutd.png' },
    { name: 'Liverpool', crest: '/liverpool.png', logo: '/liverpool.png' },
    { name: 'Barcelona', crest: '/barcelona.png', logo: '/barcelona.png' },
    { name: 'Real Madrid', crest: '/realmadrid.png', logo: '/realmadrid.png' }
  ];

  const mockWatchlist = [
    { matchId: '1' },
    { matchId: '3' }
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mocks
    mockUseUser.mockReturnValue({ user: mockUser });
    mockUseLiveSports.mockReturnValue({
      sportsData: mockSportsData,
      isConnected: true,
      error: null,
      lastUpdated: new Date('2024-01-15T14:30:00Z'),
      refreshData: jest.fn()
    });

    mockApiClient.getUserWatchlist.mockResolvedValue({ data: mockWatchlist });
    mockApiClient.getTeams.mockResolvedValue({ data: mockTeams });
    mockApiClient.addUserMatch.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering States', () => {
    it('renders loading state when no sports data', () => {
      mockUseLiveSports.mockReturnValue({
        sportsData: null,
        isConnected: false,
        error: null,
        lastUpdated: null,
        refreshData: jest.fn()
      });

      render(<LiveSports />);
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText('Loading live matches...')).toBeInTheDocument();
    });

    it('renders error state when there is an error', () => {
      mockUseLiveSports.mockReturnValue({
        sportsData: null,
        isConnected: false,
        error: new Error('Connection failed'),
        lastUpdated: null,
        refreshData: jest.fn()
      });

      render(<LiveSports />);
      
      expect(screen.getByTestId('error')).toBeInTheDocument();
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Unable to fetch live sports data')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('renders matches when data is available', async () => {
      render(<LiveSports />);

      await waitFor(() => {
        expect(screen.getByTestId('matches-container')).toBeInTheDocument();
      });

      expect(screen.getByText('Live Football')).toBeInTheDocument();
      expect(screen.getByText('Arsenal')).toBeInTheDocument();
      expect(screen.getByText('Chelsea')).toBeInTheDocument();
      expect(screen.getByText('Manchester United')).toBeInTheDocument();
      expect(screen.getByText('Liverpool')).toBeInTheDocument();
    });

    it('renders empty state when no matches available', async () => {
      mockUseLiveSports.mockReturnValue({
        sportsData: { games: [], totalMatches: 0 },
        isConnected: true,
        error: null,
        lastUpdated: new Date(),
        refreshData: jest.fn()
      });

      render(<LiveSports />);

      await waitFor(() => {
        expect(screen.getByTestId('empty')).toBeInTheDocument();
      });

      expect(screen.getByText('No matches available')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  describe('Header and Connection Status', () => {
    it('displays connection status correctly', () => {
      render(<LiveSports />);

      expect(screen.getByText('Live Football')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('displays disconnected status', () => {
      mockUseLiveSports.mockReturnValue({
        sportsData: mockSportsData,
        isConnected: false,
        error: null,
        lastUpdated: new Date(),
        refreshData: jest.fn()
      });

      render(<LiveSports />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('displays current time and last updated', () => {
      jest.useFakeTimers();
      render(<LiveSports />);

      const currentTime = new Date();
      const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      expect(screen.getByText(timeString)).toBeInTheDocument();
      expect(screen.getByText(/Updated/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onMatchSelect when match card is clicked', async () => {
      const mockOnMatchSelect = jest.fn();
      
      render(<LiveSports onMatchSelect={mockOnMatchSelect} />);

      await waitFor(() => {
        expect(screen.getByTestId('match-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('match-1'));

      expect(mockOnMatchSelect).toHaveBeenCalledWith(mockGames[0]);
    });

   

    it('returns from TeamInfo to matches when back is clicked', async () => {
      render(<LiveSports />);

      await waitFor(() => {
        expect(screen.getByTestId('match-1')).toBeInTheDocument();
      });

      // Click on team crest to show TeamInfo
      const homeCrest = screen.getAllByAltText('home crest')[0];
      fireEvent.click(homeCrest);

      expect(screen.getByTestId('team-info')).toBeInTheDocument();

      // Click back button
      fireEvent.click(screen.getByText('Back to Matches'));

      expect(screen.queryByTestId('team-info')).not.toBeInTheDocument();
      expect(screen.getByTestId('matches-container')).toBeInTheDocument();
    });

    it('adds match to watchlist when hovered and clicked', async () => {
      render(<LiveSports />);

      await waitFor(() => {
        expect(screen.getByTestId('match-2')).toBeInTheDocument();
      });

      // Hover over match card (Manchester United vs Liverpool - not in watchlist)
      const matchCard = screen.getByTestId('match-2');
      fireEvent.mouseEnter(matchCard);

      // Wait for watchlist button to appear
      await waitFor(() => {
        expect(screen.getByText('+ Watchlist')).toBeInTheDocument();
      });

      // Click watchlist button
      fireEvent.click(screen.getByText('+ Watchlist'));

      expect(mockApiClient.addUserMatch).toHaveBeenCalledWith('user123', mockGames[1]);
    });

    it('does not show watchlist button for matches already in watchlist', async () => {
      render(<LiveSports />);

      await waitFor(() => {
        expect(screen.getByTestId('match-1')).toBeInTheDocument();
      });

      // Hover over match card that's already in watchlist (Arsenal vs Chelsea)
      const matchCard = screen.getByTestId('match-1');
      fireEvent.mouseEnter(matchCard);

      // Should not show watchlist button since it's already in watchlist
      await waitFor(() => {
        expect(screen.queryByText('+ Watchlist')).not.toBeInTheDocument();
      });
    });

    it('handles watchlist add failure gracefully', async () => {
      mockApiClient.addUserMatch.mockRejectedValue(new Error('Failed to add'));

      render(<LiveSports />);

      await waitFor(() => {
        expect(screen.getByTestId('match-2')).toBeInTheDocument();
      });

      // Hover and click watchlist button
      const matchCard = screen.getByTestId('match-2');
      fireEvent.mouseEnter(matchCard);

      await waitFor(() => {
        expect(screen.getByText('+ Watchlist')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ Watchlist'));

      // Should handle error without crashing
      expect(mockApiClient.addUserMatch).toHaveBeenCalled();
    });
  });

  describe('Refresh Functionality', () => {
    it('calls refreshData when refresh button is clicked', async () => {
      const mockRefreshData = jest.fn();
      mockUseLiveSports.mockReturnValue({
        sportsData: mockSportsData,
        isConnected: true,
        error: null,
        lastUpdated: new Date(),
        refreshData: mockRefreshData
      });

      render(<LiveSports />);

      const refreshButtons = screen.getAllByText('Refresh Data');
      fireEvent.click(refreshButtons[0]); // Click the main refresh button

      expect(mockRefreshData).toHaveBeenCalled();
    });

    it('calls refreshData when retry button is clicked in error state', () => {
      const mockRefreshData = jest.fn();
      mockUseLiveSports.mockReturnValue({
        sportsData: null,
        isConnected: false,
        error: new Error('Connection failed'),
        lastUpdated: null,
        refreshData: mockRefreshData
      });

      render(<LiveSports />);

      fireEvent.click(screen.getByText('Retry'));

      expect(mockRefreshData).toHaveBeenCalled();
    });
  });

  describe('Team Crest Handling', () => {
    it('fetches and displays team crests', async () => {
      render(<LiveSports />);

      await waitFor(() => {
        expect(mockApiClient.getTeams).toHaveBeenCalled();
      });

      // Should have attempted to load crests for all teams
      expect(screen.getAllByAltText('home crest').length).toBeGreaterThan(0);
      expect(screen.getAllByAltText('away crest').length).toBeGreaterThan(0);
    });

    it('handles missing team crests gracefully', async () => {
      mockApiClient.getTeams.mockResolvedValue({ data: [] }); // No teams returned

      render(<LiveSports />);

      await waitFor(() => {
        expect(screen.getByTestId('matches-container')).toBeInTheDocument();
      });

      // Should still render without crashing
      expect(screen.getByText('Arsenal')).toBeInTheDocument();
    });
  });

  describe('Watchlist Management', () => {
    it('loads user watchlist on mount', async () => {
      render(<LiveSports />);

      await waitFor(() => {
        expect(mockApiClient.getUserWatchlist).toHaveBeenCalledWith('user123');
      });
    });

    it('handles missing user gracefully', async () => {
      mockUseUser.mockReturnValue({ user: null });

      render(<LiveSports />);

      await waitFor(() => {
        expect(screen.getByTestId('matches-container')).toBeInTheDocument();
      });

      // Should not attempt to load watchlist
      expect(mockApiClient.getUserWatchlist).not.toHaveBeenCalled();
    });
  });

  

  describe('Time-based Functionality', () => {
    it('updates current time periodically', () => {
      jest.useFakeTimers();
      render(<LiveSports />);

      const initialTime = new Date();
      const initialTimeString = initialTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      expect(screen.getByText(initialTimeString)).toBeInTheDocument();

      // Advance time by 1 minute
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      const newTime = new Date(initialTime.getTime() + 60000);
      const newTimeString = newTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      expect(screen.getByText(newTimeString)).toBeInTheDocument();
    });

    it('pauses time updates when page is not visible', () => {
      jest.useFakeTimers();
      render(<LiveSports />);

      const initialTime = new Date();
      const initialTimeString = initialTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      expect(screen.getByText(initialTimeString)).toBeInTheDocument();

      // Simulate page becoming hidden
      act(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Advance time - should not update
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Time should still show initial value
      expect(screen.getByText(initialTimeString)).toBeInTheDocument();

      // Simulate page becoming visible again
      act(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Time should update now
      const newTime = new Date(initialTime.getTime() + 120000);
      const newTimeString = newTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(screen.getByText(newTimeString)).toBeInTheDocument();
    });
  });

 
});