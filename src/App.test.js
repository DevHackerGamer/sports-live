import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  MemoryRouter: ({ children }) => <div>{children}</div>,
  Link: ({ children }) => <div>{children}</div>,
}));

// Mock Clerk components
jest.mock('@clerk/clerk-react', () => ({
  SignIn: () => <div>SignIn</div>,
  SignUp: () => <div>SignUp</div>,
  useUser: () => ({ user: { id: 'test-user', email: 'test@example.com' } }),
  useAuth: () => ({ isSignedIn: true, getToken: async () => 'token' }),
}));

// Mock pages/components used by App if needed
jest.mock('./components/dashboard/Dashboard', () => () => <div>Dashboard</div>);
jest.mock('./components/landing/LandingPage', () => () => <div>LandingPage</div>);

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Example assertions
    expect(screen.getByText(/Dashboard|LandingPage/i)).toBeInTheDocument();
  });
});