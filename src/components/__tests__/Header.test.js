// src/components/Header/__tests__/Header.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '../Header';

// Mock Clerk hooks and components
jest.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { firstName: 'John', lastName: 'Doe' } }),
  UserButton: () => <button>UserButton</button>,
}));

describe('Header Component', () => {
  let setActiveTabMock, setShowAboutUsMock;

  beforeEach(() => {
    setActiveTabMock = jest.fn();
    setShowAboutUsMock = jest.fn();
  });

  test('renders logo and greeting', () => {
    render(
      <Header
        activeTab="home"
        setActiveTab={setActiveTabMock}
        setShowAboutUs={setShowAboutUsMock}
        setSelectedMatch={() => {}}
        setSelectedTeam={() => {}}
        isAdmin={false}
      />
    );

    expect(screen.getByText(/SportsLive/i)).toBeInTheDocument();
    expect(screen.getByText(/Welcome, John/i)).toBeInTheDocument();
    expect(screen.getByText(/UserButton/i)).toBeInTheDocument();
  });

  test('navigates to tabs and closes mobile menu', () => {
    render(
      <Header
        activeTab="home"
        setActiveTab={setActiveTabMock}
        setShowAboutUs={setShowAboutUsMock}
        setSelectedMatch={() => {}}
        setSelectedTeam={() => {}}
        isAdmin={false}
      />
    );

    const homeBtn = screen.getByRole('button', { name: /home/i });
    fireEvent.click(homeBtn);

    expect(setActiveTabMock).toHaveBeenCalledWith('home');
    expect(setShowAboutUsMock).toHaveBeenCalledWith(false);
  });

  test('opens About section', () => {
    render(
      <Header
        activeTab="home"
        setActiveTab={setActiveTabMock}
        setShowAboutUs={setShowAboutUsMock}
        setSelectedMatch={() => {}}
        setSelectedTeam={() => {}}
        isAdmin={false}
      />
    );

    const aboutBtn = screen.getByRole('button', { name: /about/i });
    fireEvent.click(aboutBtn);

    expect(setShowAboutUsMock).toHaveBeenCalledWith(true);
    expect(setActiveTabMock).toHaveBeenCalledWith('about');
  });

  test('toggles mobile menu', () => {
    render(
      <Header
        activeTab="home"
        setActiveTab={setActiveTabMock}
        setShowAboutUs={setShowAboutUsMock}
        setSelectedMatch={() => {}}
        setSelectedTeam={() => {}}
        isAdmin={false}
      />
    );

    const burgerBtn = screen.getByRole('button', { name: /toggle menu/i });

    // Initially closed, click to open
    fireEvent.click(burgerBtn);
    expect(screen.getByRole('navigation')).toHaveClass('mobile-menu-open');

    // Click overlay to close
    const overlay = screen.getByTestId('mobile-menu-overlay') || document.querySelector('.mobile-menu-overlay');
    fireEvent.click(overlay);
    expect(screen.getByRole('navigation')).not.toHaveClass('mobile-menu-open');
  });

  test('renders admin tabs when isAdmin is true', () => {
    render(
      <Header
        activeTab="home"
        setActiveTab={setActiveTabMock}
        setShowAboutUs={setShowAboutUsMock}
        setSelectedMatch={() => {}}
        setSelectedTeam={() => {}}
        isAdmin={true}
      />
    );

    expect(screen.getByRole('button', { name: /setup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reports/i })).toBeInTheDocument();
  });

  test('renders live input button if selectedMatch or selectedMatchId exists', () => {
    const { rerender } = render(
      <Header
        activeTab="home"
        setActiveTab={setActiveTabMock}
        setShowAboutUs={setShowAboutUsMock}
        setSelectedMatch={() => {}}
        setSelectedTeam={() => {}}
        isAdmin={true}
      />
    );

    // No live input initially
    expect(screen.queryByRole('button', { name: /live input/i })).not.toBeInTheDocument();

    // With selectedMatch
    rerender(
      <Header
        activeTab="home"
        setActiveTab={setActiveTabMock}
        setShowAboutUs={setShowAboutUsMock}
        setSelectedMatch={{ id: 'match1' }}
        setSelectedTeam={() => {}}
        isAdmin={true}
      />
    );

    expect(screen.getByRole('button', { name: /live input/i })).toBeInTheDocument();

    // With selectedMatchId
    rerender(
      <Header
        activeTab="home"
        setActiveTab={setActiveTabMock}
        setShowAboutUs={setShowAboutUsMock}
        setSelectedMatch={null}
        selectedMatchId="match123"
        setSelectedTeam={() => {}}
        isAdmin={true}
      />
    );

    expect(screen.getByRole('button', { name: /live input/i })).toBeInTheDocument();
  });
});
