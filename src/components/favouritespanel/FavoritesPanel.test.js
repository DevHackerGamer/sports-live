import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FavoritesPanel from './FavoritesPanel';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';

jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn()
}));

jest.mock('../../lib/api', () => ({
  apiClient: {
    getMatchesByDate: jest.fn(),
    getTeams: jest.fn(),
    getUserFavorites: jest.fn(),
    addUserFavorite: jest.fn(),
    removeUserFavorite: jest.fn()
  }
}));

describe('FavoritesPanel Component', () => {
  const mockUser = { id: 'user123' };

  const allTeamsMock = [
    { name: 'TeamA', crest: 'crestA.png', shortName: 'TA', tla: 'TMA' },
    { name: 'TeamB' },
    'TeamC'
  ];

  const matchesMock = [
    { id: 1, homeTeam: 'TeamA', awayTeam: 'TeamB', utcDate: new Date().toISOString(), status: 'scheduled', competition: 'Comp1' },
    { id: 2, homeTeam: 'TeamC', awayTeam: 'TeamB', utcDate: new Date().toISOString(), status: 'live', competition: 'Comp2' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockReturnValue({ user: mockUser });
    apiClient.getTeams.mockResolvedValue({ data: allTeamsMock });
    apiClient.getUserFavorites.mockResolvedValue({ data: ['TeamA'] });
    apiClient.getMatchesByDate.mockResolvedValue({ data: matchesMock });
  });

  test('renders loading state when user not signed in', () => {
    useUser.mockReturnValue({ user: null });
    render(<FavoritesPanel />);
    expect(screen.getByTestId('loading-user')).toBeInTheDocument();
  });

  test('loads favorites, matches, and teams', async () => {
    render(<FavoritesPanel />);
    await waitFor(() => expect(screen.getByText(/TeamA/i)).toBeInTheDocument());
    expect(apiClient.getTeams).toHaveBeenCalled();
    expect(apiClient.getUserFavorites).toHaveBeenCalledWith(mockUser.id);
    expect(apiClient.getMatchesByDate).toHaveBeenCalled();
  });

  test('displays upcoming matches for favorite teams', async () => {
    render(<FavoritesPanel />);
    await waitFor(() => screen.getByTestId('favorites-list'));
    const upcoming = screen.getByTestId('upcoming-list');
    expect(upcoming).toBeInTheDocument();
    expect(upcoming.children.length).toBeGreaterThan(0);
  });

  test('adds a favorite via input', async () => {
    render(<FavoritesPanel />);
    await waitFor(() => screen.getByTestId('add-input'));
    const input = screen.getByTestId('add-input');
    fireEvent.change(input, { target: { value: 'TeamB' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => screen.getByText(/TeamB/i));
    expect(apiClient.addUserFavorite).toHaveBeenCalledWith(mockUser.id, 'TeamB');
  });

  test('adds a favorite via dropdown', async () => {
    render(<FavoritesPanel />);
    await waitFor(() => screen.getByTestId('add-dropdown'));
    const dropdown = screen.getByTestId('add-dropdown');
    fireEvent.change(dropdown, { target: { value: 'TeamB' } });

    await waitFor(() => screen.getByText(/TeamB/i));
    expect(apiClient.addUserFavorite).toHaveBeenCalledWith(mockUser.id, 'TeamB');
  });

  test('removes a favorite', async () => {
    render(<FavoritesPanel />);
    await waitFor(() => screen.getByTestId('remove-favorite'));
    const button = screen.getByTestId('remove-favorite');
    apiClient.getUserFavorites.mockResolvedValueOnce({ data: [] });
    fireEvent.click(button);

    await waitFor(() => expect(screen.queryByText(/TeamA/i)).not.toBeInTheDocument());
    expect(apiClient.removeUserFavorite).toHaveBeenCalledWith(mockUser.id, 'TeamA');
  });

  test('handles invalid team input gracefully', async () => {
    render(<FavoritesPanel />);
    const input = screen.getByTestId('add-input');
    fireEvent.change(input, { target: { value: 'InvalidTeam' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument());
  });

  test('displays "no favorite teams" message when empty', async () => {
    apiClient.getUserFavorites.mockResolvedValueOnce({ data: [] });
    render(<FavoritesPanel />);
    await waitFor(() => expect(screen.getByTestId('no-favorites')).toBeInTheDocument());
  });

  test('renders upcoming matches count correctly', async () => {
    render(<FavoritesPanel />);
    await waitFor(() => screen.getByText(/Upcoming Matches:/i));
    expect(screen.getByText(/Upcoming Matches: 1/i)).toBeInTheDocument();
  });
});
