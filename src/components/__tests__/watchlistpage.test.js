// __tests__/WatchlistPage.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import WatchlistPage from '../WatchlistPage/WatchlistPage';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';

jest.mock('@clerk/clerk-react');
jest.mock('../../lib/api', () => ({
  apiClient: {
    getUserWatchlist: jest.fn(),
    removeUserMatch: jest.fn(),
    getTeams: jest.fn(),
  },
}));

describe('WatchlistPage', () => {
  const mockUser = { id: 'user123' };
  const mockTeams = [
    { name: 'Team A', crest: '/teamA.png' },
    { name: 'Team B', crest: '/teamB.png' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.getTeams.mockResolvedValue({ data: mockTeams });
  });

  const renderComponent = (props = {}) => {
    useUser.mockReturnValue({ user: mockUser });
    return render(<WatchlistPage {...props} />);
  };

  it('shows sign-in message when user is not logged in', () => {
    useUser.mockReturnValue({ user: null });
    render(<WatchlistPage />);
    expect(screen.getByText(/sign in required/i)).toBeInTheDocument();
  });

  it('shows loading spinner initially', async () => {
    apiClient.getUserWatchlist.mockReturnValue(new Promise(() => {})); // never resolves
    renderComponent();
    expect(screen.getByText(/loading watchlist/i)).toBeInTheDocument();
  });

  it('shows error if watchlist fetch fails', async () => {
    apiClient.getUserWatchlist.mockRejectedValue(new Error('Network error'));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/could not load watchlist/i)).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('shows empty state if no watchlist items exist', async () => {
    apiClient.getUserWatchlist.mockResolvedValue({ data: [] });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/no matches in your watchlist yet/i)).toBeInTheDocument();
    });
  });

  it('renders watchlist items with crests and handles click events', async () => {
    const match = {
      matchId: 'match1',
      userId: 'user123',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      competition: 'Premier League',
      competitionCode: 'PL',
      utcDate: '2025-10-01T18:00:00Z',
      homeScore: 2,
      awayScore: 1,
    };
    apiClient.getUserWatchlist.mockResolvedValue({ data: [match] });

    const mockOnMatchSelect = jest.fn();
    const mockOnTeamSelect = jest.fn();

    renderComponent({ onMatchSelect: mockOnMatchSelect, onTeamSelect: mockOnTeamSelect });

    await waitFor(() => screen.getByText(/team a/i));

    // Check crests
    const homeCrest = screen.getByAltText('home crest');
    const awayCrest = screen.getByAltText('away crest');
    expect(homeCrest.src).toContain('/teamA.png');
    expect(awayCrest.src).toContain('/teamB.png');

    // Click home team crest
    fireEvent.click(homeCrest);
    expect(mockOnTeamSelect).toHaveBeenCalledWith({ name: 'Team A', crest: '/teamA.png' });

    // Click away team name
    fireEvent.click(screen.getByText(/team b/i));
    expect(mockOnTeamSelect).toHaveBeenCalledWith({ name: 'Team B', crest: '/teamB.png' });

    // Click match card
    fireEvent.click(screen.getByText(/team a/i).closest('.wl-match-card'));
    expect(mockOnMatchSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'match1',
      homeTeam: { name: 'Team A', crest: '/teamA.png' },
      awayTeam: { name: 'Team B', crest: '/teamB.png' },
    }));

    // Click remove button
    apiClient.removeUserMatch.mockResolvedValue({});
    fireEvent.click(screen.getByText(/remove/i));
    await waitFor(() => {
      expect(apiClient.removeUserMatch).toHaveBeenCalledWith('user123', 'match1');
      expect(screen.queryByText(/team a/i)).not.toBeInTheDocument();
    });
  });

  it('shows alert if remove fails', async () => {
    window.alert = jest.fn();
    const match = {
      matchId: 'match1',
      userId: 'user123',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      competition: 'Serie A',
      utcDate: '2025-10-01T18:00:00Z',
    };
    apiClient.getUserWatchlist.mockResolvedValue({ data: [match] });
    apiClient.removeUserMatch.mockRejectedValue(new Error('Failed'));

    renderComponent();
    await waitFor(() => screen.getByText(/remove/i));

    fireEvent.click(screen.getByText(/remove/i));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to remove from watchlist');
    });
  });

  it('falls back to placeholder crest if team not found', async () => {
    const match = {
      matchId: 'match2',
      userId: 'user123',
      homeTeam: 'Unknown Team',
      awayTeam: 'Team B',
      competition: 'Ligue 1',
      utcDate: '2025-10-01T18:00:00Z',
    };
    apiClient.getUserWatchlist.mockResolvedValue({ data: [match] });
    renderComponent();

    await waitFor(() => screen.getByText(/unknown team/i));
    const homeCrest = screen.getByAltText('home crest');
    expect(homeCrest.src).toContain('/placeholder.png');
  });
});
