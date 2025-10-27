// __tests__/SignInPage.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import SignInPage from '../auth/SignInPage';

// Mock Clerk components
jest.mock('@clerk/clerk-react', () => {
  const React = require('react');
  return {
    SignIn: (props) => <div data-testid="mock-signin">Mock SignIn Component</div>,
  };
});

// Mock GlassAuthLayout
jest.mock('../auth/GlassAuthLayout', () => {
  const React = require('react');
  return ({ children }) => <div data-testid="mock-glass-layout">{children}</div>;
});

describe('SignInPage', () => {
  it('renders the GlassAuthLayout', () => {
    render(<SignInPage />);
    expect(screen.getByTestId('mock-glass-layout')).toBeInTheDocument();
  });

  it('renders the SignIn component inside GlassAuthLayout', () => {
    render(<SignInPage />);
    expect(screen.getByTestId('mock-signin')).toBeInTheDocument();
  });
});