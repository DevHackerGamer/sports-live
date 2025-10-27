// src/components/AboutUs/__tests__/AboutUs.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AboutUs from '../AboutUs';

describe('AboutUs Component', () => {
  const mockSetShowAboutUs = jest.fn();
  const mockSetActiveTab = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all main headings and text', () => {
    render(
      <AboutUs setShowAboutUs={mockSetShowAboutUs} setActiveTab={mockSetActiveTab} />
    );

    // Headings
    expect(screen.getByRole('heading', { name: /about sports live/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /our mission/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what we offer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /our team/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /contact us/i })).toBeInTheDocument();

    // Key paragraphs
    expect(
      screen.getByText(/Sports Live is the premier destination for football enthusiasts/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/To provide football fans with the most accurate, timely, and comprehensive/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/We are a passionate group of football enthusiasts/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/support@sportslive.com/i)
    ).toBeInTheDocument();
  });

  test('renders list items describing features', () => {
    render(
      <AboutUs setShowAboutUs={mockSetShowAboutUs} setActiveTab={mockSetActiveTab} />
    );

    const features = [
      /real-time match updates and live scores/i,
      /detailed player and team statistics/i,
      /league standings and tournament progress/i,
      /personalized favorites system/i,
      /comprehensive coverage of premier league/i,
    ];

    features.forEach((feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });
  });

  test('calls setShowAboutUs(false) and setActiveTab("home") when Back button is clicked', () => {
    render(
      <AboutUs setShowAboutUs={mockSetShowAboutUs} setActiveTab={mockSetActiveTab} />
    );

    const backButton = screen.getByRole('button', { name: /back to dashboard/i });
    fireEvent.click(backButton);

    expect(mockSetShowAboutUs).toHaveBeenCalledTimes(1);
    expect(mockSetShowAboutUs).toHaveBeenCalledWith(false);
    expect(mockSetActiveTab).toHaveBeenCalledTimes(1);
    expect(mockSetActiveTab).toHaveBeenCalledWith('home');
  });
});
