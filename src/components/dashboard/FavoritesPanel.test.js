import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import FavoritesPanel from './FavoritesPanel';
import { useUser } from '@clerk/clerk-react';
import { db } from '../../lib/firebase';
import { ref, get, set } from 'firebase/database';

jest.mock('@clerk/clerk-react');
jest.mock('../../lib/firebase', () => ({
  db: {},
}));
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
}));

describe('FavoritesPanel', () => {
  const mockUser = { id: 'user123' };
  const mockTeams = [
    { id: 1, name: 'Liverpool FC' },
    { id: 2, name: 'Arsenal FC' },
  ];
  const mockMatches = [
    {
      id: 'm1',
      homeTeam: 'Liverpool FC',
      awayTeam: 'Arsenal FC',
      utcDate: '2025-08-17T17:30:00Z',
      status: 'SCHEDULED',
    },
    {
      id: 'm2',
      homeTeam: 'Arsenal FC',
      awayTeam: 'Leeds United FC',
      utcDate: '2025-08-23T18:30:00Z',
      status: 'SCHEDULED',
    },
  ];

  beforeEach(() => {
    useUser.mockReturnValue({ user: mockUser });
    global.fetch = jest.fn((url) => {
      if (url.includes('endpoint=teams')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teams: mockTeams }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ games: mockMatches }),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('displays "No favorite teams chosen" if no favorites', async () => {
    get.mockResolvedValueOnce({ exists: () => false });
    render(<FavoritesPanel />);
    expect(await screen.findByTestId('no-favorites')).toBeInTheDocument();
  });

  it('can add a favorite via input', async () => {
    get.mockResolvedValueOnce({ exists: () => false });
    set.mockResolvedValueOnce();
    render(<FavoritesPanel />);

    const input = screen.getByTestId('add-input');
    fireEvent.change(input, { target: { value: 'Liverpool FC' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      const favoriteItem = screen.getByTestId('favorite-item');
      expect(within(favoriteItem).getByTestId('favorite-name')).toHaveTextContent('Liverpool FC');
    });

    expect(set).toHaveBeenCalledWith(expect.anything(), expect.arrayContaining(['Liverpool FC']));
  });

  it('can add a favorite via dropdown', async () => {
    get.mockResolvedValueOnce({ exists: () => false });
    set.mockResolvedValueOnce();
    render(<FavoritesPanel />);

    const dropdown = screen.getByTestId('add-dropdown');
    fireEvent.change(dropdown, { target: { value: 'Arsenal FC' } });

    await waitFor(() => {
      const favoriteItem = screen.getByTestId('favorite-item');
      expect(within(favoriteItem).getByTestId('favorite-name')).toHaveTextContent('Arsenal FC');
    });

    expect(set).toHaveBeenCalledWith(expect.anything(), expect.arrayContaining(['Arsenal FC']));
  });

  it('can remove a favorite', async () => {
    get.mockResolvedValueOnce({ exists: () => true, val: () => ['Liverpool FC'] });
    set.mockResolvedValueOnce();
    render(<FavoritesPanel />);

    const removeButton = await screen.findByTestId('remove-favorite');
    fireEvent.click(removeButton);

    expect(await screen.findByTestId('no-favorites')).toBeInTheDocument();
    expect(set).toHaveBeenCalled();
  });

  it('displays upcoming matches for a favorite', async () => {
    get.mockResolvedValueOnce({ exists: () => true, val: () => ['Liverpool FC'] });
    render(<FavoritesPanel />);

    const favoriteName = await screen.findByTestId('favorite-name');
    expect(favoriteName).toHaveTextContent('Liverpool FC');

    const upcomingList = await screen.findByTestId('upcoming-list');
    const upcomingMatches = within(upcomingList).getAllByTestId('upcoming-match');
    expect(upcomingMatches.some(li => li.textContent.includes('Liverpool FC vs Arsenal FC'))).toBe(true);
  });

  it('sorts upcoming matches by date', async () => {
    get.mockResolvedValueOnce({ exists: () => true, val: () => ['Arsenal FC'] });
    render(<FavoritesPanel />);

    const upcomingList = await screen.findByTestId('upcoming-list');
    const matchItems = within(upcomingList).getAllByTestId('upcoming-match');

    expect(matchItems.length).toBe(2);
    expect(matchItems[0].textContent).toMatch(/17 Aug 2025/);
    expect(matchItems[1].textContent).toMatch(/23 Aug 2025/);
  });
});
