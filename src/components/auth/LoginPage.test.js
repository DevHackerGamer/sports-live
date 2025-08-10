// src/components/auth/LoginPage.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';

const mockSignInCreate = jest.fn();
const mockSignInAuthenticateWithRedirect = jest.fn();
const mockSignUpCreate = jest.fn();
const mockSetActive = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@clerk/clerk-react', () => ({
  useSignIn: () => ({
    signIn: {
      create: mockSignInCreate,
      authenticateWithRedirect: mockSignInAuthenticateWithRedirect,
    },
    setActive: mockSetActive,
  }),
  useSignUp: () => ({
    signUp: {
      create: mockSignUpCreate,
    },
  }),
  useAuth: () => ({
    isSignedIn: false,
    signOut: mockSignOut,
  }),
  useUser: () => ({
    user: null,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders sign-in form by default', () => {
    render(<LoginPage />);
    expect(screen.getByText(/Welcome Back/i)).toBeTruthy();
    expect(screen.getByLabelText(/Email/i)).toBeTruthy();
    expect(screen.getByLabelText(/Password/i)).toBeTruthy();
    expect(screen.queryByLabelText(/First Name/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeTruthy();
  });

  test('switches to sign-up form on clicking sign up button', () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText(/Sign up/i));
    expect(screen.getByText(/Create Account/i)).toBeTruthy();
    expect(screen.getByLabelText(/First Name/i)).toBeTruthy();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeTruthy();
  });

  test('shows error if passwords do not match on sign-up submit', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText(/Sign up/i));
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    expect(await screen.findByText(/Passwords do not match/i)).toBeTruthy();
  });

  test('calls signIn.create on sign-in submit', async () => {
    mockSignInCreate.mockResolvedValue({ status: 'complete', createdSessionId: 'abc123' });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockSignInCreate).toHaveBeenCalledWith({
        identifier: 'user@example.com',
        password: 'password123',
      });
      expect(mockSetActive).toHaveBeenCalledWith({ session: 'abc123' });
    });
  });

  test('calls signUp.create on sign-up submit', async () => {
    mockSignUpCreate.mockResolvedValue({ status: 'complete', createdSessionId: 'xyz789' });

    render(<LoginPage />);
    fireEvent.click(screen.getByText(/Sign up/i));

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(mockSignUpCreate).toHaveBeenCalledWith({
        emailAddress: 'john@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(mockSetActive).toHaveBeenCalledWith({ session: 'xyz789' });
    });
  });

  test('handles Google sign-in button click', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));

    await waitFor(() => {
      expect(mockSignInAuthenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_google',
        redirectUrl: '/',
        redirectUrlComplete: '/',
      });
    });
  });

  test('renders session issue banner if signed in but no user', () => {
    // Override useAuth and useUser for this test case
    jest.resetModules();
    jest.mock('@clerk/clerk-react', () => ({
      useSignIn: () => ({
        signIn: { create: jest.fn(), authenticateWithRedirect: jest.fn() },
        setActive: jest.fn(),
      }),
      useSignUp: () => ({ signUp: { create: jest.fn() } }),
      useAuth: () => ({ isSignedIn: true, signOut: mockSignOut }),
      useUser: () => ({ user: null }),
    }));

    const { default: LoginPageNew } = require('./LoginPage');

    render(<LoginPageNew />);
    expect(screen.getByText(/session issue/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Sign Out/i }));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
