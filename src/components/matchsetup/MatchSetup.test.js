import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchSetup from './MatchSetup';
import { useUser } from '@clerk/clerk-react';

jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
}));

describe('MatchSetup Component', () => {
  const adminUser = { privateMetadata: { type: 'admin' } };
  const regularUser = { privateMetadata: { type: 'user' } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('non-admin user sees access denied', () => {
    useUser.mockReturnValue({ user: regularUser });
    render(<MatchSetup />);
    expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
  });

  test('admin can toggle match form', () => {
    useUser.mockReturnValue({ user: adminUser });
    render(<MatchSetup />);
    
    const toggleBtn = screen.getByText(/Create New Match/i);
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Create New Match/i)).toBeInTheDocument(); // Button changes to Cancel
    expect(screen.getByText(/Home Team/i)).toBeInTheDocument(); // Form inputs visible
  });

  test('admin can fill form inputs', () => {
    useUser.mockReturnValue({ user: adminUser });
    render(<MatchSetup />);
    fireEvent.click(screen.getByText(/Create New Match/i));

    const teamAInput = screen.getByPlaceholderText(/Home Team/i);
    const teamBInput = screen.getByPlaceholderText(/Away Team/i);
    const dateInput = screen.getByLabelText(/date/i) || screen.getByDisplayValue('');
    const timeInput = screen.getByLabelText(/time/i) || screen.getByDisplayValue('');
    const competitionInput = screen.getByPlaceholderText(/Competition/i);

    fireEvent.change(teamAInput, { target: { value: 'Team A' } });
    fireEvent.change(teamBInput, { target: { value: 'Team B' } });
    fireEvent.change(competitionInput, { target: { value: 'Premier League' } });

    expect(teamAInput.value).toBe('Team A');
    expect(teamBInput.value).toBe('Team B');
    expect(competitionInput.value).toBe('Premier League');
  });

  test('admin can add a match', () => {
    useUser.mockReturnValue({ user: adminUser });
    render(<MatchSetup />);
    fireEvent.click(screen.getByText(/Create New Match/i));

    fireEvent.change(screen.getByPlaceholderText(/Home Team/i), { target: { value: 'Team A' } });
    fireEvent.change(screen.getByPlaceholderText(/Away Team/i), { target: { value: 'Team B' } });
    fireEvent.change(screen.getByPlaceholderText(/Competition/i), { target: { value: 'Premier League' } });
    
    const createBtn = screen.getByText(/Create Match/i);
    fireEvent.click(createBtn);

    expect(screen.getByText(/Team A/i)).toBeInTheDocument();
    expect(screen.getByText(/Team B/i)).toBeInTheDocument();
    expect(screen.getByText(/Premier League/i)).toBeInTheDocument();
    expect(screen.getByText(/No matches scheduled yet/i)).not.toBeInTheDocument();
  });

  test('admin can remove a match', () => {
    useUser.mockReturnValue({ user: adminUser });
    render(<MatchSetup />);
    fireEvent.click(screen.getByText(/Create New Match/i));

    fireEvent.change(screen.getByPlaceholderText(/Home Team/i), { target: { value: 'Team A' } });
    fireEvent.change(screen.getByPlaceholderText(/Away Team/i), { target: { value: 'Team B' } });
    
    fireEvent.click(screen.getByText(/Create Match/i));
    
    const removeBtn = screen.getByText(/Remove/i);
    fireEvent.click(removeBtn);

    expect(screen.getByText(/No matches scheduled yet/i)).toBeInTheDocument();
  });

  test('matches list shows no matches initially', () => {
    useUser.mockReturnValue({ user: adminUser });
    render(<MatchSetup />);
    expect(screen.getByText(/No matches scheduled yet/i)).toBeInTheDocument();
  });
});
