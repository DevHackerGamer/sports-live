// src/components/favouritespanel/__tests__/FavoritesPanel.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FavoritesPanel from '../FavoritesPanel';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../../lib/api';

// --- Mock Clerk useUser ---
jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
}));

// --- Mock apiClient ---
jest.mock('../../../lib/api', () => ({
  apiClient: {
    getUserFavorites: jest.fn(),
    addUserFavorite: jest.fn(),
    removeUserFavorite: jest.fn(),
    getMatchesByDate: jest.fn(),
    getTeams: jest.fn(),
  },
}));

describe('FavoritesPanel', () => {
  const mockUser = { id: 'user123' };

  beforeEach(() => {
    useUser.mockReturnValue({ user: mockUser });
    apiClient.getUserFavorites.mockResolvedValue({ data: ['Team A'] });
    apiClient.getTeams.mockResolvedValue({ data: [{ name: 'Team A' }, { name: 'Team B' }] });
    apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
    apiClient.addUserFavorite.mockResolvedValue({});
    apiClient.removeUserFavorite.mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading message when user is not ready', () => {
    useUser.mockReturnValue({ user: null });
    render(<FavoritesPanel />);
    expect(screen.getByTestId('loading-user')).toBeInTheDocument();
  });

  test('displays favorites after loading', async () => {
    render(<FavoritesPanel />);
    expect(await screen.findByTestId('favorite-item')).toHaveTextContent('Team A');
  });

  test('can remove a favorite team', async () => {
    render(<FavoritesPanel />);
    const removeButton = await screen.findByTestId('remove-favorite');
    fireEvent.click(removeButton);
    await waitFor(() => {
      expect(apiClient.removeUserFavorite).toHaveBeenCalledWith(mockUser.id, 'Team A');
    });
  });

  test('can add a new favorite via input and Enter key', async () => {
    render(<FavoritesPanel />);
    const input = screen.getByTestId('add-input');
    fireEvent.change(input, { target: { value: 'Team B' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(apiClient.addUserFavorite).toHaveBeenCalledWith(mockUser.id, 'Team B');
    });
  });

  test('can add a new favorite via dropdown', async () => {
    render(<FavoritesPanel />);
    const dropdown = screen.getByTestId('add-dropdown');
    fireEvent.change(dropdown, { target: { value: 'Team B' } });
    await waitFor(() => {
      expect(apiClient.addUserFavorite).toHaveBeenCalledWith(mockUser.id, 'Team B');
    });
  });

  test('shows error if api call fails', async () => {
    apiClient.getUserFavorites.mockRejectedValueOnce(new Error('Failed to fetch'));
    render(<FavoritesPanel />);
    expect(await screen.findByTestId('error')).toHaveTextContent('Failed to fetch');
  });
});
