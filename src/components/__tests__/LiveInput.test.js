import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LiveInput from '../liveInput/LiveInput';
import * as ClerkReact from '@clerk/clerk-react';
import * as roles from '../../lib/roles';
import * as api from '../../lib/api';

// Mock Clerk
jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
}));

// Mock API client
jest.mock('../../lib/api', () => ({
  apiClient: {
    getMatch: jest.fn(),
    getTeams: jest.fn(),
    addMatchEvent: jest.fn(),
    deleteMatchEvent: jest.fn(),
    updateMatch: jest.fn(),
    getMatchStatistics: jest.fn(),
    updateMatchStatistics: jest.fn(),
  },
}));

// Mock child components
jest.mock('../liveInput/LineupsAdminModal', () => ({ match, onClose }) => (
  <div data-testid="lineups-admin-modal">
    Lineups Admin Modal for {match?.id}
    <button onClick={onClose}>Close Lineups</button>
  </div>
));

jest.mock('../liveInput/CommentaryAdminModal', () => ({ matchId, isOpen, onClose }) => (
  <div data-testid="commentary-admin-modal">
    Commentary Admin Modal for match {matchId}
    <button onClick={onClose}>Close Commentary</button>
  </div>
));

describe('LiveInput Component', () => {
  const mockOnBackToMatch = jest.fn();
  const mockUser = { id: 'user123', firstName: 'John' };
  const mockAdminUser = { 
    id: 'admin123', 
    firstName: 'Admin',
    privateMetadata: { type: 'admin' }
  };

  const mockMatch = {
    id: 'match1',
    homeTeam: { name: 'Arsenal', crest: '/arsenal.png' },
    awayTeam: { name: 'Chelsea', crest: '/chelsea.png' },
    status: 'IN_PLAY',
    createdByAdmin: true,
    clock: {
      running: true,
      elapsed: 1200, // 20 minutes
      startedAt: new Date(Date.now() - 1200000).toISOString(),
    },
    events: [
      {
        id: 'event1',
        type: 'goal',
        minute: 15,
        team: 'home',
        player: 'Bukayo Saka',
        description: 'Goal - Arsenal - Bukayo Saka',
      },
    ],
  };

  const mockTeamsData = {
    data: [
      { _id: 'team1', name: 'Arsenal', crest: '/arsenal.png' },
      { _id: 'team2', name: 'Chelsea', crest: '/chelsea.png' },
    ],
  };

  const mockPlayersData = {
    players: [
      { name: 'Bukayo Saka', position: 'Forward' },
      { name: 'Martin Ødegaard', position: 'Midfielder' },
      { name: 'Reece James', position: 'Defender' },
      { name: 'Raheem Sterling', position: 'Forward' },
    ],
  };

  const mockStatsData = {
    possession: { home: 60, away: 40 },
    shotsOnTarget: { home: 5, away: 3 },
    shotsOffTarget: { home: 8, away: 6 },
    totalShots: { home: 13, away: 9 },
    corners: { home: 4, away: 2 },
    fouls: { home: 10, away: 12 },
    yellowCards: { home: 1, away: 2 },
    redCards: { home: 0, away: 0 },
    offsides: { home: 2, away: 1 },
    saves: { home: 2, away: 4 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mocks
    ClerkReact.useUser.mockReturnValue({ user: mockAdminUser });
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(true);
    
    // Mock API responses
    api.apiClient.getMatch.mockResolvedValue({ data: mockMatch });
    api.apiClient.getTeams.mockResolvedValue(mockTeamsData);
    api.apiClient.addMatchEvent.mockResolvedValue({ data: {} });
    api.apiClient.deleteMatchEvent.mockResolvedValue({});
    api.apiClient.updateMatch.mockResolvedValue({});
    api.apiClient.getMatchStatistics.mockResolvedValue(mockStatsData);
    api.apiClient.updateMatchStatistics.mockResolvedValue(mockStatsData);
    
    // Mock fetch for players
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPlayersData),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders access denied for non-admin users', () => {
    ClerkReact.useUser.mockReturnValue({ user: mockUser });
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(false);

    render(<LiveInput match={mockMatch} onBackToMatch={mockOnBackToMatch} />);

    expect(screen.getByText('Access denied: Admin role required.')).toBeInTheDocument();
  });

  it('renders no match selected message', () => {
    render(<LiveInput isAdmin={true} onBackToMatch={mockOnBackToMatch} />);

    expect(screen.getByText('No match selected. Select a match first from Live Sports.')).toBeInTheDocument();
  });

  it('renders live input interface for admin with match', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    expect(screen.getByText('Live Match Input')).toBeInTheDocument();
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText('Chelsea')).toBeInTheDocument();
    expect(screen.getByText('↩ Back')).toBeInTheDocument();
  });

  it('displays match timer and controls', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    expect(screen.getByText('20:00')).toBeInTheDocument(); // 20 minutes in MM:SS format
    expect(screen.getByText('⏸')).toBeInTheDocument(); // Pause button
  });

  it('starts and pauses timer', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    const pauseButton = screen.getByText('⏸');
    fireEvent.click(pauseButton);

    expect(screen.getByText('▶')).toBeInTheDocument(); // Now shows play button

    // Advance time and verify timer doesn't run when paused
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('20:00')).toBeInTheDocument(); // Time should not change
  });

  it('adds new match event', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    // Fill event form
    const playerInput = screen.getByPlaceholderText('Player name');
    const descriptionInput = screen.getByPlaceholderText('Event description');
    const addButton = screen.getByText('Add Event');

    fireEvent.change(playerInput, { target: { value: 'Martin Ødegaard' } });
    fireEvent.change(descriptionInput, { target: { value: 'Great goal from outside the box' } });

    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(api.apiClient.addMatchEvent).toHaveBeenCalledWith(
      'match1',
      expect.objectContaining({
        type: 'goal',
        player: 'Martin Ødegaard',
        description: 'Great goal from outside the box',
      }),
      { userType: 'admin' }
    );
  });

  it('adds substitution event', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    // Change event type to substitution
    const eventTypeSelect = screen.getByDisplayValue('Goal');
    fireEvent.change(eventTypeSelect, { target: { value: 'substitution' } });

    // Fill substitution fields
    const playerOutInput = screen.getByPlaceholderText('Player OUT');
    const playerInInput = screen.getByPlaceholderText('Player IN');
    const addButton = screen.getByText('Add Event');

    fireEvent.change(playerOutInput, { target: { value: 'Bukayo Saka' } });
    fireEvent.change(playerInInput, { target: { value: 'Martin Ødegaard' } });

    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(api.apiClient.addMatchEvent).toHaveBeenCalledWith(
      'match1',
      expect.objectContaining({
        type: 'substitution',
        playerOut: 'Bukayo Saka',
        playerIn: 'Martin Ødegaard',
      }),
      { userType: 'admin' }
    );
  });

  it('removes event from timeline', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    const removeButtons = screen.getAllByText('×');
    await act(async () => {
      fireEvent.click(removeButtons[0]);
    });

    expect(api.apiClient.deleteMatchEvent).toHaveBeenCalledWith(
      'match1',
      'event1',
      { userType: 'admin' }
    );
  });

  it('handles half time button click', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    const halfTimeButton = screen.getByText('⏱ Half Time');
    await act(async () => {
      fireEvent.click(halfTimeButton);
    });

    expect(api.apiClient.addMatchEvent).toHaveBeenCalledWith(
      'match1',
      expect.objectContaining({
        type: 'half_time',
        description: 'Half Time',
      }),
      { userType: 'admin' }
    );
  });

  it('handles full time button click', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    const fullTimeButton = screen.getByText('🏁 Full Time');
    await act(async () => {
      fireEvent.click(fullTimeButton);
    });

    expect(api.apiClient.addMatchEvent).toHaveBeenCalledWith(
      'match1',
      expect.objectContaining({
        type: 'match_end',
        description: 'Full Time',
      }),
      { userType: 'admin' }
    );

    expect(api.apiClient.updateMatch).toHaveBeenCalledWith(
      'match1',
      expect.objectContaining({
        status: 'FINISHED',
      }),
      { userType: 'admin' }
    );
  });

  it('updates possession when clicked on possession bar', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    const possessionBar = screen.getByTitle(/Click to set possession/);
    
    // Mock getBoundingClientRect for the possession bar
    possessionBar.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      width: 200,
      top: 0,
      height: 20,
      right: 200,
      bottom: 20,
    }));

    fireEvent.click(possessionBar, { clientX: 100 }); // Click at 50%

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // Both teams should show 50%
  });

  it('shows and hides statistics panel', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    const statsButton = screen.getByText('📊 Show Stats');
    fireEvent.click(statsButton);

    expect(screen.getByText('Match Statistics')).toBeInTheDocument();
    expect(screen.getByText('Hide Stats')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hide Stats'));
    expect(screen.queryByText('Match Statistics')).not.toBeInTheDocument();
  });

  it('updates match statistics', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    // Show stats panel
    fireEvent.click(screen.getByText('📊 Show Stats'));

    // Find and update a statistic
    const shotsInput = screen.getAllByDisplayValue('5')[0]; // Home shots on target
    fireEvent.change(shotsInput, { target: { value: '6' } });

    expect(api.apiClient.updateMatchStatistics).toHaveBeenCalledWith(
      'match1',
      expect.objectContaining({
        shotsOnTarget: { home: 6, away: 3 },
      })
    );
  });

  it('shows and hides lineups modal', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    const lineupsButton = screen.getByText('👥 Edit Lineups');
    fireEvent.click(lineupsButton);

    expect(screen.getByTestId('lineups-admin-modal')).toBeInTheDocument();
    expect(screen.getByText('Close Lineups')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close Lineups'));
    expect(screen.queryByTestId('lineups-admin-modal')).not.toBeInTheDocument();
  });

  it('shows and hides commentary modal', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    const commentaryButton = screen.getByText('💬 Live Commentary');
    fireEvent.click(commentaryButton);

    expect(screen.getByTestId('commentary-admin-modal')).toBeInTheDocument();
    expect(screen.getByText('Close Commentary')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close Commentary'));
    expect(screen.queryByTestId('commentary-admin-modal')).not.toBeInTheDocument();
  });

  it('handles back button click', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    const backButton = screen.getByText('↩ Back');
    fireEvent.click(backButton);

    expect(mockOnBackToMatch).toHaveBeenCalled();
  });

  it('displays events timeline', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    expect(screen.getByText('Events Timeline')).toBeInTheDocument();
    expect(screen.getByText('Goal - Arsenal - Bukayo Saka')).toBeInTheDocument();
  });

  it('shows no events message when timeline is empty', async () => {
    const matchWithoutEvents = {
      ...mockMatch,
      events: [],
    };

    await act(async () => {
      render(<LiveInput isAdmin={true} match={matchWithoutEvents} onBackToMatch={mockOnBackToMatch} />);
    });

    expect(screen.getByText('No events recorded yet.')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    api.apiClient.addMatchEvent.mockRejectedValue(new Error('Failed to add event'));

    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    const playerInput = screen.getByPlaceholderText('Player name');
    const addButton = screen.getByText('Add Event');

    fireEvent.change(playerInput, { target: { value: 'Test Player' } });

    await act(async () => {
      fireEvent.click(addButton);
    });

    // Should not crash, error should be handled
    expect(screen.getByText('Live Match Input')).toBeInTheDocument();
  });

  it('prevents adding events to finished match', async () => {
    const finishedMatch = {
      ...mockMatch,
      status: 'FINISHED',
    };

    await act(async () => {
      render(<LiveInput isAdmin={true} match={finishedMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    const addButton = screen.getByText('Add Event');
    expect(addButton).toBeDisabled();
    expect(addButton).toHaveAttribute('title', 'Cannot add events to finished match');
  });

  it('disables half time and full time buttons for finished match', async () => {
    const finishedMatch = {
      ...mockMatch,
      status: 'FINISHED',
    };

    await act(async () => {
      render(<LiveInput isAdmin={true} match={finishedMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    const halfTimeButton = screen.getByText('⏱ Half Time');
    const fullTimeButton = screen.getByText('🏁 Full Time');

    expect(halfTimeButton).toBeDisabled();
    expect(fullTimeButton).toBeDisabled();
  });

  it('formats time correctly', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    // Should format 1200 seconds as 20:00
    expect(screen.getByText('20:00')).toBeInTheDocument();
  });

  it('loads match statistics on mount', async () => {
    await act(async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    });

    expect(api.apiClient.getMatchStatistics).toHaveBeenCalledWith('match1');
  });

  it('matches snapshot with admin and match', async () => {
    await act(async () => {
      const { container } = render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
      expect(container).toMatchSnapshot();
    });
  });

  it('matches snapshot with non-admin user', () => {
    ClerkReact.useUser.mockReturnValue({ user: mockUser });
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(false);

    const { container } = render(<LiveInput match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot without match', () => {
    const { container } = render(<LiveInput isAdmin={true} onBackToMatch={mockOnBackToMatch} />);
    expect(container).toMatchSnapshot();
  });

  describe('Timer functionality', () => {
    it('increments timer when running', async () => {
      await act(async () => {
        render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
      });

      // Timer should be running initially
      expect(screen.getByText('20:00')).toBeInTheDocument();

      // Advance time by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByText('20:01')).toBeInTheDocument();
    });

    it('stops timer when match is finished', async () => {
      const finishedMatch = {
        ...mockMatch,
        status: 'FINISHED',
      };

      await act(async () => {
        render(<LiveInput isAdmin={true} match={finishedMatch} onBackToMatch={mockOnBackToMatch} />);
      });

      // Timer should not increment for finished match
      const initialTime = screen.getByText('20:00').textContent;

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.getByText(initialTime)).toBeInTheDocument();
    });
  });

  describe('Event type handling', () => {
    it('handles different event types correctly', async () => {
      await act(async () => {
        render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={mockOnBackToMatch} />);
      });

      const eventTypeSelect = screen.getByDisplayValue('Goal');
      
      // Test yellow card
      fireEvent.change(eventTypeSelect, { target: { value: 'yellow_card' } });
      expect(screen.getByDisplayValue('Yellow Card')).toBeInTheDocument();

      // Test red card
      fireEvent.change(eventTypeSelect, { target: { value: 'red_card' } });
      expect(screen.getByDisplayValue('Red Card')).toBeInTheDocument();

      // Test substitution (should show different inputs)
      fireEvent.change(eventTypeSelect, { target: { value: 'substitution' } });
      expect(screen.getByPlaceholderText('Player OUT')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Player IN')).toBeInTheDocument();
    });
  });
});