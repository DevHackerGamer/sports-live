import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FavoritesPanel from '../favouritespanel/FavoritesPanel';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';
import { waitFor } from '@testing-library/react';

jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
}));

jest.mock('../../lib/api', () => ({
  apiClient: {
    getMatches: jest.fn(),
    getTeams: jest.fn(),
    getUserFavorites: jest.fn(),
    addUserFavorite: jest.fn(),
    removeUserFavorite: jest.fn(),
  },
}));

describe('FavoritesPanel Full Coverage', () => {
  const user = { id: 'user123' };

  beforeEach(() => {
    useUser.mockReturnValue({ user });

    // Default mocks
    apiClient.getMatches.mockResolvedValue({ data: [] });
    apiClient.getTeams.mockResolvedValue({ data: ['Team A', 'Team B'] });
    apiClient.getUserFavorites.mockResolvedValue({ data: [] });
    apiClient.addUserFavorite.mockResolvedValue({});
    apiClient.removeUserFavorite.mockResolvedValue({});

    // Reset fetch
    global.fetch = jest.fn((url) => {
      if (url.includes('endpoint=teams')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teams: ['Team A', 'Team B'] }),
        });
      }
      if (url.includes('range')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ games: [] }),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders no favorites initially', async () => {
    render(<FavoritesPanel />);
    expect(await screen.findByTestId('no-favorites')).toBeInTheDocument();
  });

  test('adds a favorite via input (Enter key)', async () => {
    render(<FavoritesPanel />);
    const input = await screen.findByTestId('add-input');

    fireEvent.change(input, { target: { value: 'Team A' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    const favItem = await screen.findByText('Team A');
    expect(apiClient.addUserFavorite).toHaveBeenCalledWith(user.id, 'Team A');
    expect(favItem).toBeInTheDocument();
  });

  test('adds a favorite via dropdown (onChange + Add button)', async () => {
    render(<FavoritesPanel />);
    const dropdown = await screen.findByTestId('add-dropdown');
    fireEvent.change(dropdown, { target: { value: 'Team B' } });

    const addButton = await screen.findByTestId('add-button');
    fireEvent.click(addButton);

    const favItem = await screen.findByText('Team B');
    expect(apiClient.addUserFavorite).toHaveBeenCalledWith(user.id, 'Team B');
    expect(favItem).toBeInTheDocument();
  });

  test('removes a favorite', async () => {
    apiClient.getUserFavorites.mockResolvedValueOnce({ data: ['Team A'] });
    render(<FavoritesPanel />);

    const removeBtn = await screen.findByTestId('remove-favorite');
    fireEvent.click(removeBtn);

    expect(apiClient.removeUserFavorite).toHaveBeenCalledWith(user.id, 'Team A');
    expect(await screen.findByTestId('no-favorites')).toBeInTheDocument();
  });

  test('displays upcoming matches for a favorite', async () => {
    const matches = [
      { id: '1', homeTeam: 'Team A', awayTeam: 'Team B', utcDate: '2025-09-01T12:00:00Z', status: 'scheduled' },
      { id: '2', homeTeam: 'Team C', awayTeam: 'Team A', utcDate: '2025-09-02T15:00:00Z', status: 'scheduled' },
    ];
    apiClient.getMatches.mockResolvedValueOnce({ data: matches });
    apiClient.getUserFavorites.mockResolvedValueOnce({ data: ['Team A'] });

    render(<FavoritesPanel />);
    const upcomingMatches = await screen.findAllByTestId('upcoming-match');

    expect(upcomingMatches).toHaveLength(2);
    expect(screen.getByText(/Team A vs Team B/)).toBeInTheDocument();
    expect(screen.getByText(/Team C vs Team A/)).toBeInTheDocument();
  });

//   test('handles fallback fetch for matches if Mongo API fails', async () => {
//     apiClient.getMatches.mockRejectedValueOnce(new Error('Mongo error'));

//     render(<FavoritesPanel />);

//         expect(global.fetch).toHaveBeenCalledWith('/api/sports-data?limit=200&range=30');
//         // Wait for loading to finish
//         expect(await screen.findByTestId('favorites-panel')).toBeInTheDocument();
//   });

//   test('handles fallback fetch for teams if Mongo API fails', async () => {
//         apiClient.getTeams.mockRejectedValueOnce(new Error('Mongo teams error'));

//         render(<FavoritesPanel />);
//         expect(global.fetch).toHaveBeenCalledWith('/api/sports-data?endpoint=teams');
//         expect(await screen.findByTestId('favorites-panel')).toBeInTheDocument();
//   });

  test('validateTeam throws error for unknown team', async () => {
        render(<FavoritesPanel />);
        const input = await screen.findByTestId('add-input');

        fireEvent.change(input, { target: { value: 'Unknown Team' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        const error = await screen.findByTestId('error');
        expect(error).toHaveTextContent('Team not found');
  });

  test('Add button triggers addFavorite correctly', async () => {
        render(<FavoritesPanel />);
        const input = await screen.findByTestId('add-input');
        const addButton = await screen.findByTestId('add-button');

        fireEvent.change(input, { target: { value: 'Team A' } });
        fireEvent.click(addButton);

        const favItem = await screen.findByText('Team A');
        expect(favItem).toBeInTheDocument();
    });

    test('Dropdown onChange triggers addFavorite correctly', async () => {
        render(<FavoritesPanel />);
        const dropdown = await screen.findByTestId('add-dropdown');

        fireEvent.change(dropdown, { target: { value: 'Team B' } });
        
        const addButton = await screen.findByTestId('add-button');
        fireEvent.click(addButton);

        const favItem = await screen.findByText('Team B');
        expect(favItem).toBeInTheDocument();
    });

    // test('displays error if API fails', async () => {
    //     apiClient.getMatches.mockRejectedValueOnce(new Error('Failed to fetch'));

    //     render(<FavoritesPanel />);

    //     await waitFor(() => {
    //         expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch');
    //     });
    // });
});
