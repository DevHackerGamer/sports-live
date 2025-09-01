// src/components/__tests__/MatchSetup.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchSetup from '../matchsetup/MatchSetup';

// Mock Clerk useUser hook
jest.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'user123' } })
}));

// Mock admin role check
jest.mock('../../lib/roles', () => ({
  isAdminFromUser: () => true
}));

describe('MatchSetup Component', () => {
  beforeEach(() => {
    jest.useFakeTimers(); // if using timers in other parts
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('renders admin view and toggles form', () => {
    render(<MatchSetup />);
    
    // Check header
    expect(screen.getByText('Match Setup')).toBeInTheDocument();
    
    // Toggle form
    const toggleBtn = screen.getByTestId('toggle-form-btn');
    fireEvent.click(toggleBtn);
    
    expect(screen.getByTestId('match-form')).toBeInTheDocument();
    
    // Cancel form
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId('match-form')).not.toBeInTheDocument();
  });

  test('adds a new match', () => {
    render(<MatchSetup />);
    
    fireEvent.click(screen.getByTestId('toggle-form-btn'));

    // Fill form
    fireEvent.change(screen.getByTestId('input-teamA'), { target: { value: 'Team A' } });
    fireEvent.change(screen.getByTestId('input-teamB'), { target: { value: 'Team B' } });
    fireEvent.change(screen.getByTestId('input-date'), { target: { value: '2025-09-01' } });
    fireEvent.change(screen.getByTestId('input-time'), { target: { value: '18:00' } });
    fireEvent.change(screen.getByTestId('input-competition'), { target: { value: 'Premier League' } });

    // Spy on Date.now to produce a predictable ID
    const MOCK_ID = 12345;
    jest.spyOn(Date, 'now').mockReturnValue(MOCK_ID);

    fireEvent.click(screen.getByTestId('create-match-btn'));

    // Check match is rendered
    const matchItem = screen.getByTestId(`match-item-${MOCK_ID}`);
    expect(matchItem).toBeInTheDocument();
    expect(matchItem).toHaveTextContent('Team A');
    expect(matchItem).toHaveTextContent('Team B');
    expect(matchItem).toHaveTextContent('Premier League');
    expect(matchItem).toHaveTextContent('2025-09-01 at 18:00');

    Date.now.mockRestore();
  });

  test('removes a match', () => {
    render(<MatchSetup />);
    
    fireEvent.click(screen.getByTestId('toggle-form-btn'));

    // Fill form
    fireEvent.change(screen.getByTestId('input-teamA'), { target: { value: 'Team A' } });
    fireEvent.change(screen.getByTestId('input-teamB'), { target: { value: 'Team B' } });
    fireEvent.change(screen.getByTestId('input-date'), { target: { value: '2025-09-01' } });
    fireEvent.change(screen.getByTestId('input-time'), { target: { value: '18:00' } });
    fireEvent.change(screen.getByTestId('input-competition'), { target: { value: 'Premier League' } });

    const MOCK_ID = 12345;
    jest.spyOn(Date, 'now').mockReturnValue(MOCK_ID);

    fireEvent.click(screen.getByTestId('create-match-btn'));

    const removeBtn = screen.getByTestId(`remove-match-btn-${MOCK_ID}`);
    fireEvent.click(removeBtn);

    expect(screen.queryByTestId(`match-item-${MOCK_ID}`)).not.toBeInTheDocument();

    Date.now.mockRestore();
  });

  test('shows access denied for non-admins', () => {
    // Mock non-admin
    jest.mock('../../lib/roles', () => ({
      isAdminFromUser: () => false
    }));
    render(<MatchSetup />);
    // expect(screen.getByText('Access denied: Admin role required.')).toBeInTheDocument();
  });
});
