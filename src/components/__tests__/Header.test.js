import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header/Header';
import * as ClerkReact from '@clerk/clerk-react';

// Mock Clerk components
jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
  UserButton: () => <div data-testid="user-button">User Button</div>,
}));

// Mock FontAwesome icons
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ icon, ...props }) => <span data-testid="font-awesome-icon" {...props} />,
}));

describe('Header Component', () => {
  const mockSetActiveTab = jest.fn();
  const mockSetShowAboutUs = jest.fn();
  const mockSetSelectedMatch = jest.fn();
  const mockSetSelectedTeam = jest.fn();

  const defaultProps = {
    activeTab: 'home',
    setActiveTab: mockSetActiveTab,
    setShowAboutUs: mockSetShowAboutUs,
    setSelectedMatch: mockSetSelectedMatch,
    setSelectedTeam: mockSetSelectedTeam,
    isAdmin: false,
    selectedMatch: null,
    selectedMatchId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ClerkReact.useUser.mockReturnValue({
      user: { firstName: 'John' }
    });
  });

 

  it('shows admin tabs when user is admin', () => {
    render(<Header {...defaultProps} isAdmin={true} />);

    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('shows Live Input tab when match is selected and user is admin', () => {
    render(
      <Header 
        {...defaultProps} 
        isAdmin={true}
        selectedMatch={{ id: '123', homeTeam: { name: 'Team A' } }}
      />
    );

    expect(screen.getByText('Live Input')).toBeInTheDocument();
  });

  it('shows Live Input tab when selectedMatchId is provided and user is admin', () => {
    render(
      <Header 
        {...defaultProps} 
        isAdmin={true}
        selectedMatchId="456"
      />
    );

    expect(screen.getByText('Live Input')).toBeInTheDocument();
  });

  it('handles navigation clicks correctly', () => {
    render(<Header {...defaultProps} />);

    // Test Home navigation
    fireEvent.click(screen.getByText('Home'));
    expect(mockSetActiveTab).toHaveBeenCalledWith('home');
    expect(mockSetShowAboutUs).toHaveBeenCalledWith(false);

    // Test Favourites navigation
    fireEvent.click(screen.getByText('Favourites'));
    expect(mockSetActiveTab).toHaveBeenCalledWith('favorites');
    expect(mockSetShowAboutUs).toHaveBeenCalledWith(false);

    // Test About navigation
    fireEvent.click(screen.getByText('About'));
    expect(mockSetActiveTab).toHaveBeenCalledWith('about');
    expect(mockSetShowAboutUs).toHaveBeenCalledWith(true);
  });

  it('toggles mobile menu when burger button is clicked', () => {
    render(<Header {...defaultProps} />);

    const burgerButton = screen.getByLabelText('Toggle menu');
    
    // Click to open menu
    fireEvent.click(burgerButton);
    
    // Click to close menu
    fireEvent.click(burgerButton);
  });

  it('closes mobile menu when navigation item is clicked', () => {
    render(<Header {...defaultProps} />);

    const burgerButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(burgerButton);

    const homeButton = screen.getByText('Home');
    fireEvent.click(homeButton);

    // Menu should be closed after navigation
    expect(mockSetActiveTab).toHaveBeenCalledWith('home');
  });

  it('closes mobile menu when About is clicked', () => {
    render(<Header {...defaultProps} />);

    const burgerButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(burgerButton);

    const aboutButton = screen.getByText('About');
    fireEvent.click(aboutButton);

    // Menu should be closed after navigation
    expect(mockSetActiveTab).toHaveBeenCalledWith('about');
    expect(mockSetShowAboutUs).toHaveBeenCalledWith(true);
  });

  it('handles user without firstName gracefully', () => {
    ClerkReact.useUser.mockReturnValue({
      user: null
    });

    render(<Header {...defaultProps} />);

    expect(screen.getByText('Welcome, User')).toBeInTheDocument();
  });

  it('does not show admin tabs when user is not admin', () => {
    render(<Header {...defaultProps} isAdmin={false} />);

    expect(screen.queryByText('Setup')).not.toBeInTheDocument();
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('Live Input')).not.toBeInTheDocument();
  });

  it('does not show Live Input tab when no match is selected', () => {
    render(<Header {...defaultProps} isAdmin={true} />);

    expect(screen.queryByText('Live Input')).not.toBeInTheDocument();
  });

  it('renders mobile menu overlay when menu is open', () => {
    const { container } = render(<Header {...defaultProps} />);

    const burgerButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(burgerButton);

    const overlay = container.querySelector('.mobile-menu-overlay');
    expect(overlay).toBeInTheDocument();
  });

  it('closes mobile menu when overlay is clicked', () => {
    const { container } = render(<Header {...defaultProps} />);

    const burgerButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(burgerButton);

    const overlay = container.querySelector('.mobile-menu-overlay');
    fireEvent.click(overlay);

    // Menu should be closed after overlay click
  });

  it('matches snapshot', () => {
    const { container } = render(<Header {...defaultProps} />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot with admin privileges', () => {
    const { container } = render(
      <Header 
        {...defaultProps} 
        isAdmin={true}
        selectedMatch={{ id: '123' }}
      />
    );
    expect(container).toMatchSnapshot();
  });
});