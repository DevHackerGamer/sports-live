// __tests__/SignUpPage.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import SignUpPage from '../auth/SignUpPage';

// Mock Clerk components
jest.mock('@clerk/clerk-react', () => {
  const React = require('react');
  return {
    SignUp: (props) => <div data-testid="mock-signup">Mock SignUp Component</div>,
  };
});

// Mock GlassAuthLayout
jest.mock('../auth/GlassAuthLayout', () => {
  const React = require('react');
  return ({ children }) => <div data-testid="mock-glass-layout">{children}</div>;
});

describe('SignUpPage', () => {
  it('renders the GlassAuthLayout', () => {
    render(<SignUpPage />);
    expect(screen.getByTestId('mock-glass-layout')).toBeInTheDocument();
  });

  it('renders the SignUp component inside GlassAuthLayout', () => {
    render(<SignUpPage />);
    expect(screen.getByTestId('mock-signup')).toBeInTheDocument();
  });
});