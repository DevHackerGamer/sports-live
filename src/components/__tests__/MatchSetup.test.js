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

 


 
});