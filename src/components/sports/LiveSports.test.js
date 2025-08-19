// src/components/sports/LiveSports.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import LiveSports from './LiveSports';
import { onValue } from '../../lib/firebase';

// Mock Firebase imports
jest.mock('../../lib/firebase', () => ({
  db: {},
  ref: jest.fn(),
  onValue: jest.fn(),
}));

describe('LiveSports component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', () => {
    // Return an unsubscribe function to prevent errors
    onValue.mockImplementation(() => jest.fn());
    render(<LiveSports />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  test('shows error state if Firebase callback fails', () => {
    onValue.mockImplementation((_ref, _callback, errorCallback) => {
      errorCallback(new Error('Failed to fetch'));
      return jest.fn();
    });

    render(<LiveSports />);
    expect(screen.getByTestId('error')).toHaveTextContent('Failed to load matches');
  });

  test('shows empty state if no matches', () => {
    onValue.mockImplementation((_ref, callback) => {
      callback({ val: () => ({}) });
      return jest.fn();
    });

    render(<LiveSports />);
    expect(screen.getByTestId('empty')).toHaveTextContent('No matches available');
  });

  test('renders matches when data is present', () => {
    const mockData = {
      1: {
        id: 1,
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        homeScore: 2,
        awayScore: 1,
        status: 'live',
        competition: 'Premier League',
        venue: 'Stadium A',
        utcDate: '2025-08-18T15:00:00Z',
      },
      2: {
        id: 2,
        homeTeam: 'Team C',
        awayTeam: 'Team D',
        homeScore: 'TBA',
        awayScore: 'TBA',
        status: 'scheduled',
        competition: 'Premier League',
        venue: 'TBD',
        utcDate: 'TBA',
      },
    };

    onValue.mockImplementation((_ref, callback) => {
      callback({ val: () => mockData });
      return jest.fn();
    });

    render(<LiveSports />);

    // Container
    expect(screen.getByTestId('matches-container')).toBeInTheDocument();

    // League
    expect(screen.getByTestId('league-Premier League')).toBeInTheDocument();

    // Match cards
    expect(screen.getByTestId('match-1')).toHaveTextContent('Team A');
    expect(screen.getByTestId('match-1')).toHaveTextContent('Team B');
    expect(screen.getByTestId('match-2')).toHaveTextContent('Team C');
    expect(screen.getByTestId('match-2')).toHaveTextContent('Team D');

    // Status badges
    expect(screen.getByTestId('status-live')).toHaveTextContent('LIVE');
    expect(screen.getByTestId('status-scheduled')).toHaveTextContent('SCHEDULED');
  });
});
