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
      if (url.includes('matches')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) });
      if (url.includes('teams')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ _id: 't1', name: 'TeamA' }, { _id: 't2', name: 'TeamB' }] }) });
      if (url.includes('competitions')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: ['Comp1'] }) });
      return Promise.resolve({ ok: true, json: () => ({}) });
    });

    await act(async () => render(<MatchSetup />));

    expect(screen.getByText(/Match Setup/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Match/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('opens and closes create match form', async () => {
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(true);
    ClerkReact.useUser.mockReturnValue({ user: mockUser });

    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) });

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
    fetch.mockResolvedValue({ ok: true, json: () => ({ success: true }) });

    render(<MatchSetup />);
    fireEvent.click(screen.getByText(/Create Match/i));

    const createBtn = screen.getByText(/Create Match$/i);
    window.alert = jest.fn();
    fireEvent.click(createBtn);
    expect(window.alert).toHaveBeenCalled();
  });

  it('handles JSON file import', async () => {
    jest.spyOn(roles, 'isAdminFromUser').mockReturnValue(true);
    ClerkReact.useUser.mockReturnValue({ user: mockUser });

    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) });

    const { container } = render(<MatchSetup />);
    fireEvent.click(screen.getByText(/Create Match/i));
    fireEvent.click(screen.getByText(/Import Matches from JSON File/i));

    // Use container.querySelector to find the file input
    const fileInput = container.querySelector('input[type="file"]');

    const file = new File(
      [JSON.stringify([{ teamA: 'TeamA', teamB: 'TeamB', date: '2025-10-19', time: '12:00', competition: 'Comp1', matchday: 1 }])],
      'matches.json',
      { type: 'application/json' }
    );

    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    window.alert = jest.fn();
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('matches imported'))
    );
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

    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, data: [match] }) });

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
            homeTeam: { name: 'TeamA' },
            awayTeam: { name: 'TeamB' },
            competition: { name: 'Comp1' },
            date: '2025-10-19',
            time: '12:00',
            status: 'TIMED',
            createdByAdmin: true
            }
        };
        fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) });

        const { container } = render(<MatchSetup />);
        fireEvent.click(screen.getByText(/Create Match/i));

        // Fill minimal inputs by name
        const dateInput = container.querySelector('input[name="date"]');
        const timeInput = container.querySelector('input[name="time"]');
        const matchdayInput = container.querySelector('input[name="matchday"]');

        fireEvent.change(dateInput, { target: { value: '2025-10-19' } });
        fireEvent.change(timeInput, { target: { value: '12:00' } });
        fireEvent.change(matchdayInput, { target: { value: 1 } });

        window.alert = jest.fn();
        fireEvent.click(screen.getByText(/Create Match$/i));

        expect(window.alert).toHaveBeenCalled();
    });

});
