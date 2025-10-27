import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MatchSetup from '../matchsetup/MatchSetup';
import * as ClerkReact from '@clerk/clerk-react';
import * as roles from '../../lib/roles';

// Mock useUser properly
jest.mock('@clerk/clerk-react', () => ({
  ...jest.requireActual('@clerk/clerk-react'),
  useUser: jest.fn(),
}));

// Mock MatchViewer to avoid full rendering
jest.mock('../matchViewer/MatchViewer', () => ({ match, onBack }) => (
  <div data-testid="match-viewer">
    <span>MatchViewer: {match.homeTeam?.name} vs {match.awayTeam?.name}</span>
    <button onClick={onBack}>Back</button>
  </div>
));

jest.spyOn(global, 'fetch');

describe('MatchSetup Component', () => {
  const mockUser = { id: 'user1' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders access denied if not admin', () => {
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(false);
    ClerkReact.useUser.mockReturnValue({ user: mockUser });

    render(<MatchSetup />);
    expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
  });

  it('renders admin screen and fetches data', async () => {
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(true);
    ClerkReact.useUser.mockReturnValue({ user: mockUser });

    fetch.mockImplementation((url) => {
      if (url.includes('matches')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          success: true, 
          data: [],
          provider: 'admin'
        }) 
      });
      if (url.includes('teams')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          data: [
            { _id: 't1', name: 'TeamA', crest: '/crest1.png' }, 
            { _id: 't2', name: 'TeamB', crest: '/crest2.png' }
          ] 
        }) 
      });
      if (url.includes('competitions')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          success: true, 
          data: ['Premier League [eng.1]', 'La Liga [esp.1]'] 
        }) 
      });
      return Promise.resolve({ ok: true, json: () => ({}) });
    });

    await act(async () => render(<MatchSetup />));

    expect(screen.getByText(/Match Setup/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Match/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/matches?provider=admin&limit=50&range=30&includePast=1');
  });

  it('opens and closes create match form', async () => {
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(true);
    ClerkReact.useUser.mockReturnValue({ user: mockUser });

    fetch.mockResolvedValue({ 
      ok: true, 
      json: () => Promise.resolve({ 
        success: true, 
        data: [],
        provider: 'admin'
      }) 
    });

    render(<MatchSetup />);

    const createBtn = screen.getByText(/Create Match/i);
    fireEvent.click(createBtn);
    expect(screen.getByText(/Create New Match/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Close Form/i));
    expect(screen.queryByText(/Create New Match/i)).not.toBeInTheDocument();
  });

  it('validates form before adding match', async () => {
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(true);
    ClerkReact.useUser.mockReturnValue({ user: mockUser });
    
    fetch.mockImplementation((url) => {
      if (url.includes('matches')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          success: true, 
          data: [],
          provider: 'admin'
        }) 
      });
      if (url.includes('teams')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          data: [
            { _id: 't1', name: 'TeamA', crest: '/crest1.png' }, 
            { _id: 't2', name: 'TeamB', crest: '/crest2.png' }
          ] 
        }) 
      });
      if (url.includes('competitions')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          success: true, 
          data: ['Premier League [eng.1]'] 
        }) 
      });
      return Promise.resolve({ ok: true, json: () => ({}) });
    });

    render(<MatchSetup />);
    fireEvent.click(screen.getByText(/Create Match/i));

    const createBtn = screen.getByText(/Create Match$/i);
    fireEvent.click(createBtn);
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/Home team is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Away team is required/i)).toBeInTheDocument();
    });
  });

  it('handles JSON file import', async () => {
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(true);
    ClerkReact.useUser.mockReturnValue({ user: mockUser });

    fetch.mockImplementation((url) => {
      if (url.includes('matches')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          success: true, 
          data: [],
          provider: 'admin'
        }) 
      });
      if (url.includes('teams')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          data: [
            { _id: 't1', name: 'TeamA', crest: '/crest1.png' }, 
            { _id: 't2', name: 'TeamB', crest: '/crest2.png' }
          ] 
        }) 
      });
      if (url.includes('competitions')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          success: true, 
          data: ['Premier League [eng.1]'] 
        }) 
      });
      return Promise.resolve({ ok: true, json: () => ({}) });
    });

    const { container } = render(<MatchSetup />);
    fireEvent.click(screen.getByText(/Create Match/i));
    fireEvent.click(screen.getByText(/Import Matches from JSON File/i));

    // Use container.querySelector to find the file input
    const fileInput = container.querySelector('input[type="file"]');

    const file = new File(
      [JSON.stringify([{ teamA: 'TeamA', teamB: 'TeamB', date: '2025-10-19', time: '12:00', competition: 'Premier League [eng.1]', matchday: 1 }])],
      'matches.json',
      { type: 'application/json' }
    );

    Object.defineProperty(fileInput, 'files', { value: [file] });
    
    // Mock the fetch for match creation during import
    fetch.mockImplementation((url, options) => {
      if (url === '/api/matches' && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              id: 'imported-match',
              homeTeam: { name: 'TeamA', id: 't1' },
              awayTeam: { name: 'TeamB', id: 't2' },
              competition: { name: 'Premier League [eng.1]' },
              date: '2025-10-19',
              time: '12:00',
              status: 'TIMED',
              createdByAdmin: true
            }
          })
        });
      }
      return Promise.resolve({ ok: true, json: () => ({}) });
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/Processing 1 of 1 matches/i)).toBeInTheDocument();
    });
  });

  it('updates IN_PLAY match minute', async () => {
    jest.useFakeTimers();
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(true);
    ClerkReact.useUser.mockReturnValue({ user: mockUser });

    const match = {
      id: 'm1',
      homeTeam: { name: 'TeamA' },
      awayTeam: { name: 'TeamB' },
      competition: { name: 'Comp1' },
      utcDate: new Date(Date.now() - 2 * 60000).toISOString(),
      status: 'IN_PLAY',
      createdByAdmin: true,
    };

    fetch.mockResolvedValue({ 
      ok: true, 
      json: () => Promise.resolve({ 
        success: true, 
        data: [match],
        provider: 'admin'
      }) 
    });

    render(<MatchSetup />);

    act(() => jest.advanceTimersByTime(60000));
    jest.useRealTimers();
  });

  it('adds and removes match (basic flow)', async () => {
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(true);
    ClerkReact.useUser.mockReturnValue({ user: mockUser });

    const mockResponse = {
      success: true,
      data: {
        id: 'm1',
        homeTeam: { name: 'TeamA', id: 't1' },
        awayTeam: { name: 'TeamB', id: 't2' },
        competition: { name: 'Premier League [eng.1]' },
        date: '2025-10-19',
        time: '12:00',
        status: 'TIMED',
        createdByAdmin: true
      }
    };
    
    fetch.mockImplementation((url) => {
      if (url.includes('matches?provider=admin')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          success: true, 
          data: [],
          provider: 'admin'
        }) 
      });
      if (url.includes('teams')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          data: [
            { _id: 't1', name: 'TeamA', crest: '/crest1.png' }, 
            { _id: 't2', name: 'TeamB', crest: '/crest2.png' }
          ] 
        }) 
      });
      if (url.includes('competitions')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          success: true, 
          data: ['Premier League [eng.1]'] 
        }) 
      });
      if (url === '/api/matches') return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve(mockResponse) 
      });
      return Promise.resolve({ ok: true, json: () => ({}) });
    });

    const { container } = render(<MatchSetup />);
    fireEvent.click(screen.getByText(/Create Match/i));

    // Fill form inputs
    const homeTeamSelect = container.querySelector('select[name="teamA"]');
    const awayTeamSelect = container.querySelector('select[name="teamB"]');
    const dateInput = container.querySelector('input[name="date"]');
    const timeInput = container.querySelector('input[name="time"]');
    const competitionSelect = container.querySelector('select[name="competition"]');

    fireEvent.change(homeTeamSelect, { target: { value: 't1' } });
    fireEvent.change(awayTeamSelect, { target: { value: 't2' } });
    fireEvent.change(dateInput, { target: { value: '2025-10-19' } });
    fireEvent.change(timeInput, { target: { value: '12:00' } });
    fireEvent.change(competitionSelect, { target: { value: 'Premier League [eng.1]' } });

    fireEvent.click(screen.getByText(/Create Match$/i));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/matches', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-User-Type': 'admin'
        })
      }));
    });
  });

  it('shows remove confirmation modal', async () => {
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(true);
    ClerkReact.useUser.mockReturnValue({ user: mockUser });

    const mockMatch = {
      id: 'm1',
      homeTeam: { name: 'TeamA' },
      awayTeam: { name: 'TeamB' },
      competition: { name: 'Premier League [eng.1]' },
      date: '2025-10-19',
      time: '12:00',
      status: 'TIMED',
      createdByAdmin: true
    };

    fetch.mockResolvedValue({ 
      ok: true, 
      json: () => Promise.resolve({ 
        success: true, 
        data: [mockMatch],
        provider: 'admin'
      }) 
    });

    render(<MatchSetup />);

    await waitFor(() => {
      expect(screen.getByText('TeamA')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);

    expect(screen.getByText('Remove Match')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('handles team selection click', async () => {
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(true);
    ClerkReact.useUser.mockReturnValue({ user: mockUser });

    const mockMatch = {
      id: 'm1',
      homeTeam: { name: 'TeamA' },
      awayTeam: { name: 'TeamB' },
      competition: { name: 'Premier League [eng.1]' },
      date: '2025-10-19',
      time: '12:00',
      status: 'TIMED',
      createdByAdmin: true
    };

    fetch.mockImplementation((url) => {
      if (url.includes('matches?provider=admin')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          success: true, 
          data: [mockMatch],
          provider: 'admin'
        }) 
      });
      if (url.includes('teams')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          data: [
            { _id: 't1', name: 'TeamA', crest: '/crest1.png' }, 
            { _id: 't2', name: 'TeamB', crest: '/crest2.png' }
          ] 
        }) 
      });
      if (url.includes('competitions')) return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          success: true, 
          data: ['Premier League [eng.1]'] 
        }) 
      });
      return Promise.resolve({ ok: true, json: () => ({}) });
    });

    const mockOnTeamSelect = jest.fn();
    render(<MatchSetup onTeamSelect={mockOnTeamSelect} />);

    await waitFor(() => {
      expect(screen.getByText('TeamA')).toBeInTheDocument();
    });

    const teamName = screen.getByText('TeamA');
    fireEvent.click(teamName);

    expect(mockOnTeamSelect).toHaveBeenCalledWith(expect.objectContaining({
      name: 'TeamA',
      crest: expect.any(String)
    }));
  });
});