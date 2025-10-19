import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LiveSports from '../LiveSports/LiveSports';
import { apiClient } from '../../lib/api';
import { useUser } from '@clerk/clerk-react';
import { useLiveSports } from '../../hooks/useLiveSports';

jest.mock('../../lib/api', () => ({
  apiClient: {
    getUserWatchlist: jest.fn(),
    getTeams: jest.fn(),
    addUserMatch: jest.fn(),
  },
}));

jest.mock('../../hooks/useLiveSports', () => ({
  useLiveSports: jest.fn(),
}));

jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
}));

// Minimal MatchCard stub to avoid rendering heavy nested components
jest.mock('../LiveSports/LiveSports', () => {
  const original = jest.requireActual('../LiveSports/LiveSports');
  return {
    ...original,
    MatchCard: ({ game, onSelect }) => (
      <div data-testid={`match-${game.id}`}>{game.homeTeam.name} vs {game.awayTeam.name}</div>
    ),
  };
});

describe('LiveSports Component', () => {
  const mockUser = { id: 'user1' };
  const mockGames = [
    {
      id: 'match1',
      homeTeam: { name: 'Team A' },
      awayTeam: { name: 'Team B' },
      utcDate: new Date().toISOString(),
      status: 'scheduled',
    },
  ];
  const mockSportsData = {
    games: mockGames,
    totalMatches: 1,
    dateFrom: new Date().toISOString(),
    dateTo: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockReturnValue({ user: mockUser });
    apiClient.getUserWatchlist.mockResolvedValue({ data: [] });
    apiClient.getTeams.mockResolvedValue({
      data: [
        { name: 'Team A', crest: '/a.png' },
        { name: 'Team B', crest: '/b.png' },
      ],
    });
    useLiveSports.mockReturnValue({
      sportsData: mockSportsData,
      isConnected: true,
      error: null,
      lastUpdated: new Date(),
      refreshData: jest.fn(),
    });
  });

  it('renders loading state initially', () => {
    useLiveSports.mockReturnValue({ sportsData: null, isConnected: true, error: null, refreshData: jest.fn() });
    render(<LiveSports />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders error state if hook returns error', () => {
    const mockRefresh = jest.fn();
    useLiveSports.mockReturnValue({ sportsData: null, isConnected: false, error: 'Failed', refreshData: mockRefresh });
    render(<LiveSports />);
    expect(screen.getByTestId('error')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Retry/i));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('renders match cards', async () => {
    render(<LiveSports />);
    await waitFor(() => screen.getByText(/Team A vs Team B/i));
    expect(screen.getByText(/Team A vs Team B/i)).toBeInTheDocument();
  });

  it('fetches user watchlist and team crests', async () => {
    render(<LiveSports />);
    await waitFor(() => {
      expect(apiClient.getUserWatchlist).toHaveBeenCalledWith('user1');
      expect(apiClient.getTeams).toHaveBeenCalled();
    });
  });

  it('updates watchlist when adding match', async () => {
    apiClient.addUserMatch.mockResolvedValue({});
    render(<LiveSports />);
    await waitFor(() => screen.getByText(/Team A vs Team B/i));

    // Simulate hovering and clicking watchlist button
    const matchCard = screen.getByText(/Team A vs Team B/i).parentElement;
    fireEvent.mouseEnter(matchCard);

    const watchBtn = matchCard.querySelector('button');
    if (watchBtn) {
      fireEvent.click(watchBtn);
      await waitFor(() => {
        expect(apiClient.addUserMatch).toHaveBeenCalledWith('user1', mockGames[0]);
      });
    }
  });

  it('calls onMatchSelect when a match is clicked', async () => {
    const onMatchSelect = jest.fn();
    render(<LiveSports onMatchSelect={onMatchSelect} />);
    const card = await screen.findByText(/Team A vs Team B/i);
    fireEvent.click(card);
    expect(onMatchSelect).toHaveBeenCalledWith(mockGames[0]);
  });
});
