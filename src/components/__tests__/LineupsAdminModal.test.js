import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LineupsAdminModal from '../LineupsAdminModal';
import * as api from '../../lib/api';

// Mock API client
jest.mock('../../lib/api', () => ({
  apiClient: {
    getTeams: jest.fn(),
    getLineupsByMatch: jest.fn(),
    saveLineup: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('LineupsAdminModal Component', () => {
  const mockOnClose = jest.fn();
  const mockMatch = {
    id: 'match1',
    homeTeam: { 
      name: 'Arsenal', 
      crest: '/arsenal.png',
      id: 'team1'
    },
    awayTeam: { 
      name: 'Chelsea', 
      crest: '/chelsea.png',
      id: 'team2'
    },
  };

  const mockTeamsData = {
    data: [
      { _id: 'team1', name: 'Arsenal', crest: '/arsenal.png' },
      { _id: 'team2', name: 'Chelsea', crest: '/chelsea.png' },
    ],
  };

  const mockPlayersData = {
    players: [
      { id: 'player1', name: 'Bukayo Saka', position: 'Forward', jerseyNumber: 7 },
      { id: 'player2', name: 'Martin Ødegaard', position: 'Midfielder', jerseyNumber: 8 },
      { id: 'player3', name: 'Reece James', position: 'Defender', jerseyNumber: 24 },
      { id: 'player4', name: 'Raheem Sterling', position: 'Forward', jerseyNumber: 17 },
    ],
  };

  const mockLineupsData = {
    data: [
      {
        teamId: 'team1',
        starters: [
          { id: 'player1', name: 'Bukayo Saka', position: 'Forward', jerseyNumber: 7 }
        ],
        substitutes: [
          { id: 'player2', name: 'Martin Ødegaard', position: 'Midfielder', jerseyNumber: 8 }
        ]
      }
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default API mocks
    api.apiClient.getTeams.mockResolvedValue(mockTeamsData);
    api.apiClient.getLineupsByMatch.mockResolvedValue(mockLineupsData);
    api.apiClient.saveLineup.mockResolvedValue({});
    
    // Mock fetch for players
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/players')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPlayersData),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('renders loading state initially', async () => {
    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    expect(screen.getByText('Loading lineups...')).toBeInTheDocument();
  });

  it('renders modal with team information after loading', async () => {
    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Match Lineups')).toBeInTheDocument();
      expect(screen.getByText('Arsenal')).toBeInTheDocument();
      expect(screen.getByText('Chelsea')).toBeInTheDocument();
    });
  });

  it('displays team crests', async () => {
    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      const crests = screen.getAllByRole('img');
      expect(crests[0]).toHaveAttribute('src', '/arsenal.png');
      expect(crests[1]).toHaveAttribute('src', '/chelsea.png');
    });
  });

  it('shows starters and substitutes sections', async () => {
    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Starters (1/11)')).toHaveLength(2);
      expect(screen.getAllByText('Substitutes')).toHaveLength(2);
    });
  });

  it('displays players in starters and substitutes', async () => {
    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
      expect(screen.getByText('Martin Ødegaard')).toBeInTheDocument();
      expect(screen.getByText('Reece James')).toBeInTheDocument();
      expect(screen.getByText('Raheem Sterling')).toBeInTheDocument();
    });
  });

  it('toggles players between starters and substitutes', async () => {
    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      const playerCards = screen.getAllByText('Martin Ødegaard');
      // Click on a substitute to make them a starter
      fireEvent.click(playerCards[0]);
    });

    // Should now show 2 starters
    expect(screen.getAllByText('Starters (2/11)')).toHaveLength(2);
  });

  it('prevents adding more than 11 starters', async () => {
    // Mock alert
    window.alert = jest.fn();

    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      // Get all player cards
      const playerCards = screen.getAllByText('Reece James');
      
      // Click multiple players to try to exceed 11 starters
      for (let i = 0; i < 15; i++) {
        fireEvent.click(playerCards[0]);
      }
    });

    expect(window.alert).toHaveBeenCalledWith('⚠️ You already have 11 starters for this team!');
  });

  it('shows add player form when no players are found', async () => {
    // Mock empty players response
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/players')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ players: [] }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      });
    });

    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      expect(screen.getByText('⚠️ No players found in the database')).toBeInTheDocument();
      expect(screen.getByText('+ Add Player Manually')).toBeInTheDocument();
    });
  });

  it('adds new player manually', async () => {
    // Mock empty players response to trigger add player form
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/players')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ players: [] }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      });
    });

    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      const addButton = screen.getByText('+ Add Player Manually');
      fireEvent.click(addButton);
    });

    // Fill the add player form
    const jerseyInput = screen.getByPlaceholderText('e.g., 10');
    const nameInput = screen.getByPlaceholderText('e.g., Lionel Messi');
    const positionSelect = screen.getByDisplayValue('Select position');

    fireEvent.change(jerseyInput, { target: { value: '10' } });
    fireEvent.change(nameInput, { target: { value: 'Lionel Messi' } });
    fireEvent.change(positionSelect, { target: { value: 'Forward' } });

    const addPlayerButton = screen.getByText('Add Player');
    await act(async () => {
      fireEvent.click(addPlayerButton);
    });

    expect(screen.getByText('Lionel Messi')).toBeInTheDocument();
  });

  it('validates required fields when adding player', async () => {
    // Mock empty players response
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/players')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ players: [] }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      });
    });

    window.alert = jest.fn();

    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      const addButton = screen.getByText('+ Add Player Manually');
      fireEvent.click(addButton);
    });

    const addPlayerButton = screen.getByText('Add Player');
    fireEvent.click(addPlayerButton);

    expect(window.alert).toHaveBeenCalledWith('⚠️ Player name is required');
  });

  it('saves lineups when save button is clicked', async () => {
    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      const saveButton = screen.getByText('Save Lineups');
      fireEvent.click(saveButton);
    });

    expect(api.apiClient.saveLineup).toHaveBeenCalled();
  });

  it('handles close button click', async () => {
    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles cancel button click', async () => {
    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('cancels add player form', async () => {
    // Mock empty players response
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/players')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ players: [] }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      });
    });

    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      const addButton = screen.getByText('+ Add Player Manually');
      fireEvent.click(addButton);
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Add New Player')).not.toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    api.apiClient.getTeams.mockRejectedValue(new Error('Failed to fetch teams'));

    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    // Should not crash, should finish loading
    await waitFor(() => {
      expect(screen.queryByText('Loading lineups...')).not.toBeInTheDocument();
    });
  });

  it('handles save lineup errors', async () => {
    api.apiClient.saveLineup.mockRejectedValue(new Error('Failed to save'));

    window.alert = jest.fn();

    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      const saveButton = screen.getByText('Save Lineups');
      fireEvent.click(saveButton);
    });

    expect(window.alert).toHaveBeenCalledWith('❌ Failed to save lineups');
  });

  it('displays player jersey numbers', async () => {
    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument(); // Bukayo Saka
      expect(screen.getByText('8')).toBeInTheDocument(); // Martin Ødegaard
      expect(screen.getByText('24')).toBeInTheDocument(); // Reece James
      expect(screen.getByText('17')).toBeInTheDocument(); // Raheem Sterling
    });
  });

  it('displays player positions', async () => {
    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Forward')).toBeInTheDocument();
      expect(screen.getByText('Midfielder')).toBeInTheDocument();
      expect(screen.getByText('Defender')).toBeInTheDocument();
    });
  });

  it('shows starters remaining count', async () => {
    await act(async () => {
      render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('10 starters remaining')).toHaveLength(2);
    });
  });

  it('matches snapshot with loaded data', async () => {
    await act(async () => {
      const { container } = render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
      
      await waitFor(() => {
        expect(screen.getByText('Arsenal')).toBeInTheDocument();
      });
      
      expect(container).toMatchSnapshot();
    });
  });

  it('matches snapshot in loading state', async () => {
    const { container } = render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
    expect(container).toMatchSnapshot();
  });

  describe('Player movement', () => {
    it('moves player from substitutes to starters', async () => {
      await act(async () => {
        render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        // Find Martin Ødegaard who is initially a substitute
        const odegaardCards = screen.getAllByText('Martin Ødegaard');
        fireEvent.click(odegaardCards[0]);
      });

      // Should now show 2 starters for Arsenal
      expect(screen.getAllByText('Starters (2/11)')).toHaveLength(2);
    });

    it('moves player from starters to substitutes', async () => {
      await act(async () => {
        render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        // Find Bukayo Saka who is initially a starter
        const sakaCards = screen.getAllByText('Bukayo Saka');
        fireEvent.click(sakaCards[0]);
      });

      // Should now show 0 starters for Arsenal
      expect(screen.getAllByText('Starters (0/11)')).toHaveLength(2);
    });
  });

  describe('Add player functionality', () => {
    it('shows add player button when players exist', async () => {
      await act(async () => {
        render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByText('+ Add Another Player')).toBeInTheDocument();
      });
    });

    it('opens add player form when button is clicked', async () => {
      await act(async () => {
        render(<LineupsAdminModal match={mockMatch} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        const addButton = screen.getByText('+ Add Another Player');
        fireEvent.click(addButton);
      });

      expect(screen.getByText('Add New Player')).toBeInTheDocument();
    });
  });
});