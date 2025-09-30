import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeagueView from '../LeagueView/LeagueView';
import { apiClient } from '../../lib/api';

jest.mock('../../lib/api', () => ({
  apiClient: {
    getMatchesByDate: jest.fn(),
    request: jest.fn(),
    getTeams: jest.fn(),
  },
}));

describe('LeagueView Component', () => {
  const mockStandings = [
    {
      _id: 'PL-2025',
      standings: [
        {
          type: 'TOTAL',
          table: [
            {
              position: 1,
              team: { id: 't1', name: 'Team One', crest: '/crest.png' },
              playedGames: 0,
              won: 0,
              draw: 0,
              lost: 0,
              goalDifference: 0,
              points: 0,
            },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock API clients
    apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
    apiClient.request.mockResolvedValue({ success: true, players: [] });
    apiClient.getTeams.mockResolvedValue({ data: [] });

    // Mock fetch for standings
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ data: mockStandings }),
    });
  });

  it('renders header, league selector, and tabs', () => {
    render(<LeagueView />);

    expect(screen.getByRole('heading', { name: /Premier League/i })).toBeInTheDocument();

    // select exists (without label)
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    expect(screen.getByText('Standings')).toBeInTheDocument();
    expect(screen.getByText('Matches')).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
  });

  it('renders matches tab content', async () => {
    apiClient.getMatchesByDate.mockResolvedValue({
      data: [
        {
          id: 1,
          utcDate: new Date().toISOString(),
          competition: { code: 'PL', name: 'Premier League' },
          homeTeam: { name: 'Team A' },
          awayTeam: { name: 'Team B' },
        },
      ],
    });

    render(<LeagueView />);

    fireEvent.click(screen.getByText('Matches'));

    await waitFor(() => expect(screen.getByText('Team A')).toBeInTheDocument());
    expect(screen.getByText('Team B')).toBeInTheDocument();
  });

  it('renders players tab content', async () => {
    apiClient.request.mockResolvedValue({
      success: true,
      players: [
        {
          id: 'p1',
          name: 'Player One',
          position: 'Forward',
          nationality: 'Country',
          dateOfBirth: '2000-01-01',
          teamId: 't1', // matches the standings team
        },
      ],
    });

    apiClient.getTeams.mockResolvedValue({
      data: [{ id: 't1', name: 'Team One', crest: '/crest.png' }],
    });

    render(<LeagueView />);

    fireEvent.click(screen.getByText('Players'));

    await waitFor(() => expect(screen.getByText(/Player One/i)).toBeInTheDocument());
    expect(screen.getByText(/Team One/i)).toBeInTheDocument();
    expect(screen.getByText(/Forward/i)).toBeInTheDocument();
    expect(screen.getByText(/Country/i)).toBeInTheDocument();
  });
});
