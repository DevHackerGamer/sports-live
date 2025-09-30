// src/components/__tests__/LiveSports.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LiveSports from '../LiveSports/LiveSports';
import { useLiveSports } from '../../hooks/useLiveSports';

jest.mock('../../hooks/useLiveSports');

const mockMatches = [
  {
    id: '1',
    homeTeam: { name: 'FC Barcelona', crest: '' },
    awayTeam: { name: 'Real Madrid', crest: '' },
    homeScore: 1,
    awayScore: 0,
    status: 'live',
    utcDate: new Date().toISOString(),
    competition: 'La Liga',
  },
  {
    id: '2',
    homeTeam: { name: 'Manchester United', crest: '' },
    awayTeam: { name: 'Chelsea', crest: '' },
    homeScore: 2,
    awayScore: 2,
    status: 'scheduled',
    utcDate: new Date().toISOString(),
    competition: 'Premier League',
  },
];

describe('LiveSports Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state', () => {
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: false,
      error: null,
      lastUpdated: null,
      refreshData: jest.fn(),
    });

    render(<LiveSports onMatchSelect={jest.fn()} />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByText(/loading live matches/i)).toBeInTheDocument();
  });

  test('renders error state', () => {
    const refreshMock = jest.fn();
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: false,
      error: true,
      lastUpdated: null,
      refreshData: refreshMock,
    });

    render(<LiveSports onMatchSelect={jest.fn()} />);
    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(screen.getByText(/connection error/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/retry/i));
    expect(refreshMock).toHaveBeenCalled();
  });

  test('renders matches', () => {
    useLiveSports.mockReturnValue({
      sportsData: { games: mockMatches, totalMatches: 2 },
      isConnected: true,
      error: null,
      lastUpdated: new Date(),
      refreshData: jest.fn(),
    });

    const selectMock = jest.fn();
    render(<LiveSports onMatchSelect={selectMock} />);

    // Matches container exists
    expect(screen.getByTestId('matches-container')).toBeInTheDocument();

    // Match cards rendered
    expect(screen.getByTestId('match-1')).toBeInTheDocument();
    expect(screen.getByTestId('match-2')).toBeInTheDocument();

    // Click on a match triggers callback
    fireEvent.click(screen.getByTestId('match-1'));
    expect(selectMock).toHaveBeenCalledWith(mockMatches[0]);
  });

  test('handles team click to show TeamInfo', () => {
    useLiveSports.mockReturnValue({
      sportsData: { games: mockMatches },
      isConnected: true,
      error: null,
      lastUpdated: new Date(),
      refreshData: jest.fn(),
    });

    render(<LiveSports onMatchSelect={jest.fn()} />);
    
    // Click on home team name
    fireEvent.click(screen.getByText(/FC Barcelona/i));

    // Expect TeamInfo to render (simple check by looking for back button)
    expect(screen.getByText(/back/i)).toBeInTheDocument();
  });

  test('refresh button calls refreshData', () => {
    const refreshMock = jest.fn();
    useLiveSports.mockReturnValue({
      sportsData: { games: mockMatches },
      isConnected: true,
      error: null,
      lastUpdated: new Date(),
      refreshData: refreshMock,
    });

    render(<LiveSports onMatchSelect={jest.fn()} />);
    fireEvent.click(screen.getAllByText(/refresh data/i)[0]);
    expect(refreshMock).toHaveBeenCalled();
  });
});
