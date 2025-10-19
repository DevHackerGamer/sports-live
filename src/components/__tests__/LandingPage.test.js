// src/components/__tests__/LandingPage.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Fully mock react-router-dom before importing LandingPage
jest.mock('react-router-dom', () => ({
  __esModule: true,
  Link: ({ children }) => <span>{children}</span>, // use span instead of <a>
}));

// Mock LandingFooter to isolate LandingPage
jest.mock('../landing/LandingFooter', () => () => <footer>Mock Footer</footer>);

import LandingPage from '../landing/LandingPage';

describe('LandingPage Component', () => {
  beforeEach(() => {
    render(<LandingPage />);
  });

  test('renders features section with all icons and titles', () => {
    expect(screen.getByText(/Why Choose SportsLive\?/i)).toBeInTheDocument();
    const featuresIcons = ['⚽', '📊', '🏆', '🔵', '📰', '❤️'];
    const featuresTitles = [
      'Live Match Updates',
      'Player Statistics',
      'Team Standings',
      'Team Information',
      'Football News',
      'Personalized Experience',
    ];

    featuresIcons.forEach(icon => expect(screen.getByText(icon)).toBeInTheDocument());
    featuresTitles.forEach(title => expect(screen.getByText(title)).toBeInTheDocument());
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
    leagueNames.forEach(name => expect(screen.getByAltText(name)).toBeInTheDocument());
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
