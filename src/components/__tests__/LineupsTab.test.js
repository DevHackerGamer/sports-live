import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LineupsTab from '../matchViewer/LineupsTab';
import { apiClient } from '../../lib/api';

// Mock the apiClient
jest.mock('../../lib/api', () => ({
  apiClient: {
    getTeams: jest.fn(),
    getLineupsByMatch: jest.fn(),
  },
}));

describe('LineupsTab', () => {
  const match = {
    id: 'match1',
    homeTeam: { name: 'Team A', crest: 'home-logo.png' },
    awayTeam: { name: 'Team B', crest: 'away-logo.png' },
  };

  const teams = [
    { id: 'teamA', name: 'Team A', crest: 'teamA-logo.png' },
    { id: 'teamB', name: 'Team B', crest: 'teamB-logo.png' },
  ];

  const lineups = [
    {
      teamId: 'teamA',
      starters: [
        { _id: '1', name: 'Player A1', position: 'Forward', nationality: 'ENG' },
      ],
      substitutes: [
        { _id: '2', name: 'Player A2', position: 'Midfielder', nationality: 'ENG' },
      ],
    },
    {
      teamId: 'teamB',
      starters: [
        { _id: '3', name: 'Player B1', position: 'Defender', nationality: 'ESP' },
      ],
      substitutes: [
        { _id: '4', name: 'Player B2', position: 'Goalkeeper', nationality: 'ESP' },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', async () => {
    apiClient.getTeams.mockResolvedValue({ data: teams });
    apiClient.getLineupsByMatch.mockResolvedValue(lineups);

    render(<LineupsTab match={match} />);
    expect(screen.getByText(/Loading lineups/i)).toBeInTheDocument();
    await waitFor(() => screen.getByText('Team A'));
  });

  it('renders lineup tables when data is fetched', async () => {
    apiClient.getTeams.mockResolvedValue({ data: teams });
    apiClient.getLineupsByMatch.mockResolvedValue(lineups);

    render(<LineupsTab match={match} />);

    await waitFor(() => {
      // Team names
      expect(screen.getByText('Team A')).toBeInTheDocument();
      expect(screen.getByText('Team B')).toBeInTheDocument();

      // Starters
      expect(screen.getByText('Player A1')).toBeInTheDocument();
      expect(screen.getByText('Player B1')).toBeInTheDocument();

      // Substitutes
      expect(screen.getByText('Player A2')).toBeInTheDocument();
      expect(screen.getByText('Player B2')).toBeInTheDocument();
    });
  });

  it('shows error message if API fails', async () => {
    apiClient.getTeams.mockRejectedValue(new Error('API Error'));
    apiClient.getLineupsByMatch.mockResolvedValue([]);

    render(<LineupsTab match={match} />);

    await waitFor(() => {
      expect(screen.getByText(/Error: API Error/i)).toBeInTheDocument();
    });
  });

  it('shows no lineup data message if empty', async () => {
    apiClient.getTeams.mockResolvedValue({ data: teams });
    apiClient.getLineupsByMatch.mockResolvedValue([]);

    render(<LineupsTab match={match} />);

    await waitFor(() => {
      expect(screen.getByText(/No lineup data found/i)).toBeInTheDocument();
    });
  });

  it('uses matchDetails for team names and logos if provided', async () => {
    const matchDetails = {
      homeTeam: { name: 'Team A', crest: 'home-detail-logo.png' },
      awayTeam: { name: 'Team B', crest: 'away-detail-logo.png' },
    };
    apiClient.getTeams.mockResolvedValue({ data: teams });
    apiClient.getLineupsByMatch.mockResolvedValue(lineups);

    render(<LineupsTab match={match} matchDetails={matchDetails} />);

    await waitFor(() => {
      expect(screen.getByAltText('Team A').src).toContain('home-detail-logo.png');
      expect(screen.getByAltText('Team B').src).toContain('away-detail-logo.png');
    });
  });
});
