import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MatchViewer from '../matchViewer/MatchViewer';
import * as ClerkReact from '@clerk/clerk-react';
import * as api from '../../lib/api';

// Mock Clerk
jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
}));

// Mock API client
jest.mock('../../lib/api', () => ({
  apiClient: {
    getMatchById: jest.fn(),
    getTeams: jest.fn(),
    createReport: jest.fn(),
    addMatchEvent: jest.fn(),
    updateMatch: jest.fn(),
  },
}));

// Mock child components
jest.mock('../liveInput/LiveInput', () => ({ isAdmin, match, onBackToMatch }) => (
  <div data-testid="live-input">
    Live Input - Admin: {isAdmin ? 'Yes' : 'No'} - Match: {match?.id}
    <button onClick={onBackToMatch}>Back to Match</button>
  </div>
));

jest.mock('../matchViewer/MatchStatistics', () => ({ match }) => (
  <div data-testid="match-statistics">
    Statistics for {match?.homeTeam} vs {match?.awayTeam}
  </div>
));

jest.mock('../matchViewer/LineupsTab', () => ({ match }) => (
  <div data-testid="lineups-tab">
    Lineups for {match?.homeTeam} vs {match?.awayTeam}
  </div>
));

jest.mock('../matchViewer/LiveCommentaryFeed', () => ({ matchId }) => (
  <div data-testid="live-commentary">
    Live Commentary for match {matchId}
  </div>
));

// Mock utilities
jest.mock('../../lib/leagueNames', () => ({
  getLeagueName: jest.fn((code) => code || 'Unknown League'),
}));

describe('MatchViewer Component', () => {
  const mockOnBack = jest.fn();
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
    homeScore: 2,
    awayScore: 1,
    status: 'live',
    competition: { name: 'Premier League', code: 'PL' },
    utcDate: '2024-01-15T15:00:00Z',
    venue: 'Emirates Stadium',
    matchday: 1,
    referee: 'Michael Oliver',
    events: [
      {
        id: 'event1',
        type: 'goal',
        minute: 23,
        team: 'Arsenal',
        player: 'Bukayo Saka',
        description: 'Goal - Arsenal - Bukayo Saka',
      },
      
      {
        id: 'event2',
        type: 'yellow_card',
        minute: 45,
        team: 'Chelsea',
        player: 'Reece James',
        description: 'Yellow Card - Chelsea - Reece James',
      },
    ],
  };

  const mockTeamsData = {
    data: [
      { _id: 'team1', name: 'Arsenal', crest: '/arsenal.png' },
      { _id: 'team2', name: 'Chelsea', crest: '/chelsea.png' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    ClerkReact.useUser.mockReturnValue({ user: mockUser });
    
    // Mock API responses
    api.apiClient.getMatchById.mockResolvedValue({ data: mockMatch });
    api.apiClient.getTeams.mockResolvedValue(mockTeamsData);
    api.apiClient.createReport.mockResolvedValue({});
    api.apiClient.addMatchEvent.mockResolvedValue({});
    api.apiClient.updateMatch.mockResolvedValue({});
    
    // Mock league names
    const { getLeagueName } = require('../../lib/leagueNames');
    getLeagueName.mockImplementation((code) => {
      const leagues = { PL: 'Premier League', UCL: 'Champions League' };
      return leagues[code] || code || 'Unknown League';
    });
  });

  it('renders loading state when only matchId is provided', () => {
    render(<MatchViewer matchId="match1" onBack={mockOnBack} />);

    expect(screen.getByText('Loading match details...')).toBeInTheDocument();
  });

  it('renders no match selected state', () => {
    render(<MatchViewer onBack={mockOnBack} />);

    expect(screen.getByText('Select a match from the Live Sports tab to view details')).toBeInTheDocument();
  });

  it('renders match details when match is provided', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    expect(screen.getByText('Match Overview')).toBeInTheDocument();
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText('Chelsea')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Home score
    expect(screen.getByText('1')).toBeInTheDocument(); // Away score
  });

  it('navigates between sections', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    // Default to details section
    expect(screen.getByText('Premier League')).toBeInTheDocument();

    // Navigate to statistics
    fireEvent.click(screen.getByText('Statistics'));
    expect(screen.getByTestId('match-statistics')).toBeInTheDocument();

    // Navigate to lineups
    fireEvent.click(screen.getByText('Lineups'));
    expect(screen.getByTestId('lineups-tab')).toBeInTheDocument();

    // Navigate to events
    fireEvent.click(screen.getByText('Event Timeline'));
    expect(screen.getByText('Match Events Timeline')).toBeInTheDocument();
  });

  it('shows admin sections for admin users', async () => {
    ClerkReact.useUser.mockReturnValue({ user: mockAdminUser });

    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    expect(screen.getByText('Update Events')).toBeInTheDocument();
    expect(screen.getByText('Live Input')).toBeInTheDocument();
  });

  it('hides admin sections for non-admin users', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    expect(screen.queryByText('Update Events')).not.toBeInTheDocument();
    expect(screen.queryByText('Live Input')).not.toBeInTheDocument();
  });

  it('fetches match details when matchId is provided', async () => {
    await act(async () => {
      render(<MatchViewer matchId="match1" onBack={mockOnBack} />);
    });

    await waitFor(() => {
      expect(api.apiClient.getMatchById).toHaveBeenCalledWith('match1');
    });
  });

  it('handles back button click', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    const backButton = screen.getByText('← Back');
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('displays match events timeline', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    fireEvent.click(screen.getByText('Event Timeline'));

    expect(screen.getByText('Goal - Arsenal - Bukayo Saka')).toBeInTheDocument();
    expect(screen.getByText('Yellow Card - Chelsea - Reece James')).toBeInTheDocument();
  });

  it('shows and hides event report panel', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    fireEvent.click(screen.getByText('Event Timeline'));

    const reportButton = screen.getByText('Report an Issue');
    fireEvent.click(reportButton);

    expect(screen.getByText('Report Event Issue')).toBeInTheDocument();
    expect(screen.getByText('Hide Report Panel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hide Report Panel'));

    expect(screen.queryByText('Report Event Issue')).not.toBeInTheDocument();
  });

  it('submits event report', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    fireEvent.click(screen.getByText('Event Timeline'));
    fireEvent.click(screen.getByText('Report an Issue'));

    // Fill report form
    const titleInput = screen.getByPlaceholderText('Brief title of the issue');
    const descriptionInput = screen.getByPlaceholderText('Describe the issue...');

    fireEvent.change(titleInput, { target: { value: 'Test Report' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

    const submitButton = screen.getByText('Submit');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(api.apiClient.createReport).toHaveBeenCalledWith({
      matchId: 'match1',
      eventId: '',
      title: 'Test Report',
      description: 'Test description',
    });
  });

  it('handles live input section for admin', async () => {
    ClerkReact.useUser.mockReturnValue({ user: mockAdminUser });

    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    fireEvent.click(screen.getByText('Live Input'));

    expect(screen.getByTestId('live-input')).toBeInTheDocument();
    expect(screen.getByText('Back to Match')).toBeInTheDocument();
  });

  it('updates match metadata as admin', async () => {
    ClerkReact.useUser.mockReturnValue({ user: mockAdminUser });

    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    fireEvent.click(screen.getByText('Update Events'));

    const refereeInput = screen.getByPlaceholderText('Referee');
    const venueInput = screen.getByPlaceholderText('Venue');

    fireEvent.change(refereeInput, { target: { value: 'Anthony Taylor' } });
    fireEvent.change(venueInput, { target: { value: 'Stamford Bridge' } });

    const saveButton = screen.getByText('Save Match Info');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    expect(api.apiClient.updateMatch).toHaveBeenCalledWith(
      'match1',
      { referee: 'Anthony Taylor', venue: 'Stamford Bridge' },
      { userType: 'admin' }
    );
  });

  it('adds new event as admin', async () => {
    ClerkReact.useUser.mockReturnValue({ user: mockAdminUser });

    // Mock players data
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ players: ['Bukayo Saka', 'Martin Ødegaard'] }),
    });

    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    fireEvent.click(screen.getByText('Update Events'));

    // Fill event form
    const timeInput = screen.getByPlaceholderText('Time (e.g., 23:45)');
    const teamSelect = screen.getByDisplayValue('Select Team');
    const typeSelect = screen.getByDisplayValue('Goal');
    const descriptionInput = screen.getByPlaceholderText('Event description');

    fireEvent.change(timeInput, { target: { value: '67:00' } });
    fireEvent.change(teamSelect, { target: { value: 'Arsenal' } });
    fireEvent.change(typeSelect, { target: { value: 'goal' } });
    fireEvent.change(descriptionInput, { target: { value: 'Great goal!' } });

    const addButton = screen.getByText('Add Event');
    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(api.apiClient.addMatchEvent).toHaveBeenCalledWith(
      'match1',
      {
        type: 'goal',
        time: '67:00',
        player: '',
        team: 'Arsenal',
        description: 'Great goal!',
      },
      { userType: 'admin' }
    );
  });

  it('handles API errors gracefully', async () => {
    api.apiClient.getMatchById.mockRejectedValue(new Error('Failed to fetch'));

    await act(async () => {
      render(<MatchViewer matchId="match1" onBack={mockOnBack} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(api.apiClient.getMatchById).toHaveBeenCalledTimes(2);
  });

  it('displays different match statuses correctly', async () => {
    const scheduledMatch = {
      ...mockMatch,
      status: 'scheduled',
      homeScore: 0,
      awayScore: 0,
    };

    await act(async () => {
      render(<MatchViewer match={scheduledMatch} onBack={mockOnBack} />);
    });

    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
  });

  it('shows live minute for live matches', async () => {
    const liveMatch = {
      ...mockMatch,
      status: 'live',
      minute: 23,
    };

    await act(async () => {
      render(<MatchViewer match={liveMatch} onBack={mockOnBack} />);
    });

    expect(screen.getByText("23'")).toBeInTheDocument();
  });

  it('toggles event list visibility', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    fireEvent.click(screen.getByText('Event Timeline'));

    const showMoreButton = screen.getByText('Show more');
    fireEvent.click(showMoreButton);

    expect(screen.getByText('Show less')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show less'));
    expect(screen.getByText('Show more')).toBeInTheDocument();
  });

  it('formats dates correctly', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    // Check if date is formatted (format depends on locale)
    expect(screen.getByText(/Monday/)).toBeInTheDocument();
    expect(screen.getByText(/January/)).toBeInTheDocument();
  });

  it('displays team crests', async () => {
    await act(async () => {
      render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
    });

    const crests = screen.getAllByRole('img');
    expect(crests[0]).toHaveAttribute('src', '/arsenal.png');
    expect(crests[1]).toHaveAttribute('src', '/chelsea.png');
  });

  it('shows empty events state', async () => {
    const matchWithoutEvents = {
      ...mockMatch,
      events: [],
    };

    await act(async () => {
      render(<MatchViewer match={matchWithoutEvents} onBack={mockOnBack} />);
    });

    fireEvent.click(screen.getByText('Event Timeline'));
    fireEvent.click(screen.getByText('Show more'));

    expect(screen.getByText('No events available for this match')).toBeInTheDocument();
  });

  it('matches snapshot with match data', async () => {
    await act(async () => {
      const { container } = render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
      expect(container).toMatchSnapshot();
    });
  });

  it('matches snapshot in loading state', () => {
    const { container } = render(<MatchViewer matchId="match1" onBack={mockOnBack} />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot with admin access', async () => {
    ClerkReact.useUser.mockReturnValue({ user: mockAdminUser });

    await act(async () => {
      const { container } = render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Event type canonicalization', () => {
    it('handles different event type formats', async () => {
      const matchWithVariedEvents = {
        ...mockMatch,
        events: [
          { type: 'GOAL', minute: 10, team: 'Arsenal', player: 'Player 1' },
          { type: 'yellow', minute: 20, team: 'Chelsea', player: 'Player 2' },
          { type: 'sub', minute: 30, team: 'Arsenal', player: 'Player 3' },
        ],
      };

      await act(async () => {
        render(<MatchViewer match={matchWithVariedEvents} onBack={mockOnBack} />);
      });

      fireEvent.click(screen.getByText('Event Timeline'));
      fireEvent.click(screen.getByText('Show more'));

      // Should handle different event type formats gracefully
      expect(screen.getByText(/Goal/)).toBeInTheDocument();
      expect(screen.getByText(/Yellow Card/)).toBeInTheDocument();
      expect(screen.getByText(/Substitution/)).toBeInTheDocument();
    });
  });

  describe('Live commentary section', () => {
    it('renders live commentary component', async () => {
      await act(async () => {
        render(<MatchViewer match={mockMatch} onBack={mockOnBack} />);
      });

      fireEvent.click(screen.getByText('Live Commentary'));

      expect(screen.getByTestId('live-commentary')).toBeInTheDocument();
      expect(screen.getByText(`Live Commentary for match ${mockMatch.id}`)).toBeInTheDocument();
    });
  });
});