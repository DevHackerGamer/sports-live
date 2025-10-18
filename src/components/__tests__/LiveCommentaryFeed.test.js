import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LiveCommentaryFeed from '../matchViewer/LiveCommentaryFeed';
import { apiClient } from '../../lib/api';

// Mock apiClient
jest.mock('../../lib/api', () => ({
  apiClient: {
    getCommentary: jest.fn(),
  },
}));

describe('LiveCommentaryFeed', () => {
  const matchId = 'match1';
  const comments = [
    { id: 'c1', time: '12:00', text: 'Kickoff!' },
    { id: 'c2', time: '15:23', text: 'Goal by Team A' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading initially', async () => {
    apiClient.getCommentary.mockResolvedValue(comments);
    render(<LiveCommentaryFeed matchId={matchId} />);
    expect(screen.getByText(/Loading commentary/i)).toBeInTheDocument();
    await waitFor(() => screen.getByText('🎙 Live Commentary'));
  });

  it('renders commentary items after fetch', async () => {
    apiClient.getCommentary.mockResolvedValue(comments);
    render(<LiveCommentaryFeed matchId={matchId} />);

    await waitFor(() => {
      expect(screen.getByText('🎙 Live Commentary')).toBeInTheDocument();
      expect(screen.getByText('Kickoff!')).toBeInTheDocument();
      expect(screen.getByText('Goal by Team A')).toBeInTheDocument();
      expect(screen.getByText('12:00')).toBeInTheDocument();
      expect(screen.getByText('15:23')).toBeInTheDocument();
    });
  });

  it('renders "no commentary" message when empty', async () => {
    apiClient.getCommentary.mockResolvedValue([]);
    render(<LiveCommentaryFeed matchId={matchId} />);

    await waitFor(() => {
      expect(screen.getByText(/No commentary yet/i)).toBeInTheDocument();
    });
  });

  it('does not crash if matchId is undefined', () => {
    render(<LiveCommentaryFeed />);
    expect(screen.queryByText(/Loading commentary/i)).not.toBeInTheDocument();
  });

  it('calls apiClient.getCommentary with correct matchId', async () => {
    apiClient.getCommentary.mockResolvedValue([]);
    render(<LiveCommentaryFeed matchId={matchId} />);
    await waitFor(() => expect(apiClient.getCommentary).toHaveBeenCalledWith(matchId));
  });
});
