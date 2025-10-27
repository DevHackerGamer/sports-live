import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LineupsAdminModal from '../liveInput/LineupsAdminModal';
import { apiClient } from '../../lib/api';

jest.mock('../../lib/api', () => ({
  apiClient: {
    getLineupsByMatch: jest.fn(),
    saveLineup: jest.fn(),
  },
}));

describe('LineupsAdminModal', () => {
  const mockMatch = {
    id: 'match1',
    homeTeam: { id: '1', name: 'Team A' },
    awayTeam: { id: '2', name: 'Team B' },
  };

  const mockHomePlayers = [
    { id: 'p1', name: 'Player 1', position: 'GK', jerseyNumber: 1 },
    { id: 'p2', name: 'Player 2', position: 'DEF', jerseyNumber: 2 },
  ];
  const mockAwayPlayers = [
    { id: 'p3', name: 'Player 3', position: 'MID', jerseyNumber: 3 },
    { id: 'p4', name: 'Player 4', position: 'FWD', jerseyNumber: 4 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn((url) => {
      if (url.includes('teamId=1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ players: mockHomePlayers }),
        });
      }
      if (url.includes('teamId=2')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ players: mockAwayPlayers }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ players: [] }) });
    });

    apiClient.getLineupsByMatch.mockResolvedValue([]);
    apiClient.saveLineup.mockResolvedValue({});
  });

  it('renders loading state initially', () => {
    render(<LineupsAdminModal match={mockMatch} onClose={jest.fn()} />);
    expect(screen.getByText(/Loading lineups/i)).toBeInTheDocument();
  });

  it('fetches and displays players after loading', async () => {
    render(<LineupsAdminModal match={mockMatch} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Team A/i)).toBeInTheDocument();
      expect(screen.getByText(/Player 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Player 2/i)).toBeInTheDocument();

      expect(screen.getByText(/Team B/i)).toBeInTheDocument();
      expect(screen.getByText(/Player 3/i)).toBeInTheDocument();
      expect(screen.getByText(/Player 4/i)).toBeInTheDocument();
    });
  });

  it('toggles a player from substitute to starter and vice versa', async () => {
    render(<LineupsAdminModal match={mockMatch} onClose={jest.fn()} />);

    await waitFor(() => screen.getByText(/Player 1/i));
    const playerCard = screen.getByText(/Player 1/i);

    // Toggle to starter
    fireEvent.click(playerCard);
    expect(playerCard.className).toMatch(/starter/);

    // Toggle back to substitute
    fireEvent.click(playerCard);
    expect(playerCard.className).toMatch(/substitute/);
  });

  it('calls apiClient.saveLineup and onClose when Save button is clicked', async () => {
    const onCloseMock = jest.fn();
    render(<LineupsAdminModal match={mockMatch} onClose={onCloseMock} />);

    await waitFor(() => screen.getByText(/Player 1/i));

    // Toggle a player to starter
    fireEvent.click(screen.getByText(/Player 1/i));

    fireEvent.click(screen.getByText(/Save Lineups/i));

    await waitFor(() => {
      expect(apiClient.saveLineup).toHaveBeenCalledTimes(1);
      expect(onCloseMock).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const onCloseMock = jest.fn();
    render(<LineupsAdminModal match={mockMatch} onClose={onCloseMock} />);

    await waitFor(() => screen.getByText(/Player 1/i));
    fireEvent.click(screen.getByText(/Cancel/i));

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('handles match being null gracefully', () => {
    render(<LineupsAdminModal match={null} onClose={jest.fn()} />);
    expect(screen.getByText(/Loading lineups/i)).toBeInTheDocument();
  });

  // ✅ New tests

  it('adds a new player manually', async () => {
    render(<LineupsAdminModal match={mockMatch} onClose={jest.fn()} />);

    await waitFor(() => screen.getByText(/Player 1/i));

    fireEvent.click(screen.getAllByText(/\+ Add Another Player/)[0]); // Home team

    fireEvent.change(screen.getByPlaceholderText(/e.g., 10/), { target: { value: '99' } });
    fireEvent.change(screen.getByPlaceholderText(/e.g., Lionel Messi/), { target: { value: 'Test Player' } });
    fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'Forward' } });

    fireEvent.click(screen.getByText(/Add Player/i));

    await waitFor(() => screen.getByText(/Test Player/i));
    expect(screen.getByText(/Test Player/i)).toBeInTheDocument();
  });

  it('prevents adding more than 11 starters', async () => {
    render(<LineupsAdminModal match={mockMatch} onClose={jest.fn()} />);

    await waitFor(() => screen.getByText(/Player 1/i));

    // Add 11 dummy players as starters
    for (let i = 0; i < 11; i++) {
      fireEvent.click(screen.getByText(/Player 1/i));
    }

    // The 12th attempt should alert
    window.alert = jest.fn();
    fireEvent.click(screen.getByText(/Player 1/i));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('already have 11 starters'));
  });

  it('shows alert when save fails', async () => {
    apiClient.saveLineup.mockRejectedValue(new Error('Save failed'));
    window.alert = jest.fn();

    render(<LineupsAdminModal match={mockMatch} onClose={jest.fn()} />);
    await waitFor(() => screen.getByText(/Player 1/i));
    fireEvent.click(screen.getByText(/Player 1/i));
    fireEvent.click(screen.getByText(/Save Lineups/i));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to save'));
    });
  });
});
