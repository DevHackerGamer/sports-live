// __tests__/App.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock Clerk components
jest.mock('@clerk/clerk-react', () => {
  const React = require('react');
  return {
    ClerkProvider: ({ children }) => <div>{children}</div>,
    SignedIn: ({ children }) => <div data-testid="signed-in">{children}</div>,
    SignedOut: ({ children }) => <div data-testid="signed-out">{children}</div>,
  };
});

// Mock Pages
jest.mock('../components/landing/LandingPage', () => () => <div>LandingPage</div>);
jest.mock('../components/dashboard/Dashboard', () => () => <div>Dashboard</div>);
jest.mock('../components/LeagueView/LeagueView', () => () => <div>LeagueView</div>);
jest.mock('../components/auth/SignInPage', () => () => <div>SignInPage</div>);
jest.mock('../components/auth/SignUpPage', () => () => <div>SignUpPage</div>);

describe('App routing', () => {
  it('renders LandingPage for "/" when signed out', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('LandingPage')).toBeInTheDocument();
  });

  it('renders SignInPage for "/sign-in" when signed out', () => {
    render(
      <MemoryRouter initialEntries={['/sign-in']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('SignInPage')).toBeInTheDocument();
  });

  it('renders SignUpPage for "/sign-up" when signed out', () => {
    render(
      <MemoryRouter initialEntries={['/sign-up']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('SignUpPage')).toBeInTheDocument();
  });

  it('renders Dashboard for protected route "/dashboard" when signed in', () => {
    // Override SignedIn to render children
    jest.mocked(require('@clerk/clerk-react').SignedIn).mockImplementation(({ children }) => <>{children}</>);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders LeagueView for protected route "/league/:id" when signed in', () => {
    jest.mocked(require('@clerk/clerk-react').SignedIn).mockImplementation(({ children }) => <>{children}</>);

    render(
      <MemoryRouter initialEntries={['/league/123']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('LeagueView')).toBeInTheDocument();
  });

  it('redirects unknown route "*" to "/"', () => {
    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('LandingPage')).toBeInTheDocument();
  });
});
