import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  __esModule: true,
  Link: ({ children }) => <span>{children}</span>,
}));

// Mock LandingFooter
jest.mock('../landing/LandingFooter', () => () => <footer>Mock Footer</footer>);

import LandingPage from '../landing/LandingPage';

describe('LandingPage Component', () => {
  beforeEach(() => {
    render(<LandingPage />);
  });

  test('renders hero section with title and CTA buttons', () => {
    expect(screen.getByText(/Welcome to SportsLive/i)).toBeInTheDocument();
    expect(screen.getByText(/Join Now/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
  });

  test('renders features section with all titles and descriptions', () => {
    expect(screen.getByText(/Why Choose SportsLive\?/i)).toBeInTheDocument();

    const features = [
      'Live Match Updates',
      'Player Statistics',
      'Team Standings',
      'Team Information',
      'Football News',
      'Personalized Experience',
    ];

    features.forEach(title => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });

    // Check that we have 6 feature cards rendered
    const featureCards = screen.getAllByRole('heading', { level: 3 });
    expect(featureCards.length).toBe(6);
  });

  test('renders league cards with all league images', () => {
    expect(screen.getByText(/Comprehensive League Coverage/i)).toBeInTheDocument();

    const leagueNames = [
      'Premier League',
      'La Liga',
      'Serie A',
      'Bundesliga',
      'Ligue 1',
      'Champions League',
    ];

    leagueNames.forEach(name => {
      const img = screen.getByAltText(name);
      expect(img).toBeInTheDocument();
    });
  });

  test('renders CTA section with title, description, and buttons', () => {
    expect(
      screen.getByText(/Ready to Experience Football Like Never Before\?/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Join Now/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Sign In/i).length).toBeGreaterThanOrEqual(1);
  });

  test('renders footer', () => {
    expect(screen.getByText(/Mock Footer/i)).toBeInTheDocument();
  });
});
