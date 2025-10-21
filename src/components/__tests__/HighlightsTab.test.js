// __tests__/HighlightsTab.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HighlightsTab from '../HighlightsTab/HighlightsTab';
import { apiClient } from '../../lib/api';

// Mock apiClient
jest.mock('../../lib/api', () => ({
  apiClient: {
    getFootballHighlights: jest.fn(),
  },
}));

const mockVideos = [
  {
    videoId: 'abc123',
    title: 'Match Highlights 1',
    thumbnail: 'thumb1.jpg',
    channelTitle: 'Premier League',
  },
  {
    videoId: 'def456',
    title: 'Match Highlights 2',
    thumbnail: 'thumb2.jpg',
    channelTitle: 'Premier League',
  },
];

describe('HighlightsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    apiClient.getFootballHighlights.mockResolvedValue([]);
    render(<HighlightsTab />);
    expect(screen.getByText(/Loading highlights.../i)).toBeInTheDocument();
    await waitFor(() => expect(apiClient.getFootballHighlights).toHaveBeenCalled());
  });

  it('renders videos after API call', async () => {
    apiClient.getFootballHighlights.mockResolvedValue(mockVideos);
    render(<HighlightsTab />);

    await waitFor(() => {
      expect(screen.getByText('Match Highlights 1')).toBeInTheDocument();
      expect(screen.getByText('Match Highlights 2')).toBeInTheDocument();
      expect(screen.getAllByText('Premier League')).toHaveLength(3);
    });
  });

  it('handles API error', async () => {
    apiClient.getFootballHighlights.mockRejectedValue(new Error('API Error'));
    render(<HighlightsTab />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load highlights/i)).toBeInTheDocument();
      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });
  });

  it('changes league selection and shows corresponding videos', async () => {
    const championsVideos = [
      {
        videoId: 'xyz789',
        title: 'Champions Match',
        thumbnail: 'thumb3.jpg',
        channelTitle: 'Champions League',
      },
    ];

    apiClient.getFootballHighlights.mockImplementation((league) =>
      Promise.resolve(league === 'Champions League' ? championsVideos : mockVideos)
    );

    render(<HighlightsTab />);

    await waitFor(() => expect(screen.getByText('Match Highlights 1')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Select League/i), { target: { value: 'Champions League' } });

    await waitFor(() => {
      expect(screen.getByText('Champions Match')).toBeInTheDocument();
      expect(screen.queryByText('Match Highlights 1')).not.toBeInTheDocument();
    });
  });

  it('opens and closes modal when clicking a video', async () => {
    apiClient.getFootballHighlights.mockResolvedValue(mockVideos);
    render(<HighlightsTab />);

    await waitFor(() => screen.getByText('Match Highlights 1'));

    fireEvent.click(screen.getByText('Match Highlights 1'));

    expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument();
    expect(screen.getByTitle('Match Highlights 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '×' }));

    expect(screen.queryByTitle('Match Highlights 1')).not.toBeInTheDocument();
  });
});
