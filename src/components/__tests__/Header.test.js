// __tests__/Header.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header/Header';

// Mock Clerk
jest.mock('@clerk/clerk-react', () => {
  const React = require('react');
  return {
    useUser: () => ({ user: { firstName: 'John' } }),
    UserButton: () => <div data-testid="user-button">UserButton</div>,
  };
});

describe('Header component', () => {
  let mockSetActiveTab;
  let mockSetShowAboutUs;
  let mockSetSelectedMatch;
  let mockSetSelectedTeam;

  beforeEach(() => {
    mockSetActiveTab = jest.fn();
    mockSetShowAboutUs = jest.fn();
    mockSetSelectedMatch = jest.fn();
    mockSetSelectedTeam = jest.fn();
  });

  it('renders user first name', () => {
    render(
      <Header
        activeTab=""
        setActiveTab={mockSetActiveTab}
        setShowAboutUs={mockSetShowAboutUs}
        setSelectedMatch={mockSetSelectedMatch}
        setSelectedTeam={mockSetSelectedTeam}
        isAdmin={false}
        selectedMatch={null}
      />
    );

    expect(screen.getByText(/Welcome, John/i)).toBeInTheDocument();
    expect(screen.getByTestId('user-button')).toBeInTheDocument();
  });

  it('calls setActiveTab and resets state when nav buttons are clicked', () => {
    render(
      <Header
        activeTab=""
        setActiveTab={mockSetActiveTab}
        setShowAboutUs={mockSetShowAboutUs}
        setSelectedMatch={mockSetSelectedMatch}
        setSelectedTeam={mockSetSelectedTeam}
        isAdmin={false}
        selectedMatch={null}
      />
    );

    fireEvent.click(screen.getByText('Home'));
    expect(mockSetActiveTab).toHaveBeenCalledWith('home');
    expect(mockSetShowAboutUs).toHaveBeenCalledWith(false);
    expect(mockSetSelectedMatch).toHaveBeenCalledWith(null);
    expect(mockSetSelectedTeam).toHaveBeenCalledWith(null);
  });

  it('calls handleAboutClick when About button is clicked', () => {
    render(
      <Header
        activeTab=""
        setActiveTab={mockSetActiveTab}
        setShowAboutUs={mockSetShowAboutUs}
        setSelectedMatch={mockSetSelectedMatch}
        setSelectedTeam={mockSetSelectedTeam}
        isAdmin={false}
        selectedMatch={null}
      />
    );

    fireEvent.click(screen.getByText('About'));
    expect(mockSetShowAboutUs).toHaveBeenCalledWith(true);
  expect(mockSetActiveTab).toHaveBeenCalledWith('about');
    expect(mockSetSelectedMatch).toHaveBeenCalledWith(null);
    expect(mockSetSelectedTeam).toHaveBeenCalledWith(null);
  });

  it('renders admin buttons if isAdmin is true', () => {
    render(
      <Header
        activeTab=""
        setActiveTab={mockSetActiveTab}
        setShowAboutUs={mockSetShowAboutUs}
        setSelectedMatch={mockSetSelectedMatch}
        setSelectedTeam={mockSetSelectedTeam}
        isAdmin={true}
        selectedMatch={null}
      />
    );

    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.queryByText('Live Input')).not.toBeInTheDocument();
  });

  it('renders Live Input button if selectedMatch is provided', () => {
    render(
      <Header
        activeTab=""
        setActiveTab={mockSetActiveTab}
        setShowAboutUs={mockSetShowAboutUs}
        setSelectedMatch={mockSetSelectedMatch}
        setSelectedTeam={mockSetSelectedTeam}
        isAdmin={true}
        selectedMatch={{ id: 123 }}
      />
    );

    expect(screen.getByText('Live Input')).toBeInTheDocument();
  });
});