// src/__tests__/PlayersPage.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayersPage from '../PlayersPage/PlayersPage';
import { apiClient } from '../../lib/api';

// Mock apiClient
jest.mock('../../lib/api', () => ({
  apiClient: {
    request: jest.fn(),
    getTeams: jest.fn(),
  },
}));

describe('PlayersPage Component', () => {
  const mockPlayers = [
    {
      _id: 'p1',
      name: 'John Doe',
      teamId: 't1',
      position: 'Forward',
      nationality: 'South Africa',
      dateOfBirth: '2000-01-01',
    },
    {
      _id: 'p2',
      name: 'Jane Smith',
      teamId: 't2',
      position: 'Midfielder',
      nationality: 'England',
      dateOfBirth: '1998-06-15',
    },
  ];

  const mockTeams = [
    { id: 't1', name: 'Team A', crest: '/crestA.png' },
    { id: 't2', name: 'Team B', crest: '/crestB.png' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.request.mockResolvedValue({ success: true, players: mockPlayers });
    apiClient.getTeams.mockResolvedValue({ data: mockTeams });
  });

  test('renders loading state initially', async () => {
    apiClient.request.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<PlayersPage />);
    expect(screen.getByText(/loading players/i)).toBeInTheDocument();
  });

  test('renders player cards after loading', async () => {
    render(<PlayersPage />);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Team:/i)).toHaveLength(2);
  });

  test('filters players by player name', async () => {
    render(<PlayersPage />);
    await waitFor(() => screen.getByText('John Doe'));

    fireEvent.change(screen.getByPlaceholderText(/Player Name/i), { target: { value: 'Jane' } });
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('filters players by team name', async () => {
    render(<PlayersPage />);
    await waitFor(() => screen.getByText('John Doe'));

    fireEvent.change(screen.getByPlaceholderText(/Team Name/i), { target: { value: 'Team B' } });
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('filters players by position', async () => {
    render(<PlayersPage />);
    await waitFor(() => screen.getByText('John Doe'));

    fireEvent.change(screen.getByPlaceholderText(/Position/i), { target: { value: 'Forward' } });
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  test('filters players by nationality', async () => {
    render(<PlayersPage />);
    await waitFor(() => screen.getByText('John Doe'));

    fireEvent.change(screen.getByPlaceholderText(/Nationality/i), { target: { value: 'England' } });
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  test('resets filters', async () => {
    render(<PlayersPage />);
    await waitFor(() => screen.getByText('John Doe'));

    fireEvent.change(screen.getByPlaceholderText(/Player Name/i), { target: { value: 'Jane' } });
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Reset Filters/i));
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('shows message when no players match filters', async () => {
    render(<PlayersPage />);
    await waitFor(() => screen.getByText('John Doe'));

    fireEvent.change(screen.getByPlaceholderText(/Player Name/i), { target: { value: 'XYZ' } });
    expect(screen.getByText(/No players match your filters/i)).toBeInTheDocument();
  });

  test('renders pagination controls if needed', async () => {
    // create 120 mock players for pagination
    const manyPlayers = Array.from({ length: 120 }, (_, i) => ({
      _id: `p${i}`,
      name: `Player ${i}`,
      teamId: 't1',
      position: 'Forward',
      nationality: 'Country',
      dateOfBirth: '2000-01-01',
    }));
    apiClient.request.mockResolvedValue({ success: true, players: manyPlayers });

    render(<PlayersPage />);
    await waitFor(() => screen.getByText('Player 0'));

    expect(screen.getByText('Next')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Player 50')).toBeInTheDocument();
  });
});
