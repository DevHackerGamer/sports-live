import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MatchSetup from '../matchsetup/MatchSetup';
import * as ClerkReact from '@clerk/clerk-react';
import * as roles from '../../lib/roles';

// Mock Clerk
jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
}));

// Mock child components
jest.mock('../matchViewer/MatchViewer', () => ({ match, onBack, isAdmin }) => (
  <div data-testid="match-viewer">
    MatchViewer: {match.homeTeam?.name} vs {match.awayTeam?.name}
    <button onClick={onBack}>Back to Setup</button>
  </div>
));

// Mock utilities
jest.mock('../../lib/roles', () => ({
  isAdminFromUser: jest.fn(),
}));

jest.mock('../../lib/leagueNames', () => ({
  getLeagueName: jest.fn((name) => name || 'Unknown League'),
}));

describe('MatchSetup Component', () => {
  const mockOnTeamSelect = jest.fn();
  const mockOnMatchSelect = jest.fn();
  const mockUser = { id: 'user123', firstName: 'John' };

  const mockTeamsData = {
    data: [
      { _id: 'team1', name: 'Arsenal', crest: '/arsenal.png' },
      { _id: 'team2', name: 'Chelsea', crest: '/chelsea.png' },
      { _id: 'team3', name: 'Liverpool', crest: '/liverpool.png' },
    ],
  };

  const mockMatchesData = {
    success: true,
    provider: 'admin',
    data: [
      {
        id: 'match1',
        homeTeam: { name: 'Arsenal', id: 'team1' },
        awayTeam: { name: 'Chelsea', id: 'team2' },
        competition: { name: 'Premier League [eng.1]' },
        utcDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '15:00',
        status: 'TIMED',
        matchday: 1,
        createdByAdmin: true,
      },
    ],
  };

  const mockCompetitionsData = {
    success: true,
    data: ['Premier League [eng.1]', 'La Liga [esp.1]', 'Champions League [uefa.champions]'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    ClerkReact.useUser.mockReturnValue({ user: mockUser });
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(true);
    
    // Mock fetch responses
    global.fetch = jest.fn();
    fetch.mockImplementation((url) => {
      if (url.includes('/api/teams')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTeamsData),
        });
      }
      if (url.includes('/api/matches?provider=admin')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMatchesData),
        });
      }
      if (url.includes('/api/competitions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCompetitionsData),
        });
      }
      if (url.includes('/api/matches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              id: 'new-match',
              homeTeam: { name: 'Arsenal', id: 'team1' },
              awayTeam: { name: 'Chelsea', id: 'team2' },
              competition: { name: 'Premier League' },
              utcDate: new Date().toISOString(),
              date: new Date().toISOString().split('T')[0],
              time: '15:00',
              status: 'TIMED',
              matchday: 1,
              createdByAdmin: true,
            },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('renders access denied for non-admin users', () => {
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(false);

    render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);

    expect(screen.getByText('Access denied: Admin role required.')).toBeInTheDocument();
  });

  it('renders main interface for admin users', async () => {
    await act(async () => {
      render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    });

    expect(screen.getByText('Match Setup')).toBeInTheDocument();
    expect(screen.getByText('Create Match')).toBeInTheDocument();
    expect(screen.getByText('Scheduled Matches')).toBeInTheDocument();
  });

  it('fetches teams, matches, and competitions on mount', async () => {
    await act(async () => {
      render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/teams');
      expect(fetch).toHaveBeenCalledWith('/api/matches?provider=admin&limit=50&range=30&includePast=1');
      expect(fetch).toHaveBeenCalledWith('/api/competitions');
    });
  });

  it('shows and hides the create match form', async () => {
    await act(async () => {
      render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    });

    // Form should be hidden initially
    expect(screen.queryByText('Create New Match')).not.toBeInTheDocument();

    // Show form
    const createButton = screen.getByText('Create Match');
    fireEvent.click(createButton);

    expect(screen.getByText('Create New Match')).toBeInTheDocument();
    expect(screen.getByText('Close Form')).toBeInTheDocument();

    // Hide form
    fireEvent.click(screen.getByText('Close Form'));

    expect(screen.queryByText('Create New Match')).not.toBeInTheDocument();
  });

  it('validates form before submitting', async () => {
    await act(async () => {
      render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    });

    // Show form
    fireEvent.click(screen.getByText('Create Match'));

    // Try to submit empty form
    const submitButton = screen.getByText('Create Match');
    fireEvent.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Home team is required')).toBeInTheDocument();
      expect(screen.getByText('Away team is required')).toBeInTheDocument();
      expect(screen.getByText('Date is required')).toBeInTheDocument();
      expect(screen.getByText('Time is required')).toBeInTheDocument();
      expect(screen.getByText('Competition is required')).toBeInTheDocument();
    });
  });

  
  it('handles team selection from match cards', async () => {
    await act(async () => {
      render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Arsenal')).toBeInTheDocument();
    });

    const teamCrests = screen.getAllByAltText(/crest/);
    fireEvent.click(teamCrests[0]);

    expect(mockOnTeamSelect).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Arsenal',
      crest: expect.any(String),
    }));
  });

  it('handles match selection', async () => {
    await act(async () => {
      render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Arsenal')).toBeInTheDocument();
    });

    const matchCard = screen.getByText('Arsenal').closest('.ms-match-card');
    fireEvent.click(matchCard);

    expect(mockOnMatchSelect).toHaveBeenCalledWith(mockMatchesData.data[0]);
  });

  it('shows match viewer when match is selected', async () => {
    await act(async () => {
      render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Arsenal')).toBeInTheDocument();
    });

    const matchCard = screen.getByText('Arsenal').closest('.ms-match-card');
    fireEvent.click(matchCard);

    expect(screen.getByTestId('match-viewer')).toBeInTheDocument();
    expect(screen.getByText('Back to Setup')).toBeInTheDocument();
  });


  it('cancels remove confirmation', async () => {
    await act(async () => {
      render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Arsenal')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Remove Match')).not.toBeInTheDocument();
  });

  

  it('shows loading state while fetching matches', async () => {
    // Delay the matches response
    fetch.mockImplementation((url) => {
      if (url.includes('/api/matches?provider=admin')) {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockMatchesData),
          }), 100);
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);

    expect(screen.getByText('Loading matches...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading matches...')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no matches exist', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('/api/matches?provider=admin')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    await act(async () => {
      render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    });

    expect(screen.getByText('No matches scheduled yet.')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('/api/teams')) {
        return Promise.reject(new Error('Failed to fetch teams'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    await act(async () => {
      render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    });

    // Should still render without crashing
    expect(screen.getByText('Match Setup')).toBeInTheDocument();
  });

  it('validates matchday input', async () => {
    await act(async () => {
      render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    });

    fireEvent.click(screen.getByText('Create Match'));

    const matchdayInput = screen.getByPlaceholderText('Matchday (optional)');
    fireEvent.change(matchdayInput, { target: { value: '0' } });

    const submitButton = screen.getByText('Create Match');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Matchday must be a number greater than 0')).toBeInTheDocument();
    });
  });

  it('validates team uniqueness', async () => {
    await act(async () => {
      render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    });

    fireEvent.click(screen.getByText('Create Match'));

    const homeTeamSelect = screen.getByDisplayValue('Select Home Team');
    const awayTeamSelect = screen.getByDisplayValue('Select Away Team');

    // Select same team for both home and away
    fireEvent.change(homeTeamSelect, { target: { value: 'team1' } });
    fireEvent.change(awayTeamSelect, { target: { value: 'team1' } });

    const submitButton = screen.getByText('Create Match');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Home and Away teams must be different')).toBeInTheDocument();
    });
  });



  it('matches snapshot with admin access', async () => {
    await act(async () => {
      const { container } = render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
      expect(container).toMatchSnapshot();
    });
  });

  it('matches snapshot with non-admin access', () => {
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(false);

    const { container } = render(<MatchSetup onTeamSelect={mockOnTeamSelect} onMatchSelect={mockOnMatchSelect} />);
    expect(container).toMatchSnapshot();
  });



  
  
});