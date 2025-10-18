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
    { id: 'p1', name: 'Player 1', position: 'GK' },
    { id: 'p2', name: 'Player 2', position: 'DEF' },
  ];
  const mockAwayPlayers = [
    { id: 'p3', name: 'Player 3', position: 'MID' },
    { id: 'p4', name: 'Player 4', position: 'FWD' },
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
      expect(screen.getByText(/Team A Lineup/i)).toBeInTheDocument();
      expect(screen.getByText(/Player 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Player 2/i)).toBeInTheDocument();

      expect(screen.getByText(/Team B Lineup/i)).toBeInTheDocument();
      expect(screen.getByText(/Player 3/i)).toBeInTheDocument();
      expect(screen.getByText(/Player 4/i)).toBeInTheDocument();
    });
  });

  it('toggles a player from substitute to starter and vice versa', async () => {
    render(<LineupsAdminModal match={mockMatch} onClose={jest.fn()} />);

    await waitFor(() => screen.getByText(/Player 1/i));

    const playerCard = screen.getByText(/Player 1/i);
    expect(playerCard.className).toMatch(/substitute/);

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

    // Click Save button
    const saveBtn = screen.getByText(/Save Lineups/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiClient.saveLineup).toHaveBeenCalledTimes(2); // Home + Away
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const onCloseMock = jest.fn();
    render(<LineupsAdminModal match={mockMatch} onClose={onCloseMock} />);

    await waitFor(() => screen.getByText(/Player 1/i));

    const cancelBtn = screen.getByText(/Cancel/i);
    fireEvent.click(cancelBtn);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('handles match being null gracefully', () => {
    render(<LineupsAdminModal match={null} onClose={jest.fn()} />);
    expect(screen.queryByText(/Lineup/i)).not.toBeInTheDocument();
  });
});
