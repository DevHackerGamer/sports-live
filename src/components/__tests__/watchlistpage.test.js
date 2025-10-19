// __tests__/WatchlistPage.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import WatchlistPage from '../WatchlistPage/WatchlistPage' ;
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';

jest.mock('@clerk/clerk-react');
jest.mock('../../lib/api', () => ({
  apiClient: {
    getUserWatchlist: jest.fn(),
    removeUserMatch: jest.fn(),
  },
}));

describe('WatchlistPage', () => {
  const mockUser = { id: 'user123' };

  beforeEach(() => {
    jest.clearAllMocks();
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
    apiClient.getUserWatchlist.mockReturnValue(new Promise(() => {})); // Never resolves
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

  it('renders a list of watchlist items', async () => {
    apiClient.getUserWatchlist.mockResolvedValue({
      data: [
        {
          matchId: 'match1',
          userId: 'user123',
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          competition: 'Premier League',
          utcDate: new Date().toISOString(),
        },
      ],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/premier league/i)).toBeInTheDocument();
      expect(screen.getByText(/team a/i)).toBeInTheDocument();
      expect(screen.getByText(/vs/i)).toBeInTheDocument();
      expect(screen.getByText(/team b/i)).toBeInTheDocument();
      expect(screen.getByText(/open/i)).toBeInTheDocument();
      expect(screen.getByText(/remove/i)).toBeInTheDocument();
    });
  });

  it('calls onMatchSelect when "Open" button is clicked', async () => {
    const mockOnSelect = jest.fn();
    apiClient.getUserWatchlist.mockResolvedValue({
      data: [{
        matchId: 'match1',
        userId: 'user123',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        competition: 'La Liga',
        utcDate: '2025-09-01T18:00:00Z',
      }],
    });

    renderComponent({ onMatchSelect: mockOnSelect });

    await waitFor(() => screen.getByText(/open/i));
    fireEvent.click(screen.getByText(/open/i));

    expect(mockOnSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'match1',
      homeTeam: { name: 'Team A' },
      awayTeam: { name: 'Team B' },
      competition: { name: 'La Liga' },
      utcDate: '2025-09-01T18:00:00Z',
    }));
  });

  it('removes item when "Remove" is clicked', async () => {
    const match = {
      matchId: 'match1',
      userId: 'user123',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      competition: 'Serie A',
      utcDate: '2025-09-01T18:00:00Z',
    };

    apiClient.getUserWatchlist.mockResolvedValue({ data: [match] });
    apiClient.removeUserMatch.mockResolvedValue({});

    renderComponent();

    await waitFor(() => screen.getByText(/remove/i));
    fireEvent.click(screen.getByText(/remove/i));

    await waitFor(() => {
      expect(apiClient.removeUserMatch).toHaveBeenCalledWith('user123', 'match1');
      expect(screen.queryByText(/serie a/i)).not.toBeInTheDocument(); // Removed
    });
  });

  it('shows alert on remove error', async () => {
    window.alert = jest.fn();
    const match = {
      matchId: 'match1',
      userId: 'user123',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      competition: 'Bundesliga',
      utcDate: '2025-09-01T18:00:00Z',
    };

    apiClient.getUserWatchlist.mockResolvedValue({ data: [match] });
    apiClient.removeUserMatch.mockRejectedValue(new Error('Remove failed'));

    renderComponent();

    await waitFor(() => screen.getByText(/remove/i));
    fireEvent.click(screen.getByText(/remove/i));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to remove from watchlist');
    });
  });
});
