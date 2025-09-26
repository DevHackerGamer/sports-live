// src/_tests_/LeagueView.test.js
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LeagueView from '../LeagueView/LeagueView';
import { apiClient } from '../../lib/api';

// Mock apiClient functions
jest.mock('../../lib/api', () => ({
  apiClient: {
    request: jest.fn(),
    getMatchesByDate: jest.fn(),
    getTeams: jest.fn(),
  },
}));

// Mock fetch globally for standings API
global.fetch = jest.fn();

describe('LeagueView Component', () => {
  const mockTeams = [
    { id: '1', name: 'Team A', crest: '/crestA.png' },
    { id: '2', name: 'Team B', crest: '/crestB.png' },
  ];

  const mockPlayers = [
    { _id: 'p1', name: 'Player 1', teamId: '1', position: 'Forward', nationality: 'SA', dateOfBirth: '2000-01-01' },
    { _id: 'p2', name: 'Player 2', teamId: '2', position: 'Midfielder', nationality: 'BR', dateOfBirth: '1998-06-15' },
  ];

  const mockStandings = [
    { position: 1, team: { id: '1', name: 'Team A', crest: '/crestA.png' }, playedGames: 10, won: 7, draw: 2, lost: 1, goalDifference: 15, points: 23 },
    { position: 2, team: { id: '2', name: 'Team B', crest: '/crestB.png' }, playedGames: 10, won: 6, draw: 3, lost: 1, goalDifference: 10, points: 21 },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders header, league selector, and tabs', () => {
    render(<LeagueView />);
    expect(screen.getByText(/Premier League/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select League/i)).toBeInTheDocument();
    expect(screen.getByText('Standings')).toBeInTheDocument();
    expect(screen.getByText('Matches')).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
  });

  test('renders loading standings initially', async () => {
    fetch.mockImplementation(() => new Promise(() => {}));
    render(<LeagueView />);
    expect(screen.getByText(/loading standings/i)).toBeInTheDocument();
  });

  test('renders standings table after API returns data', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({ data: [{ _id: 'PL-2025', standings: [{ type: 'TOTAL', table: mockStandings }] }] }),
    });
    apiClient.getTeams.mockResolvedValueOnce({ data: mockTeams });
    apiClient.request.mockResolvedValueOnce({ success: true, players: mockPlayers });

    render(<LeagueView />);
    await waitFor(() => expect(screen.getByText('Team A')).toBeInTheDocument());
    expect(screen.getByText('Team B')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(mockStandings.length + 1); // including header
  });

  test('handles standings API error', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));
    render(<LeagueView />);
    await waitFor(() => expect(screen.getByText(/failed to load data/i)).toBeInTheDocument());
  });

  test('renders matches tab content', async () => {
    apiClient.getMatchesByDate.mockResolvedValueOnce({
      data: [
        {
          id: 'm1',
          homeTeam: { name: 'Team A', crest: '/crestA.png' },
          awayTeam: { name: 'Team B', crest: '/crestB.png' },
          competition: 'PL',
          utcDate: new Date().toISOString(),
        },
      ],
    });

    render(<LeagueView />);
    const matchesTab = screen.getByText('Matches');
    fireEvent.click(matchesTab);

    await waitFor(() => expect(screen.getByText(/Team A/i)).toBeInTheDocument());
    expect(screen.getByText(/Team B/i)).toBeInTheDocument();
  });

  test('renders players tab content', async () => {
    apiClient.request.mockResolvedValueOnce({ success: true, players: mockPlayers });
    apiClient.getTeams.mockResolvedValueOnce({ data: mockTeams });
    fetch.mockResolvedValueOnce({ json: async () => ({ data: [{ _id: 'PL-2025', standings: [{ type: 'TOTAL', table: mockStandings }] }] }) });

    render(<LeagueView />);
    const playersTab = screen.getByText('Players');
    fireEvent.click(playersTab);

    await waitFor(() => expect(screen.getByText('Player 1')).toBeInTheDocument());
    expect(screen.getByText('Player 2')).toBeInTheDocument();
  });

  test('calls onBack and onTeamSelect callbacks', async () => {
    apiClient.request.mockResolvedValueOnce({ success: true, players: mockPlayers });
    apiClient.getTeams.mockResolvedValueOnce({ data: mockTeams });
    fetch.mockResolvedValueOnce({ json: async () => ({ data: [{ _id: 'PL-2025', standings: [{ type: 'TOTAL', table: mockStandings }] }] }) });

    const onBackMock = jest.fn();
    const onTeamSelectMock = jest.fn();

    render(<LeagueView onBack={onBackMock} onTeamSelect={onTeamSelectMock} />);

    // Back button
    fireEvent.click(screen.getByText(/home/i));
    expect(onBackMock).toHaveBeenCalled();

    // Team click
    await waitFor(() => {
      fireEvent.click(screen.getByText('Team A'));
      expect(onTeamSelectMock).toHaveBeenCalled();
    });
  });
});