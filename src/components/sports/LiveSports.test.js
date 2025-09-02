import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LiveSports from './LiveSports';
import { useLiveSports } from '../../hooks/useLiveSports';

// Mock the hook
jest.mock('../../hooks/useLiveSports');

const mockGames = [
  {
    id: '1',
    competition: 'Premier League',
    competitionCode: 'EPL',
    homeTeam: { name: 'Team A', crest: 'home.png' },
    awayTeam: { name: 'Team B', crest: 'away.png' },
    homeScore: 1,
    awayScore: 2,
    status: 'live',
    utcDate: new Date().toISOString(),
    minute: 55,
    matchday: 1,
    venue: 'Stadium 1',
  },
];

describe('LiveSports Component', () => {
  const refreshMock = jest.fn();
  const onSelectMock = jest.fn();

  beforeEach(() => {
    useLiveSports.mockReturnValue({
      sportsData: { games: mockGames, totalMatches: 1, source: 'API' },
      isConnected: true,
      error: null,
      lastUpdated: new Date(),
      refreshData: refreshMock,
    });
  });

  it('renders without crashing and shows match', () => {
    render(<LiveSports onMatchSelect={onSelectMock} />);
    expect(screen.getByText(/Live Football/i)).toBeInTheDocument();
    expect(screen.getByText(/Premier League/i)).toBeInTheDocument();
    expect(screen.getByText(/Team A/i)).toBeInTheDocument();
  });

  it('calls onMatchSelect when match card clicked', () => {
    render(<LiveSports onMatchSelect={onSelectMock} />);
    fireEvent.click(screen.getByTestId('match-1'));
    expect(onSelectMock).toHaveBeenCalledWith(mockGames[0]);
  });

  it('calls refreshData on footer button click', () => {
    render(<LiveSports onMatchSelect={onSelectMock} />);
    fireEvent.click(screen.getByText(/Refresh Data/i));
    expect(refreshMock).toHaveBeenCalled();
  });
});
