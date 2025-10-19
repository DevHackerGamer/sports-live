// __tests__/Footer.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Footer from '../Footer/Footer' ;

describe('Footer component', () => {
  let mockSetActiveTab;
  let mockSetShowAboutUs;
  let mockSetSelectedMatch;
  let mockSetSelectedTeam;
  let mockSetSelectedLeague;
  let leagues;

  beforeEach(() => {
    mockSetActiveTab = jest.fn();
    mockSetShowAboutUs = jest.fn();
    mockSetSelectedMatch = jest.fn();
    mockSetSelectedTeam = jest.fn();
    mockSetSelectedLeague = jest.fn();

    leagues = [
      { key: 'eng.1', name: 'Premier League' },
      { key: 'esp.1', name: 'La Liga' },
    ];
  });

  it('renders all sections and league buttons', () => {
    render(
      <Footer
        setActiveTab={mockSetActiveTab}
        setShowAboutUs={mockSetShowAboutUs}
        setSelectedMatch={mockSetSelectedMatch}
        setSelectedTeam={mockSetSelectedTeam}
        leagues={leagues}
        setSelectedLeague={mockSetSelectedLeague}
      />
    );

    // Check quick link buttons
    ['Home', 'Matches', 'Favorites', 'Players', 'News', 'Highlights'].forEach(text => {
      expect(screen.getByText(text)).toBeInTheDocument();
    });

    // Check league buttons
    leagues.forEach(l => {
      expect(screen.getByText(l.name)).toBeInTheDocument();
    });

    // Check brand section
    expect(screen.getByText('SportsLive')).toBeInTheDocument();
  });

  it('calls appropriate functions when quick link buttons are clicked', () => {
    render(
      <Footer
        setActiveTab={mockSetActiveTab}
        setShowAboutUs={mockSetShowAboutUs}
        setSelectedMatch={mockSetSelectedMatch}
        setSelectedTeam={mockSetSelectedTeam}
        leagues={leagues}
        setSelectedLeague={mockSetSelectedLeague}
      />
    );

    fireEvent.click(screen.getByText('Home'));

    expect(mockSetActiveTab).toHaveBeenCalledWith('home');
    expect(mockSetShowAboutUs).toHaveBeenCalledWith(false);
    expect(mockSetSelectedMatch).toHaveBeenCalledWith(null);
    expect(mockSetSelectedTeam).toHaveBeenCalledWith(null);
  });

  it('calls appropriate functions when a league button is clicked', () => {
    render(
      <Footer
        setActiveTab={mockSetActiveTab}
        setShowAboutUs={mockSetShowAboutUs}
        setSelectedMatch={mockSetSelectedMatch}
        setSelectedTeam={mockSetSelectedTeam}
        leagues={leagues}
        setSelectedLeague={mockSetSelectedLeague}
      />
    );

    fireEvent.click(screen.getByText('Premier League'));

    expect(mockSetSelectedLeague).toHaveBeenCalledWith('eng.1');
    expect(mockSetActiveTab).toHaveBeenCalledWith('leagueStandings');
    expect(mockSetShowAboutUs).toHaveBeenCalledWith(false);
    expect(mockSetSelectedMatch).toHaveBeenCalledWith(null);
    expect(mockSetSelectedTeam).toHaveBeenCalledWith(null);
  });

  it('renders social media icons', () => {
    render(
      <Footer
        setActiveTab={mockSetActiveTab}
        setShowAboutUs={mockSetShowAboutUs}
        setSelectedMatch={mockSetSelectedMatch}
        setSelectedTeam={mockSetSelectedTeam}
        leagues={leagues}
        setSelectedLeague={mockSetSelectedLeague}
      />
    );

    expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
  });
});
