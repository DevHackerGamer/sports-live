import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AboutUs from '../AboutUs/AboutUs';

describe('AboutUs Component', () => {
  const mockSetShowAboutUs = jest.fn();
  const mockSetActiveTab = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all AboutUs content correctly', () => {
    render(
      <AboutUs 
        setShowAboutUs={mockSetShowAboutUs}
        setActiveTab={mockSetActiveTab}
      />
    );

    // Check main heading
    expect(screen.getByText('About Sports Live')).toBeInTheDocument();

    // Check main description
    expect(screen.getByText(/Sports Live is the premier destination for football enthusiasts/i)).toBeInTheDocument();

    // Check section headings
    expect(screen.getByText('Our Mission')).toBeInTheDocument();
    expect(screen.getByText('What We Offer')).toBeInTheDocument();
    expect(screen.getByText('Our Team')).toBeInTheDocument();
    expect(screen.getByText('Contact Us')).toBeInTheDocument();

    // Check mission statement
    expect(screen.getByText(/To provide football fans with the most accurate/i)).toBeInTheDocument();

    // Check features list
    expect(screen.getByText('Real-time match updates and live scores')).toBeInTheDocument();
    expect(screen.getByText('Detailed player and team statistics')).toBeInTheDocument();
    expect(screen.getByText('League standings and tournament progress')).toBeInTheDocument();
    expect(screen.getByText('Personalized favorites system to follow your preferred teams')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive coverage of Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and European competitions')).toBeInTheDocument();

    // Check team description
    expect(screen.getByText(/We are a passionate group of football enthusiasts/i)).toBeInTheDocument();

    // Check contact information
    expect(screen.getByText(/support@sportslive.com/i)).toBeInTheDocument();

    // Check back button
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
  });

  it('calls setShowAboutUs and setActiveTab when back button is clicked', () => {
    render(
      <AboutUs 
        setShowAboutUs={mockSetShowAboutUs}
        setActiveTab={mockSetActiveTab}
      />
    );

    const backButton = screen.getByText('Back to Dashboard');
    fireEvent.click(backButton);

    expect(mockSetShowAboutUs).toHaveBeenCalledWith(false);
    expect(mockSetActiveTab).toHaveBeenCalledWith('home');
  });

  it('renders with correct structure and classes', () => {
    const { container } = render(
      <AboutUs 
        setShowAboutUs={mockSetShowAboutUs}
        setActiveTab={mockSetActiveTab}
      />
    );

    // Check container classes
    const aboutContainer = container.querySelector('.about-us-container');
    expect(aboutContainer).toBeInTheDocument();

    const innerContainer = container.querySelector('.container');
    expect(innerContainer).toBeInTheDocument();

    const aboutContent = container.querySelector('.about-content');
    expect(aboutContent).toBeInTheDocument();

    // Check button classes
    const backButton = screen.getByText('Back to Dashboard');
    expect(backButton).toHaveClass('btn', 'btn-secondary', 'mt-3');
  });

  it('renders all list items in the features section', () => {
    render(
      <AboutUs 
        setShowAboutUs={mockSetShowAboutUs}
        setActiveTab={mockSetActiveTab}
      />
    );

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(5);

    // Verify specific list items
    expect(listItems[0]).toHaveTextContent('Real-time match updates and live scores');
    expect(listItems[1]).toHaveTextContent('Detailed player and team statistics');
    expect(listItems[2]).toHaveTextContent('League standings and tournament progress');
    expect(listItems[3]).toHaveTextContent('Personalized favorites system to follow your preferred teams');
    expect(listItems[4]).toHaveTextContent('Comprehensive coverage of Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and European competitions');
  });

  it('matches snapshot', () => {
    const { container } = render(
      <AboutUs 
        setShowAboutUs={mockSetShowAboutUs}
        setActiveTab={mockSetActiveTab}
      />
    );

    expect(container).toMatchSnapshot();
  });
});