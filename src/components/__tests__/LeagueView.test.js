// src/components/PlayersPage/__tests__/PlayersPage.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlayersPage from '../PlayersPage';
import { apiClient } from '../../../lib/api';

// Mock apiClient
jest.mock('../../../lib/api', () => ({
  apiClient: {
    request: jest.fn(),
    getTeams: jest.fn(),
  },
}));

describe('PlayersPage', () => {
  const playersMock = [
    { _id: 'p1', name: 'Lionel Messi', teamId: 't1', position: 'Forward', nationality: 'Argentina', dateOfBirth: '1987-06-24' },
    { _id: 'p2', name: 'Cristiano Ronaldo', teamId: 't2', position: 'Forward', nationality: 'Portugal', dateOfBirth: '1985-02-05' },
  ];

  const teamsMock = [
    { id: 't1', name: 'Paris Saint-Germain', crest: 'psg.png' },
    { id: 't2', name: 'Manchester United', crest: 'manu.png' },
  ];

  beforeEach(() => {
    apiClient.request.mockResolvedValue({ success: true, players: playersMock });
    apiClient.getTeams.mockResolvedValue({ data: teamsMock });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading initially', () => {
    render(<PlayersPage />);
    expect(screen.getByText(/Loading players/i)).toBeInTheDocument();
  });

  test('renders players after fetch', async () => {
    render(<PlayersPage />);
    expect(await screen.findByText('Lionel Messi')).toBeInTheDocument();
    expect(screen.getByText('Cristiano Ronaldo')).toBeInTheDocument();
  });

  test('filters players by name', async () => {
    render(<PlayersPage />);
    const input = await screen.findByPlaceholderText(/Player Name/i);
    fireEvent.change(input, { target: { value: 'Messi' } });

    await waitFor(() => {
      expect(screen.getByText('Lionel Messi')).toBeInTheDocument();
      expect(screen.queryByText('Cristiano Ronaldo')).not.toBeInTheDocument();
    });
  });

  test('filters players by team', async () => {
    render(<PlayersPage />);
    const input = await screen.findByPlaceholderText(/Team Name/i);
    fireEvent.change(input, { target: { value: 'Manchester' } });

    await waitFor(() => {
      expect(screen.getByText('Cristiano Ronaldo')).toBeInTheDocument();
      expect(screen.queryByText('Lionel Messi')).not.toBeInTheDocument();
    });
  });

  test('filters players by position', async () => {
    render(<PlayersPage />);
    const input = await screen.findByPlaceholderText(/Position/i);
    fireEvent.change(input, { target: { value: 'Forward' } });

    await waitFor(() => {
      expect(screen.getByText('Lionel Messi')).toBeInTheDocument();
      expect(screen.getByText('Cristiano Ronaldo')).toBeInTheDocument();
    });
  });

  test('filters players by nationality', async () => {
    render(<PlayersPage />);
    const input = await screen.findByPlaceholderText(/Nationality/i);
    fireEvent.change(input, { target: { value: 'Argentina' } });

    await waitFor(() => {
      expect(screen.getByText('Lionel Messi')).toBeInTheDocument();
      expect(screen.queryByText('Cristiano Ronaldo')).not.toBeInTheDocument();
    });
  });

  test('resets filters', async () => {
    render(<PlayersPage />);
    const nameInput = await screen.findByPlaceholderText(/Player Name/i);
    fireEvent.change(nameInput, { target: { value: 'Messi' } });

    const resetButton = screen.getByText(/Reset Filters/i);
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText('Lionel Messi')).toBeInTheDocument();
      expect(screen.getByText('Cristiano Ronaldo')).toBeInTheDocument();
    });
  });

  test('displays team crest if available', async () => {
    render(<PlayersPage />);
    const img = await screen.findByAltText('Paris Saint-Germain');
    expect(img).toHaveAttribute('src', 'psg.png');
  });
});
