import React from 'react';
import { render, screen } from '@testing-library/react';
import LoginPage from '../auth/LoginPage';

// Mock Clerk components so we don't render real auth UI
jest.mock('@clerk/clerk-react', () => ({
  SignIn: () => <div data-testid="sign-in">SignIn Component</div>,
  SignUp: () => <div data-testid="sign-up">SignUp Component</div>,
}));

describe('LoginPage', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location for each test
    delete window.location;
    window.location = { pathname: '/' };
  });

  afterAll(() => {
    // Restore original window.location
    window.location = originalLocation;
  });

  test('renders branding content', () => {
    render(<LoginPage />);
    expect(screen.getByTestId('branding-logo')).toHaveTextContent('SportsLive');
    expect(screen.getByTestId('branding-tagline')).toHaveTextContent(
      'Real-time scores, highlights, and updates for your favorite teams and leagues.'
    );
    expect(screen.getByTestId('feature-live')).toBeInTheDocument();
    expect(screen.getByTestId('feature-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('feature-multi-league')).toBeInTheDocument();
  });

  test('renders SignIn when pathname does not include "sign-up"', () => {
    window.location.pathname = '/login';
    render(<LoginPage />);
    expect(screen.getByTestId('sign-in')).toBeInTheDocument();
  });

  test('renders SignUp when pathname includes "sign-up"', () => {
    window.location.pathname = '/sign-up';
    render(<LoginPage />);
    expect(screen.getByTestId('sign-up')).toBeInTheDocument();
  });
});
