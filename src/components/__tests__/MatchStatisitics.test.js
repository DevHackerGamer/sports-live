import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MatchStatistics from '../matchViewer/MatchStatistics';
import { apiClient } from '../../lib/api';

// Mock apiClient
jest.mock('../../lib/api', () => ({
  apiClient: {
    getMatchStatistics: jest.fn(),
  },
}));

describe('MatchStatistics', () => {
  const match = {
    id: 'match1',
    homeTeam: { name: 'Team A' },
    awayTeam: { name: 'Team B' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    apiClient.getMatchStatistics.mockResolvedValue({});
    render(<MatchStatistics match={match} />);
    expect(screen.getByText(/Loading statistics/i)).toBeInTheDocument();
    await waitFor(() => screen.getByText(/Match Statistics/i));
  });

  it('renders error state when API fails', async () => {
    apiClient.getMatchStatistics.mockRejectedValue(new Error('API Error'));
    render(<MatchStatistics match={match} />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to load statistics/i)).toBeInTheDocument();
    });
  });

  it('renders "no statistics" message when API returns null', async () => {
    apiClient.getMatchStatistics.mockResolvedValue(null);
    render(<MatchStatistics match={match} />);

    await waitFor(() => {
      expect(screen.getByText(/No statistics available/i)).toBeInTheDocument();
    });
  });

  it('renders statistics correctly when API returns data', async () => {
    const stats = {
      possession: { home: 55, away: 45 },
      shotsOnTarget: { home: 4, away: 3 },
      totalShots: { home: 10, away: 8 },
      corners: { home: 5, away: 2 },
      fouls: { home: 8, away: 10 },
      yellowCards: { home: 1, away: 2 },
      redCards: { home: 0, away: 1 },
      lastUpdated: Date.now()
    };

    apiClient.getMatchStatistics.mockResolvedValue(stats);
    render(<MatchStatistics match={match} />);

    await waitFor(() => {
      expect(screen.getByText(/Possession/i)).toBeInTheDocument();
      expect(screen.getByText('55%')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();

      expect(screen.getByText(/Shots on Target/i)).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      expect(screen.getByText('Team A')).toBeInTheDocument();
      expect(screen.getByText('Team B')).toBeInTheDocument();

      expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    });
  });

  it('does not call API when match is null', () => {
    render(<MatchStatistics match={null} />);
    expect(apiClient.getMatchStatistics).not.toHaveBeenCalled();
  });
});
