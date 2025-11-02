import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LeagueView from '../LeagueView/LeagueView';
import { apiClient } from '../../lib/api';

// Mock apiClient
jest.mock('../../lib/api', () => ({
  apiClient: {
    request: jest.fn(),
  },
}));

// Mock fetch globally for standings API
global.fetch = jest.fn();

describe('LeagueView Component', () => {
  const mockStandings = [
    {
      position: 1,
      team: { id: '1', name: 'Team A', crest: '/crestA.png' },
      playedGames: 10, won: 7, draw: 2, lost: 1, goalDifference: 15, points: 23,
    },
    {
      position: 2,
      team: { id: '2', name: 'Team B', crest: '/crestB.png' },
      playedGames: 10, won: 6, draw: 3, lost: 1, goalDifference: 10, points: 21,
    },
  ];

  const mockMatches = [
    {
      id: 'm1',
      utcDate: '2025-10-28T14:00:00Z',
      homeTeam: { name: 'Team A', crest: '/crestA.png' },
      awayTeam: { name: 'Team B', crest: '/crestB.png' },
      competition: 'Premier League',
    },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading standings initially', async () => {
    fetch.mockImplementation(() => new Promise(() => {}));
    render(<LeagueView />);
    expect(screen.getByText(/loading standings/i)).toBeInTheDocument();
  });

  test('renders standings table after API returns data', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        data: [{ _id: 'PL-2025', standings: [{ type: 'TOTAL', table: mockStandings }] }],
      }),
    });

    render(<LeagueView />);
    await waitFor(() => expect(screen.getByText('Team A')).toBeInTheDocument());
    expect(screen.getByText('Team B')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(mockStandings.length + 1);
  });

  test('handles standings API error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));
    render(<LeagueView />);
    await waitFor(() => expect(screen.getByText(/failed to load data/i)).toBeInTheDocument());
  });

  test('switches to Matches tab and loads matches', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        data: [{ _id: 'PL-2025', standings: [{ type: 'TOTAL', table: mockStandings }] }],
      }),
    });
    apiClient.request.mockResolvedValueOnce({ data: mockMatches });

    render(<LeagueView />);

    const matchesTab = screen.getByText('Matches');
    fireEvent.click(matchesTab);

    await waitFor(() => expect(screen.getByText(/loading upcoming matches/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Team A')).toBeInTheDocument());
    expect(screen.getByText(/Premier League/i)).toBeInTheDocument();
  });

  test('calls onBack and onTeamSelect callbacks', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        data: [{ _id: 'PL-2025', standings: [{ type: 'TOTAL', table: mockStandings }] }],
      }),
    });

    const onBackMock = jest.fn();
    const onTeamSelectMock = jest.fn();

    render(<LeagueView onBack={onBackMock} onTeamSelect={onTeamSelectMock} />);

    // Back button
    fireEvent.click(screen.getByText(/home/i));
    expect(onBackMock).toHaveBeenCalled();

    // Wait for data to render
    await waitFor(() => screen.getByText('Team A'));
    fireEvent.click(screen.getByText('Team A'));
    expect(onTeamSelectMock).toHaveBeenCalledWith(expect.objectContaining({ id: '1', name: 'Team A' }));
  });
});
