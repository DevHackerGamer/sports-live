// __tests__/FootballNewsPage.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FootballNewsPage from '../FootballNews/FootballNews';
import { apiClient } from '../../lib/api';

jest.mock('../../lib/api', () => ({
  apiClient: {
    request: jest.fn(),
  },
}));

const mockNews = [
  {
    _id: '1',
    headline: 'Big Match Tonight',
    description: 'Exciting match preview',
    byline: 'Reporter',
    published: new Date().toISOString(),
    link: 'https://example.com/news1',
    images: [{ url: 'https://example.com/img1.jpg', caption: 'Match Image' }],
    categories: ['Preview', 'Matchday'],
  },
  {
    _id: '2',
    headline: 'Transfer Rumors',
    description: 'Latest transfer news',
    byline: '',
    published: new Date().toISOString(),
    link: 'https://example.com/news2',
    images: [],
    categories: [],
  },
];

describe('FootballNewsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    apiClient.request.mockResolvedValue([]);
    render(<FootballNewsPage />);
    expect(screen.getByText(/Loading latest news/i)).toBeInTheDocument();
    await waitFor(() => expect(apiClient.request).toHaveBeenCalled());
  });

  it('renders news articles after fetch', async () => {
    apiClient.request.mockResolvedValue(mockNews);
    render(<FootballNewsPage />);
    await waitFor(() => {
      expect(screen.getByText('Big Match Tonight')).toBeInTheDocument();
      expect(screen.getByText('Transfer Rumors')).toBeInTheDocument();
    });
  });

  it('renders error state if fetch fails', async () => {
    apiClient.request.mockRejectedValue(new Error('Network error'));
    render(<FootballNewsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load news/i)).toBeInTheDocument();
      expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
    });
  });

  it('handles league selector change and refetches news', async () => {
    apiClient.request.mockResolvedValue(mockNews);
    render(<FootballNewsPage />);
    await waitFor(() => expect(screen.getByText('Big Match Tonight')).toBeInTheDocument());

    const select = screen.getByLabelText(/Filter by League/i);
    fireEvent.change(select, { target: { value: 'esp.1' } });

    expect(apiClient.request).toHaveBeenLastCalledWith(
      '/api/football-news?leagueCode=esp.1&limit=50'
    );
  });

  it('handles image load error and shows placeholder', async () => {
    apiClient.request.mockResolvedValue([{
      _id: '3',
      headline: 'Image Test',
      description: 'Testing image error',
      published: new Date().toISOString(),
      images: [{ url: 'invalid-url.jpg' }],
    }]);

    render(<FootballNewsPage />);
    const img = await screen.findByRole('img');
    
    fireEvent.error(img);
    const placeholder = screen.getByText(/No Image Available/i);
    expect(placeholder).toBeVisible();
  });

  it('renders no news message if API returns empty array', async () => {
    apiClient.request.mockResolvedValue([]);
    render(<FootballNewsPage />);
    await waitFor(() => {
      expect(screen.getByText(/No news available for this league/i)).toBeInTheDocument();
    });
  });

  it('renders back button if onBack prop is provided', () => {
    const onBack = jest.fn();
    render(<FootballNewsPage onBack={onBack} />);
    const backBtn = screen.getByText(/Back to Home/i);
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});
