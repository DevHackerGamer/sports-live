// __tests__/GlassAuthLayout.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import GlassAuthLayout from '../auth/GlassAuthLayout';

describe('GlassAuthLayout', () => {
  it('renders the title and tagline', () => {
    render(
      <GlassAuthLayout title="Sign In" tagline="Welcome back!">
        <div>Child Content</div>
      </GlassAuthLayout>
    );

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
  });

  it('renders children inside the layout', () => {
    render(
      <GlassAuthLayout title="Register" tagline="Create your account">
        <button>Submit</button>
      </GlassAuthLayout>
    );

    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('renders all background blur divs', () => {
    render(<GlassAuthLayout title="Test" tagline="Tagline" />);

    expect(document.querySelector('.glass-blur-1')).toBeInTheDocument();
    expect(document.querySelector('.glass-blur-2')).toBeInTheDocument();
    expect(document.querySelector('.glass-blur-3')).toBeInTheDocument();
  });
});