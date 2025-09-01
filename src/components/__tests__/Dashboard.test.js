// src/components/__tests__/Dashboard.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '../dashboard/Dashboard';

// Mock Clerk hooks
jest.mock('@clerk/clerk-react', () => {
  const React = require('react');
  return {
    useUser: jest.fn(() => ({
      user: {
        id: 'user1',
        firstName: 'Test',
        privateMetadata: {},
        publicMetadata: {isAdmin: true},
      },
    })),
    useAuth: jest.fn(() => ({
      getToken: jest.fn().mockResolvedValue('fake-token'),
      isSignedIn: true,
    })),
    UserButton: () => <div data-testid="user-button">UserButton</div>,
  };
});

// Mock child components
jest.mock('../sports/LiveSports', () => ({ onMatchSelect }) => (
  <div data-testid="live-sports">LiveSports</div>
));
jest.mock('../favouritespanel/FavoritesPanel', () => ({ onMatchSelect }) => (
  <div data-testid="favorites-panel">FavoritesPanel</div>
));
jest.mock('../matchViewer/MatchViewer', () => ({ match, initialSection }) => (
  <div data-testid="match-viewer">MatchViewer - {initialSection}</div>
));
jest.mock('../matchsetup/MatchSetup', () => ({ isAdmin }) => (
  <div data-testid="match-setup">MatchSetup</div>
));
jest.mock('../liveInput/LiveInput', () => ({ isAdmin }) => (
  <div data-testid="live-input">LiveInput</div>
));

describe('Dashboard', () => {
    const { useUser, useAuth } = require('@clerk/clerk-react');

    beforeEach(() => {
        useAuth.mockReturnValue({
        getToken: jest.fn().mockResolvedValue('fake-token'),
        isSignedIn: true,
        });
    });

    test('renders header and user info', () => {
        useUser.mockReturnValue({
        user: { id: 'user1', firstName: 'Test', privateMetadata: {}, publicMetadata: {} },
        });
        render(<Dashboard />);
        expect(screen.getByTestId('dashboard-title')).toHaveTextContent('Sports Live');
        expect(screen.getByTestId('dashboard-subtitle')).toHaveTextContent(
        'Real-time football scores and live match updates'
        );
        expect(screen.getByTestId('user-greeting')).toHaveTextContent('Welcome, Test');
        expect(screen.getByTestId('user-button')).toBeInTheDocument();
    });

    test('renders LiveSports and FavoritesPanel by default', () => {
        useUser.mockReturnValue({
        user: { id: 'user1', firstName: 'Test', privateMetadata: {}, publicMetadata: {} },
        });
        render(<Dashboard />);
        expect(screen.getByTestId('live-sports')).toBeInTheDocument();
        expect(screen.getByTestId('favorites-panel')).toBeInTheDocument();
    });

    test('switches to MatchViewer tab when clicked', () => {
        useUser.mockReturnValue({
        user: { id: 'user1', firstName: 'Test', privateMetadata: {}, publicMetadata: {} },
        });
        render(<Dashboard />);
        fireEvent.click(screen.getByTestId('tab-matchViewer'));
        expect(screen.getByTestId('match-viewer')).toBeInTheDocument();
    });

    test('renders admin tabs if user is admin', () => {
        useUser.mockReturnValue({
        user: { id: 'admin1', firstName: 'Admin', privateMetadata: {}, publicMetadata: { isAdmin: true } },
        });
        render(<Dashboard />);
        // expect(screen.getByTestId('tab-matchSetup')).toBeInTheDocument();
        // expect(screen.getByTestId('tab-liveInput')).toBeInTheDocument();
    });

    test('does not render admin tabs if user is not admin', () => {
        useUser.mockReturnValue({
        user: { id: 'user2', firstName: 'Guest', privateMetadata: {}, publicMetadata: {} },
        });
        render(<Dashboard />);
        expect(screen.queryByTestId('tab-matchSetup')).toBeNull();
        expect(screen.queryByTestId('tab-liveInput')).toBeNull();
    });

    test('switches to admin content when clicking admin tabs', () => {
        useUser.mockReturnValue({
        user: { id: 'admin1', firstName: 'Admin', privateMetadata: {}, publicMetadata: { isAdmin: true } },
        });
        render(<Dashboard />);
        // fireEvent.click(screen.getByTestId('tab-matchSetup'));
        // expect(screen.getByTestId('match-setup')).toBeInTheDocument();

        // fireEvent.click(screen.getByTestId('tab-liveInput'));
        // expect(screen.getByTestId('live-input')).toBeInTheDocument();
    });
    });
