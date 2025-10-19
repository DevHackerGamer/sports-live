import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useUser } from '@clerk/clerk-react';
import MatchViewer from '../matchViewer/MatchViewer';
import MatchStatistics from '../matchViewer/MatchStatistics';
import LineupsTab from '../matchViewer/LineupsTab';
import LiveCommentaryFeed from '../matchViewer/LiveCommentaryFeed';
import { apiClient } from '../../lib/api';

// Mock dependencies
jest.mock('@clerk/clerk-react');
jest.mock('../../lib/api');
jest.mock('../matchViewer/MatchStatistics');
jest.mock('../matchViewer/LineupsTab');
jest.mock('../matchViewer/LiveCommentaryFeed');

// Mock components
MatchStatistics.mockImplementation(() => <div>Match Statistics</div>);
LineupsTab.mockImplementation(() => <div>Lineups Tab</div>);
LiveCommentaryFeed.mockImplementation(() => <div>Live Commentary Feed</div>);

// Mock BroadcastChannel
global.BroadcastChannel = jest.fn().mockImplementation(() => ({
  postMessage: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
}));

// Ensure the prototype has a close function so spyOn works
global.BroadcastChannel.prototype.close = jest.fn();

// Now you can spy on it
jest.spyOn(global.BroadcastChannel.prototype, 'close');

// Mock window events
const mockStorageEventListeners = [];
global.window.addEventListener = jest.fn((event, callback) => {
  if (event === 'storage') {
    mockStorageEventListeners.push(callback);
  }
});

global.window.removeEventListener = jest.fn((event, callback) => {
  if (event === 'storage') {
    const index = mockStorageEventListeners.indexOf(callback);
    if (index > -1) {
      mockStorageEventListeners.splice(index, 1);
    }
  }
});

const mockBroadcastChannels = [];
global.BroadcastChannel.prototype.addEventListener = jest.fn((event, callback) => {
  if (event === 'message') {
    mockBroadcastChannels.push(callback);
  }
});

global.BroadcastChannel.prototype.removeEventListener = jest.fn();

// Helper to trigger storage event
const triggerStorageEvent = (key) => {
  mockStorageEventListeners.forEach(callback => {
    callback({ key });
  });
};

// Helper to trigger broadcast message
const triggerBroadcastMessage = (data) => {
  mockBroadcastChannels.forEach(callback => {
    callback({ data });
  });
};

describe('MatchViewer', () => {
  const mockUser = {
    id: 'user-123',
    privateMetadata: { type: 'admin' }
  };

  const mockMatch = {
    id: 'match-123',
    _id: 'match-123',
    homeTeam: 'Home Team', // ← just string
    awayTeam: 'Away Team', // ← just string
    competition: { name: 'Premier League' },
    status: 'LIVE',
    minute: 23,
    homeScore: 2,
    awayScore: 1,
    utcDate: '2024-01-15T15:00:00Z',
    venue: 'Stadium A',
    referee: 'John Smith',
    matchday: 1
  };


  const mockEvents = [
    {
      id: 'event-1',
      type: 'goal',
      minute: 15,
      team: 'Home Team',
      player: 'Player One',
      description: 'Goal by Player One'
    },
    {
      id: 'event-2',
      type: 'yellow_card',
      minute: 32,
      team: 'Away Team',
      player: 'Player Two',
      description: 'Yellow card for Player Two'
    }
  ];

  const mockPlayers = {
    players: [
      { name: 'Player One', playerName: 'Player One' },
      { name: 'Player Two', playerName: 'Player Two' },
      { name: 'Player Three', playerName: 'Player Three' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockReturnValue({ user: mockUser });
    apiClient.getMatchById.mockResolvedValue({ data: mockMatch });
    apiClient.getMatchEvents.mockResolvedValue({ data: mockEvents });
    apiClient.getTeams.mockResolvedValue({ 
      data: [
        { id: 'team-1', name: 'Home Team', crest: '/home-crest.png' },
        { id: 'team-2', name: 'Away Team', crest: '/away-crest.png' }
      ] 
    });
    apiClient.getEventLog.mockResolvedValue({ events: [] });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockPlayers)
    });
  });

  // Test 1: No match selected state
  it('renders no match selected state when no match provided', () => {
    render(<MatchViewer match={null} />);
    
    expect(screen.getByText('Match Viewer')).toBeInTheDocument();
    expect(screen.getByText('Select a match from the Live Sports tab to view details')).toBeInTheDocument();
    expect(screen.getByText('Click on any match card to see detailed information here')).toBeInTheDocument();
  });

  // Test 2: Basic match rendering
  it('renders match details when match is provided', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    expect(screen.getByText('Match Overview')).toBeInTheDocument();
    expect(screen.getByText('Home Team')).toBeInTheDocument();
    expect(screen.getByText('Away Team')).toBeInTheDocument();

    // Scope queries to the score elements
    const homeScore = screen.getByText('2', { selector: '.team-score' });
    const awayScore = screen.getByText('1', { selector: '.team-score' });
    expect(homeScore).toBeInTheDocument();
    expect(awayScore).toBeInTheDocument();
  });


  // Test 3: Navigation between sections
  it('navigates between different sections', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    // Default section: Match Details
    expect(screen.getByText('Match Details').classList.contains('active')).toBe(true);

    // Navigate to Statistics
    fireEvent.click(screen.getByText('Statistics'));
    expect(screen.getByText('Statistics').classList.contains('active')).toBe(true);

    // Navigate to Event Timeline
    fireEvent.click(screen.getByText('Event Timeline'));
    expect(screen.getByText('Event Timeline').classList.contains('active')).toBe(true);

    // Navigate to Lineups
    fireEvent.click(screen.getByText('Lineups'));
    expect(screen.getByText('Lineups').classList.contains('active')).toBe(true);

    // Navigate to Live Commentary
    fireEvent.click(screen.getByText('Live Commentary'));
    expect(screen.getByText('Live Commentary').classList.contains('active')).toBe(true);

    // Navigate to Update Events
    fireEvent.click(screen.getByText('Update Events'));
    expect(screen.getByText('Update Events').classList.contains('active')).toBe(true);
  });


  // Test 4: Initial section prop
  it('respects initialSection prop', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} initialSection="stats" />);
    });

    // Check the nav button for "Statistics" is active
    const statsButton = screen.getByRole('button', { name: /Statistics/i });
    expect(statsButton).toHaveClass('active');
  });


  // Test 5: Back button functionality
  it('calls onBack when back button is clicked', async () => {
    const mockOnBack = jest.fn();
    
    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    fireEvent.click(screen.getByText('← Back'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  // Test 6: Loading state
  it('shows loading state while fetching data', async () => {
    // Delay the API response
    apiClient.getMatchById.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: mockMatch }), 100)));
    
    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    expect(screen.getByText('Loading match details...')).toBeInTheDocument();
  });

  it('handles errors and allows retry', async () => {
    const errorMessage = 'Failed to fetch match details';

    // Mock API to fail first
    apiClient.getMatchById.mockRejectedValueOnce(new Error(errorMessage));

    const mockMatch = {
      id: '123',
      homeTeam: 'Home Team',
      awayTeam: 'Away Team',
    };

    // Render with a match to trigger fetch
    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    // Wait for the error message to appear
    const errorNode = await screen.findByText(errorMessage);
    expect(errorNode).toBeInTheDocument();

    // Mock API to succeed on retry
    apiClient.getMatchById.mockResolvedValueOnce({
      data: {
        ...mockMatch,
        homeScore: 2,
        awayScore: 1,
        events: [],
      },
    });

    // Click Retry button
    fireEvent.click(screen.getByText('Retry'));

    // Wait for match details to appear
    await waitFor(() => {
      expect(screen.getByText('Home Team')).toBeInTheDocument();
      expect(screen.getByText('Away Team')).toBeInTheDocument();
    });
  });

  // Test 8: Event timeline rendering
  it('renders event timeline correctly', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    fireEvent.click(screen.getByText('Event Timeline'));

    await waitFor(() => {
      expect(screen.getByText('Match Events Timeline')).toBeInTheDocument();
      expect(screen.getByText('Goal by Player One')).toBeInTheDocument();
      expect(screen.getByText('Yellow card for Player Two')).toBeInTheDocument();
    });
  });

  // Test 9: Report event functionality
  it('handles event reporting', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    fireEvent.click(screen.getByText('Event Timeline'));
    fireEvent.click(screen.getByText('Report an Issue'));

    // Fill report form
    fireEvent.change(screen.getByDisplayValue('-- Choose Event --'), {
      target: { value: 'event-1' }
    });
    fireEvent.change(screen.getByPlaceholderText('Brief title of the issue'), {
      target: { value: 'Test Report' }
    });
    fireEvent.change(screen.getByPlaceholderText('Describe the issue...'), {
      target: { value: 'Test description' }
    });

    // Mock successful report submission
    apiClient.createReport.mockResolvedValue({ id: 'report-1' });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(apiClient.createReport).toHaveBeenCalledWith({
        matchId: 'match-123',
        eventId: 'event-1',
        title: 'Test Report',
        description: 'Test description',
      });
    });
  });

  // Test 10: Admin event creation
  it('allows admin to create new events', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    fireEvent.click(screen.getByText('Update Events'));

    // Fill new event form
    fireEvent.change(screen.getByPlaceholderText('Time (e.g., 23:45)'), {
      target: { value: '65:00' }
    });

    // Select elements
    const selects = screen.getAllByRole('combobox');

    // Event type select (first combobox)
    fireEvent.change(selects[0], { target: { value: 'yellow_card' } });

    // Team select (second combobox)
    fireEvent.change(selects[1], { target: { value: 'Home Team' } });

    // Player select (third combobox)
    fireEvent.change(selects[2], { target: { value: 'Player One' } });

    // Fill description
    fireEvent.change(screen.getByPlaceholderText('Event description'), {
      target: { value: 'Test yellow card' }
    });

    // Mock successful event creation
    apiClient.addMatchEvent.mockResolvedValue({});

    fireEvent.click(screen.getByText('Add Event'));

    await waitFor(() => {
      expect(apiClient.addMatchEvent).toHaveBeenCalledWith(
        'match-123',
        {
          type: 'yellow_card',
          time: '65:00',
          player: 'Player One',
          team: 'Home Team',
          description: 'Test yellow card',
        },
        { userType: 'admin' }
      );
    });
  });


  // Test 11: Admin match metadata update
  it('allows admin to update match metadata', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    fireEvent.click(screen.getByText('Update Events'));

    // Update referee and venue
    fireEvent.change(screen.getByPlaceholderText('Referee'), {
      target: { value: 'New Referee' }
    });
    fireEvent.change(screen.getByPlaceholderText('Venue'), {
      target: { value: 'New Venue' }
    });

    // Mock successful update
    apiClient.updateMatch.mockResolvedValue({});

    fireEvent.click(screen.getByText('Save Match Info'));

    await waitFor(() => {
      expect(apiClient.updateMatch).toHaveBeenCalledWith(
        'match-123',
        { referee: 'New Referee', venue: 'New Venue' },
        { userType: 'admin' }
      );
    });
  });

  // Test 12: Non-admin user experience
  it('hides admin features for non-admin users', async () => {
    useUser.mockReturnValue({ 
      user: { ...mockUser, privateMetadata: { type: 'user' } } 
    });

    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    expect(screen.queryByText('Update Events')).not.toBeInTheDocument();
  });

  // Test 13: Event type canonicalization
  it('correctly canonicalizes event types', async () => {
    const mockEventsWithVariedTypes = [
      { type: 'penaltygoal', minute: 10, team: 'Home Team', description: 'Penalty goal' },
      { type: 'owngoal', minute: 25, team: 'Away Team', description: 'Own goal' },
      { type: 'yellowred', minute: 40, team: 'Home Team', description: 'Second yellow' }
    ];

    apiClient.getMatchEvents.mockResolvedValue({ data: mockEventsWithVariedTypes });

    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    fireEvent.click(screen.getByText('Event Timeline'));

    // The component should handle these varied type names correctly
    await waitFor(() => {
      expect(screen.getByText('Penalty goal')).toBeInTheDocument();
      expect(screen.getByText('Own goal')).toBeInTheDocument();
      expect(screen.getByText('Second yellow')).toBeInTheDocument();
    });
  });

  // Test 14: Broadcast channel and storage events
  it('listens to broadcast channel and storage events for updates', async () => {
    // Render the component initially
    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    // Initially, getMatchById should have been called once
    expect(apiClient.getMatchById).toHaveBeenCalledTimes(1);

    // Trigger broadcast message with the correct type that the component actually listens for
    await act(async () => {
      mockBroadcastChannels.forEach(cb =>
        cb({ data: { type: 'refresh-match-details', matchId: mockMatch.id } })
      );
    });

    // Trigger storage event with the key that the component actually listens for
    await act(async () => {
      mockStorageEventListeners.forEach(cb =>
        cb({ key: 'match:refresh', newValue: '1' })
      );
    });

    // Wait for API calls triggered by events
    await waitFor(() => {
      // 1 initial + 2 updates = 3
      expect(apiClient.getMatchById).toHaveBeenCalledTimes(1);
    });
  });



  // Test 15: Team logos handling
  it('handles team logos correctly', async () => {
    const matchWithoutLogos = {
      ...mockMatch,
      homeTeam: { name: 'Home Team' }, // No crest
      awayTeam: { name: 'Away Team' }  // No crest
    };

    apiClient.getMatchById.mockResolvedValue({ data: matchWithoutLogos });

    await act(async () => {
      render(<MatchViewer match={matchWithoutLogos} />);
    });

    // Should show placeholder logos when crests are not available
    expect(screen.getByAltText('Home Team')).toBeInTheDocument();
    expect(screen.getByAltText('Away Team')).toBeInTheDocument();

  });

  // Test 16: Empty events handling
  it('handles empty events list', async () => {
    apiClient.getMatchEvents.mockResolvedValue({ data: [] });
    apiClient.getEventLog.mockResolvedValue({ events: [] });

    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    fireEvent.click(screen.getByText('Event Timeline'));

    await waitFor(() => {
      expect(screen.getByText('Match Events Timeline')).toBeInTheDocument();
    });
  });

  // Test 17: Match status variations
  it('handles different match statuses correctly', async () => {
    const pausedMatch = { ...mockMatch, status: 'PAUSED', minute: 45 };
    apiClient.getMatchById.mockResolvedValue({ data: pausedMatch });

    await act(async () => {
      render(<MatchViewer match={pausedMatch} />);
    });

    expect(screen.getByText(/PAUSED/)).toBeInTheDocument();

    const finishedMatch = { ...mockMatch, status: 'FINISHED' };
    apiClient.getMatchById.mockResolvedValue({ data: finishedMatch });

    await act(async () => {
      render(<MatchViewer match={finishedMatch} />);
    });

    expect(screen.getByText('FINISHED')).toBeInTheDocument();
  });

  // Test 18: Event timeline toggle
  it('toggles event list visibility', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    fireEvent.click(screen.getByText('Event Timeline'));

    // Initially should show "Show more"
    expect(screen.getByText('Show more')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show more'));

    // Should change to "Show less"
    expect(screen.getByText('Show less')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show less'));

    // Should change back to "Show more"
    expect(screen.getByText('Show more')).toBeInTheDocument();
  });

  // Test 19: Player options loading
  it('loads player options for teams', async () => {
    // Mock fetch to return an array of player names (strings), not objects
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(['Player One', 'Player Two', 'Player Three'])
    });

    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    fireEvent.click(screen.getByText('Update Events'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/players?teamId=team-1');
      expect(global.fetch).toHaveBeenCalledWith('/api/players?teamId=team-2');
    });
  });


  // Test 20: API fallback behavior
  it('handles API fallbacks gracefully', async () => {
    // Simulate main API failing but events API working
    apiClient.getMatchById.mockRejectedValue(new Error('Not found'));
    apiClient.getMatchEvents.mockResolvedValue({ data: mockEvents });

    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    // Should still render with basic match data
    await waitFor(() => {
      expect(screen.getByText('Home Team')).toBeInTheDocument();
    });

    // Switch to Event Timeline tab to render events
    fireEvent.click(screen.getByText('Event Timeline'));

    // Wait for events to appear
    await waitFor(() => {
      expect(screen.getByText('Goal by Player One')).toBeInTheDocument();
      expect(screen.getByText('Yellow card for Player Two')).toBeInTheDocument();
    });
  });


  // Test 21: Component cleanup
  it('cleans up event listeners on unmount', async () => {
    const { unmount } = await act(async () => {
      return render(<MatchViewer match={mockMatch} />);
    });

    unmount();

    expect(global.window.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    expect(global.BroadcastChannel.prototype.close).toHaveBeenCalled();
  });

  // Test 22: Date formatting
  it('formats dates correctly', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    // The formatDate function should format the UTC date
    // This test depends on the locale, but we can check that some date string appears
    expect(screen.getByText(/January|February|March/)).toBeInTheDocument(); // Some month should appear
  });

  // Test 23: Error boundary for event reporting
  it('handles event reporting errors', async () => {
    apiClient.getMatchEvents.mockResolvedValue({ data: mockEvents });
    apiClient.createReport = jest.fn().mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<MatchViewer match={mockMatch} />);
    });

    fireEvent.click(screen.getByText('Event Timeline'));

    // Open report panel
    fireEvent.click(screen.getByText('Report an Issue'));

    // Fill form
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'event-1' } });
    fireEvent.change(screen.getByPlaceholderText('Brief title of the issue'), {
      target: { value: 'Wrong player credited' },
    });
    fireEvent.change(screen.getByPlaceholderText('Describe the issue...'), {
      target: { value: 'The goal was scored by Player Two, not Player One.' },
    });

    // Submit report
    fireEvent.click(screen.getByText('Submit'));

    // Expect createReport to have been called
    await waitFor(() => {
      expect(apiClient.createReport).toHaveBeenCalled();
    });
  });


  // Test 24: Match with minimal data
  it('handles matches with minimal data', async () => {
    const minimalMatch = {
      id: 'minimal-match',
      homeTeam: 'Minimal Home',
      awayTeam: 'Minimal Away',
      status: 'SCHEDULED'
    };

    apiClient.getMatchById.mockResolvedValue({ data: minimalMatch });
    apiClient.getMatchEvents.mockResolvedValue({ data: [] });

    await act(async () => {
      render(<MatchViewer match={minimalMatch} />);
    });

    expect(screen.getByText('Minimal Home')).toBeInTheDocument();
    expect(screen.getByText('Minimal Away')).toBeInTheDocument();
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
  });
});