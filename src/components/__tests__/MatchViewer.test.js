// src/components/__tests__/MatchViewer.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchViewer from '../matchViewer/MatchViewer';

// Mock Clerk
jest.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'user123', privateMetadata: { type: 'admin' } } })
}));

// Mock API client with mockMatch inside the factory
jest.mock('../../lib/api', () => {
  const mockMatch = {
    id: 'match1',
    homeTeam: 'Team A',
    awayTeam: 'Team B',
    homeScore: 1,
    awayScore: 2,
    status: 'live',
    minute: 45,
    utcDate: '2025-09-01T18:00:00Z',
    competition: 'Premier League',
    referee: 'Ref A',
    venue: 'Stadium A',
    events: [
      { id: 'evt1', type: 'goal', time: '12', player: 'Player1', team: 'Team A', description: 'Scored goal' }
    ]
  };

  return {
    apiClient: {
      getMatchById: jest.fn().mockResolvedValue({ data: mockMatch }),
      getMatchEvents: jest.fn().mockResolvedValue({ data: mockMatch.events }),
      getTeams: jest.fn().mockResolvedValue([
        { name: 'Team A', id: 'teamA' },
        { name: 'Team B', id: 'teamB' }
      ]),
      addMatchEvent: jest.fn().mockResolvedValue({}),
      updateMatch: jest.fn().mockResolvedValue({})
    }
  };
});

describe('MatchViewer Component with data-testid', () => {

  test('renders no match selected view', () => {
    render(<MatchViewer match={null} />);
    expect(screen.getByTestId('no-match')).toBeInTheDocument();
  });

  test('renders match details and events', async () => {
    render(<MatchViewer match={{ id: 'match1', homeTeam: 'Team A', awayTeam: 'Team B' }} />);

    expect(await screen.findByTestId('match-overview')).toBeInTheDocument();
    expect(screen.getByTestId('home-team-name')).toHaveTextContent('Team A');
    expect(screen.getByTestId('away-team-name')).toHaveTextContent('Team B');
    expect(screen.getByTestId('home-team-score')).toHaveTextContent('1');
    expect(screen.getByTestId('away-team-score')).toHaveTextContent('2');

    fireEvent.click(screen.getByTestId('section-events'));
    expect(await screen.findByTestId('event-evt1-description')).toHaveTextContent('Scored goal');
    expect(screen.getByTestId('event-evt1-player')).toHaveTextContent('Player1');
  });

  test('admin update section visible and can submit event', async () => {
    render(<MatchViewer match={{ id: 'match1', homeTeam: 'Team A', awayTeam: 'Team B' }} initialSection="update" />);

    expect(await screen.findByTestId('update-section')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('new-event-time'), { target: { value: '50' } });
    fireEvent.change(screen.getByTestId('new-event-type'), { target: { value: 'yellow_card' } });
    fireEvent.change(screen.getByTestId('new-event-team'), { target: { value: 'Team A' } });
    fireEvent.change(screen.getByTestId('new-event-player'), { target: { value: 'Player1' } });
    fireEvent.change(screen.getByTestId('new-event-description'), { target: { value: 'Yellow card event' } });

    fireEvent.click(screen.getByTestId('add-event-button'));
    expect(await screen.findByTestId('update-section')).toBeInTheDocument();
  });

  test('can submit comment', async () => {
    render(<MatchViewer match={{ id: 'match1', homeTeam: 'Team A', awayTeam: 'Team B' }} />);

    fireEvent.click(screen.getByTestId('section-events'));

    const textarea = screen.getByTestId('comment-textarea');
    fireEvent.change(textarea, { target: { value: 'Incorrect score' } });

    window.alert = jest.fn();

    fireEvent.click(screen.getByTestId('submit-comment'));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Thank you for your report'));
  });

  test('handles API error gracefully', async () => {
    const { apiClient } = require('../../lib/api');
    apiClient.getMatchById.mockRejectedValueOnce(new Error('API error'));

    render(<MatchViewer match={{ id: 'match1', homeTeam: 'Team A', awayTeam: 'Team B' }} />);

    expect(await screen.findByTestId('error-message')).toHaveTextContent('API error');
    fireEvent.click(screen.getByTestId('retry-button'));
    expect(apiClient.getMatchById).toHaveBeenCalled();
  });

});
