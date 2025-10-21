// __tests__/HomeScreen.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeScreen from '../HomeScreen/HomeScreen';

const mockLeagues = [
  { key: 'eng.1', name: 'Premier League', img: 'pl.png', desc: 'Top English league', color: '#ff0000' },
  { key: 'esp.1', name: 'La Liga', img: 'la.png', desc: 'Top Spanish league', color: '#00ff00' },
];

const mockNews = [
  {
    _id: '1',
    headline: 'Team A wins',
    description: 'Team A won their match by 2 goals',
    published: '2025-10-18T12:00:00Z',
    images: [{ url: 'img1.jpg' }],
  },
  {
    _id: '2',
    headline: 'Player B scores hat-trick',
    description: 'Player B scored 3 goals in one match',
    published: '2025-10-17T15:30:00Z',
    images: [{ url: 'img2.jpg' }],
  },
];

describe('HomeScreen', () => {
  let setActiveTab, setSelectedLeague;

  beforeEach(() => {
    setActiveTab = jest.fn();
    setSelectedLeague = jest.fn();
  });

  it('renders hero section and news sidebar', () => {
    render(
      <HomeScreen 
        setActiveTab={setActiveTab} 
        setSelectedLeague={setSelectedLeague} 
        leagues={mockLeagues} 
        latestNews={mockNews} 
        newsLoading={false} 
      />
    );

    expect(screen.getByText(/Experience Football/i)).toBeInTheDocument();
    expect(screen.getByText(/Latest News/i)).toBeInTheDocument();
    expect(screen.getByText('Team A wins')).toBeInTheDocument();
    expect(screen.getByText('Player B scores hat-trick')).toBeInTheDocument();
  });

  it('renders loading state when newsLoading is true', () => {
    render(
      <HomeScreen 
        setActiveTab={setActiveTab} 
        setSelectedLeague={setSelectedLeague} 
        leagues={mockLeagues} 
        latestNews={[]} 
        newsLoading={true} 
      />
    );

    expect(screen.getByText(/Loading news/i)).toBeInTheDocument();
  });

  it('renders "No recent news" when no news', () => {
    render(
      <HomeScreen 
        setActiveTab={setActiveTab} 
        setSelectedLeague={setSelectedLeague} 
        leagues={mockLeagues} 
        latestNews={[]} 
        newsLoading={false} 
      />
    );

    expect(screen.getByText(/No recent news available/i)).toBeInTheDocument();
    const refreshBtn = screen.getByText(/Refresh/i);
    expect(refreshBtn).toBeInTheDocument();
  });

  it('calls setActiveTab when quick action card is clicked', () => {
    render(
      <HomeScreen 
        setActiveTab={setActiveTab} 
        setSelectedLeague={setSelectedLeague} 
        leagues={mockLeagues} 
        latestNews={mockNews} 
        newsLoading={false} 
      />
    );

    const homeCard = screen.getByText('Live Matches').closest('.action-card');
    fireEvent.click(homeCard);
    expect(setActiveTab).toHaveBeenCalledWith('matches');

    const playersCard = screen.getByText('Players').closest('.action-card');
    fireEvent.click(playersCard);
    expect(setActiveTab).toHaveBeenCalledWith('players');
  });

  it('calls setSelectedLeague and setActiveTab when a league card is clicked', () => {
    render(
      <HomeScreen 
        setActiveTab={setActiveTab} 
        setSelectedLeague={setSelectedLeague} 
        leagues={mockLeagues} 
        latestNews={mockNews} 
        newsLoading={false} 
      />
    );

    const leagueCard = screen.getByText('Premier League').closest('.featured-league-card');
    fireEvent.click(leagueCard);
    expect(setSelectedLeague).toHaveBeenCalledWith('eng.1');
    expect(setActiveTab).toHaveBeenCalledWith('leagueStandings');
  });

  it('calls setActiveTab when "View All" news button is clicked', () => {
    render(
      <HomeScreen 
        setActiveTab={setActiveTab} 
        setSelectedLeague={setSelectedLeague} 
        leagues={mockLeagues} 
        latestNews={mockNews} 
        newsLoading={false} 
      />
    );

    fireEvent.click(screen.getByText(/View All/i));
    expect(setActiveTab).toHaveBeenCalledWith('news');
  });
});
