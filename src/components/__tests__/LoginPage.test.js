/* eslint-disable testing-library/no-container */
/* eslint-disable testing-library/no-node-access */
import React from 'react';
import { render, screen } from '@testing-library/react';
import LoginPage from '../auth/LoginPage';
import { SignIn, SignUp } from '@clerk/clerk-react';
import '@testing-library/jest-dom'; // Import jest-dom for extended matchers

// Mock the Clerk components
jest.mock('@clerk/clerk-react', () => ({
  SignIn: jest.fn(() => null),
  SignUp: jest.fn(() => null)
}));

describe('LoginPage', () => {
  // Mock window.location before each test
  const mockLocation = new URL('http://localhost:3000');
  
  beforeEach(() => {
    delete window.location;
    window.location = mockLocation;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders branding section correctly', () => {
    render(<LoginPage />);
    
    // Check for logo and tagline
    expect(screen.getByText('SportsLive')).toBeInTheDocument();
    expect(screen.getByText('Real-time scores, highlights, and updates for your favorite teams and leagues.')).toBeInTheDocument();
    
    // Check for feature items
    expect(screen.getByText('Live game tracking')).toBeInTheDocument();
    expect(screen.getByText('Personalized dashboard')).toBeInTheDocument();
    expect(screen.getByText('Multi-league coverage')).toBeInTheDocument();
  });

  it('renders SignIn component by default', () => {
    render(<LoginPage />);
    expect(SignIn).toHaveBeenCalled();
    expect(SignUp).not.toHaveBeenCalled();
  });

  it('renders SignUp component when path includes sign-up', () => {
    // Update mock location to include sign-up
    window.location = new URL('http://localhost:3000/sign-up');
    
    render(<LoginPage />);
    expect(SignUp).toHaveBeenCalled();
    expect(SignIn).not.toHaveBeenCalled();
  });

  it('renders login container with correct structure', () => {
    const { container } = render(<LoginPage />);
    
    // Check for main container classes
    // eslint-disable-next-line testing-library/no-container
    expect(container.querySelector('.login-container')).toBeInTheDocument();
    expect(container.querySelector('.branding-section')).toBeInTheDocument();
    expect(container.querySelector('.login-section')).toBeInTheDocument();
    
    // Check nested structure
    expect(container.querySelector('.branding-content')).toBeInTheDocument();
    expect(container.querySelector('.login-content')).toBeInTheDocument();
  });
});
