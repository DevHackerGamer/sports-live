// src/components/dashboard/Dashboard.test.js
import React from 'react';
import { useUser } from '@clerk/clerk-react';

import { render, screen } from '@testing-library/react';
import Dashboard from '../dashboard/Dashboard';

// Mock Clerk hooks and components
jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
  useAuth: () => ({ getToken: async () => null, isSignedIn: true }),
  UserButton: () => <button>UserButton</button>,
}));

// Mock LiveSports component
jest.mock('../sports/LiveSports', () => () => <div>LiveSports Component</div>);


describe('Dashboard Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders user greeting with firstName', () => {
    useUser.mockReturnValue({ user: { firstName: 'Alice' } });

    render(<Dashboard />);
    expect(screen.getByText(/Welcome, Alice/i)).toBeTruthy();
    expect(screen.getByText(/Sports Live/i)).toBeTruthy();
    expect(screen.getByText(/Real-time football scores/i)).toBeTruthy();
    expect(screen.getByText('UserButton')).toBeTruthy();
    expect(screen.getByText('LiveSports Component')).toBeTruthy();
  });

  test('renders user greeting with fallback when no firstName', () => {
    useUser.mockReturnValue({ user: null });

    render(<Dashboard />);
    expect(screen.getByText(/Welcome, User/i)).toBeTruthy();
  });
});
