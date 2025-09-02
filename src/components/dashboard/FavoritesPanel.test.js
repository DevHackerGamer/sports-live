import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FavoritesPanel from './FavoritesPanel';

jest.mock('../../lib/api', () => ({
  apiClient: {
    getMatchesByDate: jest.fn(),
    getTeams: jest.fn(),
    getUserFavorites: jest.fn(),
    addUserFavorite: jest.fn(),
    removeUserFavorite: jest.fn(),
  }
}));

jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn()
}));

describe('FavoritesPanel', () => {
  const { apiClient } = require('../../lib/api');
  const { useUser } = require('@clerk/clerk-react');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading user state', () => {
    useUser.mockReturnValue({ user: null });
    render(<FavoritesPanel />);
    expect(screen.getByTestId('loading-user')).toBeInTheDocument();
  });

  test('renders no favorites message', async () => {
    useUser.mockReturnValue({ user: { id: 'user1' } });
    apiClient.getUserFavorites.mockResolvedValue({ data: [] });
    apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
    apiClient.getTeams.mockResolvedValue({ data: ['TeamA', 'TeamB'] });

    await act(async () => {
      render(<FavoritesPanel />);
    });

    expect(screen.getByTestId('no-favorites')).toBeInTheDocument();
  });

  test('renders favorites with upcoming matches', async () => {
    const todayISO = new Date().toISOString();
    useUser.mockReturnValue({ user: { id: 'user1' } });
    apiClient.getUserFavorites.mockResolvedValue({ data: ['TeamA'] });
    apiClient.getMatchesByDate.mockResolvedValue({ data: [
      { id: 'm1', homeTeam: 'TeamA', awayTeam: 'TeamB', utcDate: todayISO, status: 'scheduled' }
    ]});
    apiClient.getTeams.mockResolvedValue({ data: ['TeamA', 'TeamB'] });

    await act(async () => {
      render(<FavoritesPanel />);
    });

    const favoriteItem = screen.getByTestId('favorite-item');
    expect(favoriteItem).toBeInTheDocument();
    expect(screen.getByText(/Upcoming Matches: 1/)).toBeInTheDocument();
    const upcoming = screen.getByTestId('upcoming-match');
    expect(upcoming).toBeInTheDocument();
  });

  test('can remove a favorite', async () => {
    useUser.mockReturnValue({ user: { id: 'user1' } });
    apiClient.getUserFavorites.mockResolvedValue({ data: ['TeamA'] });
    apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
    apiClient.getTeams.mockResolvedValue({ data: ['TeamA'] });
    apiClient.removeUserFavorite.mockResolvedValue({});

    await act(async () => {
      render(<FavoritesPanel />);
    });

    fireEvent.click(screen.getByTestId('remove-favorite'));
    expect(apiClient.removeUserFavorite).toHaveBeenCalledWith('user1', 'TeamA');
  });

  test('can add a favorite via input Enter', async () => {
    useUser.mockReturnValue({ user: { id: 'user1' } });
    apiClient.getUserFavorites.mockResolvedValue({ data: [] });
    apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
    apiClient.getTeams.mockResolvedValue({ data: ['TeamA'] });
    apiClient.addUserFavorite.mockResolvedValue({});

    await act(async () => {
      render(<FavoritesPanel />);
    });

    const input = screen.getByTestId('add-input');
    fireEvent.change(input, { target: { value: 'TeamA' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    expect(apiClient.addUserFavorite).toHaveBeenCalledWith('user1', 'TeamA');
  });

  test('can add a favorite via dropdown selection', async () => {
    useUser.mockReturnValue({ user: { id: 'user1' } });
    apiClient.getUserFavorites.mockResolvedValue({ data: [] });
    apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
    apiClient.getTeams.mockResolvedValue({ data: ['TeamA'] });
    apiClient.addUserFavorite.mockResolvedValue({});

    await act(async () => {
      render(<FavoritesPanel />);
    });

    const dropdown = screen.getByTestId('add-dropdown');
    await act(async () => {
      fireEvent.change(dropdown, { target: { value: 'TeamA' } });
    });

    expect(apiClient.addUserFavorite).toHaveBeenCalledWith('user1', 'TeamA');
  });

  test('can add a favorite via Add button', async () => {
    useUser.mockReturnValue({ user: { id: 'user1' } });
    apiClient.getUserFavorites.mockResolvedValue({ data: [] });
    apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
    apiClient.getTeams.mockResolvedValue({ data: ['TeamA'] });
    apiClient.addUserFavorite.mockResolvedValue({});

    await act(async () => {
      render(<FavoritesPanel />);
    });

    const input = screen.getByTestId('add-input');
    fireEvent.change(input, { target: { value: 'TeamA' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-button'));
    });

    expect(apiClient.addUserFavorite).toHaveBeenCalledWith('user1', 'TeamA');
  });

  test('handles fetch error gracefully', async () => {
    useUser.mockReturnValue({ user: { id: 'user1' } });
    apiClient.getUserFavorites.mockRejectedValue(new Error('Fetch failed'));
    apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
    apiClient.getTeams.mockResolvedValue({ data: [] });

    await act(async () => {
      render(<FavoritesPanel />);
    });

    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(screen.getByText(/Fetch failed/i)).toBeInTheDocument();
  });
});
