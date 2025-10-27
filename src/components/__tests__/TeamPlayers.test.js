// src/__tests__/TeamPlayers.test.js
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeamInfo from "../TeamInfo/TeamInfo"; 
import TeamPlayers from '../TeamInfo/TeamPlayers'; 
import { apiClient } from '../../lib/api';

// Mock apiClient
jest.mock('../../lib/api', () => ({
  apiClient: {
    request: jest.fn(),
  },
}));

describe('TeamPlayers Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading text when fetching', async () => {
    apiClient.request.mockImplementation(() => new Promise(() => {})); // never resolves

    render(<TeamPlayers teamId="123" />);
    expect(screen.getByText(/loading players/i)).toBeInTheDocument();
  });

  test('shows "No players found" when API returns empty', async () => {
    apiClient.request.mockResolvedValue({ success: true, players: [] });

    render(<TeamPlayers teamId="123" />);

    await waitFor(() =>
      expect(screen.getByText(/no players found for this team/i)).toBeInTheDocument()
    );
  });

  test('renders player data when API returns players', async () => {
    apiClient.request.mockResolvedValue({
      success: true,
      players: [
        {
          _id: '1',
          name: 'John Doe',
          position: 'Forward',
          nationality: 'South Africa',
          dateOfBirth: '2000-01-01',
        },
      ],
    });

    render(<TeamPlayers teamId="123" />);

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/position:/i)).toHaveTextContent('Position');
    expect(screen.getByText(/nationality:/i)).toHaveTextContent('Nationality:');
    expect(screen.getByText(/age:/i)).toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    apiClient.request.mockRejectedValue(new Error('API error'));

    render(<TeamPlayers teamId="123" />);

    await waitFor(() =>
      expect(screen.getByText(/no players found for this team/i)).toBeInTheDocument()
    );
  });

  test('does not fetch players if no teamId provided', async () => {
    render(<TeamPlayers teamId={null} />);
    expect(screen.getByText(/no players found for this team/i)).toBeInTheDocument();
    expect(apiClient.request).not.toHaveBeenCalled();
  });
});