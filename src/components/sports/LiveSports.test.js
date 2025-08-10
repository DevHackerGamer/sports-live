import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LiveSports from './LiveSports';

jest.mock('../../hooks/useLiveSports', () => ({
  useLiveSports: jest.fn(),
}));

import { useLiveSports } from '../../hooks/useLiveSports';

describe('LiveSports Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state when no sportsData', () => {
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: false,
      error: null,
      lastUpdated: null,
      refreshData: jest.fn(),
    });

    render(<LiveSports />);
    expect(screen.getByText(/Loading live matches/i)).toBeTruthy();
  });

  test('renders error state when error is present', () => {
    const mockRefresh = jest.fn();
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: false,
      error: 'Failed to fetch',
      lastUpdated: null,
      refreshData: mockRefresh,
    });

    render(<LiveSports />);
    expect(screen.getByText(/Connection Error/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/Retry/i));
    expect(mockRefresh).toHaveBeenCalled();
  });

  test('renders matches when sportsData.games has data', () => {
    const mockData = {
      games: [
        {
          id: '1',
          competition: 'Premier League',
          status: 'live',
          homeTeam: 'Team A',
          homeScore: 2,
          awayTeam: 'Team B',
          awayScore: 1,
          minute: 45,
          venue: 'Stadium X',
          utcDate: null,
        },
      ],
      source: 'API Source',
      totalMatches: 1,
    };

    useLiveSports.mockReturnValue({
      sportsData: mockData,
      isConnected: true,
      error: null,
      lastUpdated: new Date(),
      refreshData: jest.fn(),
    });

    render(<LiveSports />);
    expect(screen.getByText(/Premier League/i)).toBeTruthy();
    expect(screen.getByText(/Team A/i)).toBeTruthy();
    expect(screen.getByText(/Team B/i)).toBeTruthy();
    expect(screen.getByText(/LIVE/i)).toBeTruthy();
  });

  test('renders "No matches available" when games array is empty', () => {
    const mockRefresh = jest.fn();
    useLiveSports.mockReturnValue({
      sportsData: { games: [], source: 'API Source', totalMatches: 0 },
      isConnected: true,
      error: null,
      lastUpdated: null,
      refreshData: mockRefresh,
    });

    render(<LiveSports />);
    expect(screen.getByText(/No matches available/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/Refresh/i));
    expect(mockRefresh).toHaveBeenCalled();
  });
});
