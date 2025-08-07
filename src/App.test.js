import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock fetch
global.fetch = jest.fn();

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders sports live heading', () => {
    render(<App />);
    const heading = screen.getByText(/Sports Live/i);
    expect(heading).toBeInTheDocument();
  });

  test('renders all feature cards', () => {
    render(<App />);
    
    expect(screen.getByText(/Live Scores/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Statistics/i })).toBeInTheDocument();
    expect(screen.getByText(/Alerts/i)).toBeInTheDocument();
  });

  test('renders joke button', () => {
    render(<App />);
    const jokeButton = screen.getByText(/Get Dad Joke/i);
    expect(jokeButton).toBeInTheDocument();
  });

  test('fetches and displays joke when button is clicked', async () => {
    const mockJoke = { joke: 'Why did the chicken cross the road?', timestamp: '2025-01-01' };
    fetch.mockResolvedValueOnce({
      json: async () => mockJoke,
    });

    render(<App />);
    const jokeButton = screen.getByText(/Get Dad Joke/i);
    
    fireEvent.click(jokeButton);
    
    // Check loading state
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
    
    // Wait for joke to appear
    await waitFor(() => {
      expect(screen.getByText(/Why did the chicken cross the road\?/i)).toBeInTheDocument();
    });
    
    // Verify fetch was called
    expect(fetch).toHaveBeenCalledWith('/api/joke');
  });

  test('handles API error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));

    render(<App />);
    const jokeButton = screen.getByText(/Get Dad Joke/i);
    
    fireEvent.click(jokeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch joke/i)).toBeInTheDocument();
    });
  });
});
