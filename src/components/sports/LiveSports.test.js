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
  // There are multiple 'LIVE' strings on the page; ensure we assert the badge in match header
  const liveBadges = screen.getAllByText(/^LIVE$/i);
  expect(liveBadges.length).toBeGreaterThan(0);
  });

  test('shows formatted scheduled time when status is scheduled', () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    useLiveSports.mockReturnValue({
      sportsData: {
        games: [
          {
            id: 'sch-1',
            competition: 'La Liga',
            status: 'scheduled',
            homeTeam: 'Team C',
            homeScore: 0,
            awayTeam: 'Team D',
            awayScore: 0,
            utcDate: futureDate,
          },
        ],
        source: 'API Source',
        totalMatches: 1,
      },
      isConnected: true,
      error: null,
      lastUpdated: new Date(),
      refreshData: jest.fn(),
    });

  render(<LiveSports />);
  expect(screen.getByText(/La Liga/i)).toBeTruthy();
  // Assert the specific scheduled time element
  const el = document.querySelector('.scheduled-time');
  expect(el).toBeTruthy();
  expect(el.textContent).toMatch(/at/i);
  });

  test('shows FINAL badge and offline indicator when disconnected', () => {
    useLiveSports.mockReturnValue({
      sportsData: {
        games: [
          {
            id: 'fin-1',
            competition: 'Cup',
            status: 'final',
            homeTeam: 'Team E',
            homeScore: 3,
            awayTeam: 'Team F',
            awayScore: 2,
          },
        ],
        source: 'API',
        totalMatches: 1,
      },
      isConnected: false,
      error: null,
      lastUpdated: null, // cover no lastUpdated branch
      refreshData: jest.fn(),
    });

    render(<LiveSports />);
    expect(screen.getByText(/Cup/i)).toBeTruthy();
    expect(screen.getByText(/FINAL/i)).toBeTruthy();
    expect(screen.getByText(/Offline/i)).toBeTruthy();
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
  // Disambiguate 'Refresh' vs 'Refresh Data' by clicking the first 'Refresh' inside the no-matches section
  const refreshButtons = screen.getAllByText(/^Refresh$/i);
  fireEvent.click(refreshButtons[0]);
    expect(mockRefresh).toHaveBeenCalled();
  });
});
