import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MatchViewer from '../../components/MatchViewer/MatchViewer';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';

// Mock Clerk
jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
}));

// Mock API client
jest.mock('../../lib/api', () => ({
  apiClient: {
    getMatchById: jest.fn(),
    getMatchEvents: jest.fn(),
    getTeams: jest.fn(),
    addMatchEvent: jest.fn(),
    updateMatch: jest.fn(),
  },
}));

const mockMatch = {
  id: 'match1',
  homeTeam: 'Team A',
  awayTeam: 'Team B',
  homeScore: 2,
  awayScore: 1,
  status: 'live',
  minute: 34,
  utcDate: '2025-09-02T12:00:00Z',
  competition: 'Premier League',
  matchday: 5,
  referee: 'John Doe',
  venue: 'Stadium X',
};

const mockEvents = [
  { id: 'e1', type: 'goal', time: '12:23', team: 'Team A', player: 'Player 1', description: 'Scored a goal' },
  { id: 'e2', type: 'yellow_card', time: '25:00', team: 'Team B', player: 'Player 5', description: 'Yellow card' },
];

const mockTeams = [
  { id: 't1', name: 'Team A' },
  { id: 't2', name: 'Team B' },
];

describe('MatchViewer Component', () => {
  beforeEach(() => {
    useUser.mockReturnValue({ user: { id: 'user1', privateMetadata: { type: 'admin' } } });
    apiClient.getMatchById.mockResolvedValue({ data: mockMatch });
    apiClient.getMatchEvents.mockResolvedValue({ data: mockEvents });
    apiClient.getTeams.mockResolvedValue({ data: mockTeams });
    apiClient.addMatchEvent.mockResolvedValue({ data: {} });
    apiClient.updateMatch.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders match details correctly', async () => {
    render(<MatchViewer match={mockMatch} />);

    // Wait for API data to load
    await waitFor(() => screen.getByText('Team A'));

    expect(screen.getByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/Premier League/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/Stadium X/i)).toBeInTheDocument();
  });

  test('renders event timeline correctly', async () => {
    render(<MatchViewer match={mockMatch} initialSection="events" />);

    await waitFor(() => screen.getByText(/Scored a goal/i));

    expect(screen.getByText(/Scored a goal/i)).toBeInTheDocument();
    expect(screen.getByText(/Yellow card/i)).toBeInTheDocument();
    expect(screen.getByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
  });

  test('allows submitting event as admin', async () => {
    render(<MatchViewer match={mockMatch} initialSection="update" />);

    // Wait for teams dropdown
    await waitFor(() => screen.getByText(/Home - Team A/i));

    fireEvent.change(screen.getByPlaceholderText(/Time/i), { target: { value: '45:00' } });
    fireEvent.change(screen.getByDisplayValue('goal'), { target: { value: 'yellow_card' } });
    fireEvent.change(screen.getByDisplayValue(/Home - Team A/i), { target: { value: 'Team A' } });

    // Select player from home team
    await waitFor(() => screen.getByText('Player 1'));
    fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'Player 1' } });

    fireEvent.change(screen.getByPlaceholderText(/Event description/i), { target: { value: 'Test yellow card' } });

    fireEvent.click(screen.getByText('Add Event'));

    await waitFor(() => expect(apiClient.addMatchEvent).toHaveBeenCalled());
  });

  test('allows updating match meta as admin', async () => {
    render(<MatchViewer match={mockMatch} initialSection="update" />);

    fireEvent.change(screen.getByPlaceholderText('Referee'), { target: { value: 'New Referee' } });
    fireEvent.change(screen.getByPlaceholderText('Venue'), { target: { value: 'New Stadium' } });

    fireEvent.click(screen.getByText('Save Match Info'));

    await waitFor(() => expect(apiClient.updateMatch).toHaveBeenCalledWith(
      'match1',
      { referee: 'New Referee', venue: 'New Stadium' },
      { userType: 'admin' }
    ));
  });

  test('displays fallback message when no match is selected', () => {
    render(<MatchViewer match={null} />);

    expect(screen.getByText(/Select a match from the Live Sports tab/i)).toBeInTheDocument();
  });

  test('displays error message when API fails', async () => {
    apiClient.getMatchById.mockRejectedValueOnce(new Error('API error'));
    render(<MatchViewer match={mockMatch} />);

    await waitFor(() => screen.getByText(/API error/i));
    expect(screen.getByText(/Retry/i)).toBeInTheDocument();
  });
});
