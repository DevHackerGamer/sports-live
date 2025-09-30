import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FavoritesPanel from '..favouritespanel/FavoritesPanel';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';

jest.mock('@clerk/clerk-react', () => ({ useUser: jest.fn() }));
jest.mock('../../lib/api', () => ({
  apiClient: {
    getMatchesByDate: jest.fn(),
    getTeams: jest.fn(),
    getUserFavorites: jest.fn(),
    addUserFavorite: jest.fn(),
    removeUserFavorite: jest.fn(),
  }
}));

beforeEach(() => {
  useUser.mockReturnValue({ user: { id: 'user1' } });
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders sign-in prompt when no user', () => {
  useUser.mockReturnValue({ user: null });
  render(<FavoritesPanel />);
  expect(screen.getByTestId('no-user')).toHaveTextContent(/please sign in/i);
});

test('renders favorites panel', async () => {
  apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
  apiClient.getTeams.mockResolvedValue({ data: [{ name: 'Team A' }, { name: 'Team B' }] });
  apiClient.getUserFavorites.mockResolvedValue({ data: ['Team A'] });

  render(<FavoritesPanel />);
  await waitFor(() => screen.getByTestId('favorites-panel'));

  expect(screen.getByTestId('favorites-panel')).toBeInTheDocument();
  expect(screen.getByTestId('favorites-list')).toBeInTheDocument();
  expect(screen.getByText('Team A')).toBeInTheDocument();
});

test('adds a valid favorite', async () => {
  apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
  apiClient.getTeams.mockResolvedValue({ data: [{ name: 'Team A' }, { name: 'Team B' }] });
  apiClient.getUserFavorites.mockResolvedValue({ data: [] });
  apiClient.addUserFavorite.mockResolvedValue({ success: true });

  render(<FavoritesPanel />);
  await waitFor(() => screen.getByTestId('add-favorite-section'));

  const input = screen.getByTestId('add-input');
  fireEvent.change(input, { target: { value: 'Team A' } });

  const button = screen.getByTestId('add-button');
  expect(button).not.toBeDisabled();

  fireEvent.click(button);
  await waitFor(() => expect(apiClient.addUserFavorite).toHaveBeenCalledWith('user1', 'Team A'));
});

test('removes a favorite', async () => {
  apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
  apiClient.getTeams.mockResolvedValue({ data: [{ name: 'Team A' }] });
  apiClient.getUserFavorites.mockResolvedValue({ data: ['Team A'] });
  apiClient.removeUserFavorite.mockResolvedValue({ success: true });

  render(<FavoritesPanel />);
  await waitFor(() => screen.getByText('Team A'));

  fireEvent.click(screen.getByLabelText(/Remove Team A/i));
  await waitFor(() => expect(apiClient.removeUserFavorite).toHaveBeenCalledWith('user1', 'Team A'));
});

test('clicking a match calls onMatchSelect', async () => {
  const mockSelect = jest.fn();
  apiClient.getMatchesByDate.mockResolvedValue({
    data: [{
      id: 'm1',
      homeTeam: { name: 'Team A' },
      awayTeam: { name: 'Team B' },
      utcDate: new Date().toISOString()
    }]
  });
  apiClient.getTeams.mockResolvedValue({ data: [{ name: 'Team A' }, { name: 'Team B' }] });
  apiClient.getUserFavorites.mockResolvedValue({ data: ['Team A'] });

  render(<FavoritesPanel onMatchSelect={mockSelect} />);
  await waitFor(() => screen.getByTestId('favorite-item'));

  fireEvent.click(screen.getByText(/Team A vs Team B/i));
  expect(mockSelect).toHaveBeenCalled();
});
