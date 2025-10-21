// src/components/__tests__/app.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../App';

// --- Mock Clerk behavior ---
let mockIsSignedIn = false;

jest.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }) => <>{children}</>,
  SignedIn: ({ children }) => (mockIsSignedIn ? <>{children}</> : null),
  SignedOut: ({ children }) => (!mockIsSignedIn ? <>{children}</> : null),
  useUser: () => ({
    isSignedIn: mockIsSignedIn,
    user: mockIsSignedIn ? { id: '1', fullName: 'Test User' } : null,
  }),
}));

// --- Mock child components used in App.js ---
jest.mock('../landing/LandingPage', () => () => <div>LandingPage</div>);
jest.mock('../dashboard/Dashboard', () => () => <div>Dashboard</div>);
jest.mock('../LeagueView/LeagueView', () => () => <div>LeagueView</div>);
jest.mock('../auth/SignInPage', () => () => <div>SignInPage</div>);
jest.mock('../auth/SignUpPage', () => () => <div>SignUpPage</div>);

describe('App routing and access control', () => {
  beforeEach(() => {
    jest.resetModules();
    window.history.pushState({}, '', '/'); // reset route before each
  });

  test('renders LandingPage when signed out', () => {
    mockIsSignedIn = false;
    render(<App />);
    expect(screen.getByText('LandingPage')).toBeInTheDocument();
  });

  test('renders SignInPage when signed out and on /sign-in', () => {
    mockIsSignedIn = false;
    window.history.pushState({}, '', '/sign-in');
    render(<App />);
    expect(screen.getByText('SignInPage')).toBeInTheDocument();
  });

  test('renders Dashboard when signed in', () => {
    mockIsSignedIn = true;
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('renders LeagueView when signed in and visiting /league/:id', () => {
    mockIsSignedIn = true;
    window.history.pushState({}, '', '/league/123');
    render(<App />);
    expect(screen.getByText('LeagueView')).toBeInTheDocument();
  });

  test('redirects signed-out user from /dashboard to /', async () => {
    mockIsSignedIn = false;
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('LandingPage')).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe('/'); // redirect check
  });

  test('redirects signed-in user from /sign-in to /dashboard', async () => {
    mockIsSignedIn = true;
    window.history.pushState({}, '', '/sign-in');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    expect(window.location.pathname).toMatch(/^\/dashboard\/?/);
  });

  test('renders SignInPage on Clerk subroute /sign-in/verify when signed out', async () => {
    mockIsSignedIn = false;
    window.history.pushState({}, '', '/sign-in/verify');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('SignInPage')).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe('/sign-in/verify');
  });

  test('renders SignUpPage on Clerk subroute /sign-up/verify when signed out', async () => {
    mockIsSignedIn = false;
    window.history.pushState({}, '', '/sign-up/verify');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('SignUpPage')).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe('/sign-up/verify');
  });

  test('redirects unknown paths to /', async () => {
    mockIsSignedIn = false;
    window.history.pushState({}, '', '/unknown-route');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('LandingPage')).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe('/');
  });
});