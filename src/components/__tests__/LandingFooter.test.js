// src/components/landing/__tests__/LandingFooter.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingFooter from '../landing/LandingFooter';

// Mock CSS to avoid import errors
jest.mock('../../styles/LandingFooter.css', () => ({}));

describe('LandingFooter Component', () => {
  beforeEach(() => {
    render(<LandingFooter />);
  });

  test('renders main footer container', () => {
    const footer = screen.getByRole('contentinfo'); // <footer> element
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('landing-footer');
  });

  test('renders brand section with title and description', () => {
    const brandTitle = screen.getByText('SportsLive');
    const brandDesc = screen.getByText(/Your ultimate destination for real-time football updates/i);

    expect(brandTitle).toBeInTheDocument();
    expect(brandDesc).toBeInTheDocument();
  });

  test('renders About Us section with heading and text', () => {
    const aboutHeading = screen.getByText('About Us');
    const aboutText = screen.getByText(/We are passionate about bringing you the most comprehensive football coverage/i);

    expect(aboutHeading).toBeInTheDocument();
    expect(aboutText).toBeInTheDocument();
  });

  test('renders Follow Us section with heading', () => {
    const followHeading = screen.getByText('Follow Us');
    expect(followHeading).toBeInTheDocument();
  });

  test('renders all social links with correct href and aria-label', () => {
    const facebookLink = screen.getByRole('link', { name: /facebook/i });
    const twitterLink = screen.getByRole('link', { name: /twitter/i });
    const instagramLink = screen.getByRole('link', { name: /instagram/i });

    expect(facebookLink).toBeInTheDocument();
    expect(facebookLink).toHaveAttribute('href', 'https://facebook.com');
    expect(twitterLink).toBeInTheDocument();
    expect(twitterLink).toHaveAttribute('href', 'https://twitter.com');
    expect(instagramLink).toBeInTheDocument();
    expect(instagramLink).toHaveAttribute('href', 'https://instagram.com');
  });

    test('renders all SVG icons for social links', () => {
    const facebookSVG = screen.getByRole('link', { name: /facebook/i }).querySelector('svg');
    const twitterSVG = screen.getByRole('link', { name: /twitter/i }).querySelector('svg');
    const instagramSVG = screen.getByRole('link', { name: /instagram/i }).querySelector('svg');

    expect(facebookSVG).toBeInTheDocument();
    expect(twitterSVG).toBeInTheDocument();
    expect(instagramSVG).toBeInTheDocument();
    });


  test('renders divider element', () => {
    const divider = document.querySelector('.landing-footer-divider');
    expect(divider).toBeInTheDocument();
  });

  test('renders bottom footer with copyright text', () => {
    const bottomText = screen.getByText(/© 2025 SportsLive. All rights reserved./i);
    expect(bottomText).toBeInTheDocument();
  });

  test('all major sections exist', () => {
    const brandSection = document.querySelector('.landing-footer-brand');
    const aboutSection = document.querySelector('.landing-footer-about');
    const socialSection = document.querySelector('.landing-footer-social');
    const bottomSection = document.querySelector('.landing-footer-bottom');

    expect(brandSection).toBeInTheDocument();
    expect(aboutSection).toBeInTheDocument();
    expect(socialSection).toBeInTheDocument();
    expect(bottomSection).toBeInTheDocument();
  });
});
