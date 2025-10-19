/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LiveSports from '../sports/LiveSports';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';
import { useLiveSports } from '../../hooks/useLiveSports';

jest.mock('@clerk/clerk-react');
jest.mock('../../lib/api');
jest.mock('../../hooks/useLiveSports');

describe('LiveSports Component', () => {
  const mockUser = { id: 'u1', firstName: 'John' };
  const mockGame = {
    id: 'g1',
    homeTeam: { name: 'TeamA' },
    awayTeam: { name: 'TeamB' },
    competition: 'League1',
    status: 'live',
    utcDate: new Date().toISOString(),
    homeScore: 1,
    awayScore: 2,
    minute: 5
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockReturnValue({ user: mockUser });
  });

  it('renders loading state when sportsData is null', () => {
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: true,
      error: null,
      lastUpdated: null,
      refreshData: jest.fn()
    });

    render(<LiveSports />);
    expect(screen.getByText(/Loading live matches/i)).toBeInTheDocument();
  });

  it('renders error state and allows retry', () => {
    const refreshMock = jest.fn();
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: false,
      error: true,
      lastUpdated: null,
      refreshData: refreshMock
    });

    render(<LiveSports />);
    expect(screen.getByText(/Connection Error/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Retry/i));
    expect(refreshMock).toHaveBeenCalled();
  });

  it('renders empty state when no matches', () => {
    useLiveSports.mockReturnValue({
      sportsData: { games: [], totalMatches: 0 },
      isConnected: true,
      error: null,
      lastUpdated: null,
      refreshData: jest.fn()
    });

    render(<LiveSports />);
    expect(screen.getByText(/No matches available/i)).toBeInTheDocument();
  });

  it('renders match card correctly', () => {
    useLiveSports.mockReturnValue({
      sportsData: { 
        games: [mockGame],
        dateFrom: new Date().toISOString(),
        dateTo: new Date().toISOString(),
        totalMatches: 1
      },
      isConnected: true,
      error: null,
      lastUpdated: new Date(),
      refreshData: jest.fn()
    });

    render(<LiveSports />);

    const matchCard = screen.getByText(/TeamA/i).closest('.ls-match-card');
    expect(matchCard).toBeInTheDocument();
    expect(matchCard).toHaveTextContent(/TeamB/);
    expect(matchCard).toHaveTextContent(/LIVE/i);
  });

  it('opens TeamInfo view when a team is clicked', () => {
    useLiveSports.mockReturnValue({
      sportsData: { games: [mockGame], dateFrom: new Date(), dateTo: new Date() },
      isConnected: true,
      error: null,
      lastUpdated: null,
      refreshData: jest.fn()
    });

    render(<LiveSports />);
    fireEvent.click(screen.getByText(/TeamA/i));
    expect(screen.getByText(/Back/i)).toBeInTheDocument();
  });

  it('adds a match to watchlist', async () => {
    apiClient.addUserMatch = jest.fn().mockResolvedValue({});
    useLiveSports.mockReturnValue({
      sportsData: { games: [mockGame], dateFrom: new Date(), dateTo: new Date() },
      isConnected: true,
      error: null,
      lastUpdated: null,
      refreshData: jest.fn()
    });

    render(<LiveSports />);
    const matchCard = screen.getByText(/TeamA/i).closest('.ls-match-card');

    fireEvent.mouseEnter(matchCard);
    const watchlistBtn = await screen.findByText('+ Watchlist');
    fireEvent.click(watchlistBtn);

    await waitFor(() => {
      expect(apiClient.addUserMatch).toHaveBeenCalledWith(mockUser.id, mockGame);
    });
  });

  it('refresh buttons trigger refreshData', () => {
    const refreshMock = jest.fn();
    useLiveSports.mockReturnValue({
      sportsData: { games: [mockGame], dateFrom: new Date(), dateTo: new Date() },
      isConnected: true,
      error: null,
      lastUpdated: null,
      refreshData: refreshMock
    });

    render(<LiveSports />);
    const refreshButtons = screen.getAllByText(/Refresh/i);
    refreshButtons.forEach(btn => fireEvent.click(btn));
    expect(refreshMock).toHaveBeenCalledTimes(refreshButtons.length);
  });

  it('computes live match minutes if missing', async () => {
    const now = new Date();
    const nowISO = now.toISOString();

    const liveGame = {
      ...mockGame,
      status: 'IN_PLAY', // ensure it is treated as live
      utcDate: nowISO,
      minute: null
    };

    useLiveSports.mockReturnValue({
      sportsData: { games: [liveGame], totalMatches: 1 },
      isConnected: true,
      error: null,
      lastUpdated: now,
      refreshData: jest.fn()
    });

    render(<LiveSports />);

    const homeTeamEl = await screen.findByText(/TeamA/i);
    const matchCard = homeTeamEl.closest('.ls-match-card');

    expect(matchCard).toBeInTheDocument();
    // check that minutes are displayed (fallback computation logic inside component)
    expect(matchCard).toHaveTextContent(/\d+'/);
  });
});
