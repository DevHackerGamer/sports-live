import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// Ensure env is set BEFORE importing App (App reads env at module load)
process.env.REACT_APP_CLERK_PUBLISHABLE_KEY = 'test_publishable_key';

// Mock Clerk SDK used by App
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
jest.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
}));

// Mock child pages to keep App test focused on routing logic
jest.mock('./components/auth/LoginPage', () => () => <div>LoginPage Component</div>);
jest.mock('./components/dashboard/Dashboard', () => () => <div>Dashboard Component</div>);

// Now import App
import App from './App';

describe('App Component (auth gating)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows LoginPage when not signed in', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: true });
    mockUseUser.mockReturnValue({ user: null, isLoaded: true });

    render(<App />);
    expect(screen.getByText('LoginPage Component')).toBeInTheDocument();
  });

  test('shows Dashboard when signed in', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });
    mockUseUser.mockReturnValue({ user: { id: 'user_1' }, isLoaded: true });

    render(<App />);
    expect(screen.getByText('Dashboard Component')).toBeInTheDocument();
  });

  test('throws when publishable key is missing', () => {
    const prev = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
    // Temporarily unset key and re-require App fresh
    process.env.REACT_APP_CLERK_PUBLISHABLE_KEY = '';
    jest.resetModules();

    // Re-mock Clerk and children for fresh module load
    jest.doMock('@clerk/clerk-react', () => ({
      ClerkProvider: ({ children }) => <div>{children}</div>,
      useAuth: () => ({ isSignedIn: false, isLoaded: true }),
      useUser: () => ({ user: null, isLoaded: true }),
    }));

    const FreshApp = require('./App').default;
    expect(() => render(<FreshApp />)).toThrow('Missing Publishable Key');

    // Restore env and module state
    process.env.REACT_APP_CLERK_PUBLISHABLE_KEY = prev;
    jest.resetModules();
  });

  test('shows Loading while Clerk is not yet loaded', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: false });
    mockUseUser.mockReturnValue({ user: null, isLoaded: false });

    render(<App />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });
});
