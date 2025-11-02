import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeScreen from '../HomeScreen/HomeScreen';

// Mock FontAwesome icons
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ icon, ...props }) => <span data-testid="font-awesome-icon" {...props} />,
}));

describe('HomeScreen Component', () => {
  const mockSetActiveTab = jest.fn();
  const mockSetSelectedLeague = jest.fn();

  const defaultProps = {
    setActiveTab: mockSetActiveTab,
    setSelectedLeague: mockSetSelectedLeague,
    leagues: [
      { key: 'PL', name: 'Premier League', img: '/pl-logo.png', color: '#3D195B', desc: 'English top division' },
      { key: 'LL', name: 'La Liga', img: '/laliga-logo.png', color: '#FF0000', desc: 'Spanish top division' },
      { key: 'SA', name: 'Serie A', img: '/seriea-logo.png', color: '#008C45', desc: 'Italian top division' },
      { key: 'BL', name: 'Bundesliga', img: '/bundesliga-logo.png', color: '#D20026', desc: 'German top division' },
      { key: 'FL', name: 'Ligue 1', img: '/ligue1-logo.png', color: '#091C3E', desc: 'French top division' },
      { key: 'CL', name: 'Champions League', img: '/ucl-logo.png', color: '#0F4C81', desc: 'European competition' },
    ],
    latestNews: [
      {
        _id: '1',
        headline: 'Breaking News: Team Wins Championship',
        description: 'In an incredible match, the team secured their victory in the final minutes.',
        published: '2024-01-15T10:00:00Z',
        images: [{ url: '/news1.jpg', alt: 'Championship win' }]
      },
      {
        _id: '2',
        headline: 'Transfer Window Update',
        description: 'Major transfers happening across European leagues as deadline approaches.',
        published: '2024-01-14T15:30:00Z',
        images: []
      }
    ],
    newsLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders hero section correctly', () => {
    render(<HomeScreen {...defaultProps} />);

    expect(screen.getByText('Experience Football')).toBeInTheDocument();
    expect(screen.getByText('Like Never Before')).toBeInTheDocument();
    expect(screen.getByText(/Real-time scores, in-depth statistics/i)).toBeInTheDocument();
  });

  it('renders news sidebar with latest news', () => {
    render(<HomeScreen {...defaultProps} />);

    expect(screen.getByText('Latest News')).toBeInTheDocument();
    expect(screen.getByText('View All')).toBeInTheDocument();
    expect(screen.getByText('Breaking News: Team Wins Championship')).toBeInTheDocument();
    expect(screen.getByText('Transfer Window Update')).toBeInTheDocument();
  });

  

  
  it('shows no news message when news array is empty', () => {
    render(<HomeScreen {...defaultProps} latestNews={[]} />);

    expect(screen.getByText('No recent news available')).toBeInTheDocument();
  });

  it('renders quick actions section with all features', () => {
    render(<HomeScreen {...defaultProps} />);

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Live Matches')).toBeInTheDocument();
    expect(screen.getByText('Follow games in real-time')).toBeInTheDocument();
    expect(screen.getByText('Highlights')).toBeInTheDocument();
    expect(screen.getByText('Watch match highlights')).toBeInTheDocument();
    expect(screen.getByText('Standings')).toBeInTheDocument();
    expect(screen.getByText('League tables and rankings')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Your followed content')).toBeInTheDocument();
  });

  it('renders featured leagues section', () => {
    render(<HomeScreen {...defaultProps} />);

    expect(screen.getByText('Featured Leagues')).toBeInTheDocument();
    expect(screen.getByText('Premier League')).toBeInTheDocument();
    expect(screen.getByText('La Liga')).toBeInTheDocument();
    expect(screen.getByText('Serie A')).toBeInTheDocument();
    expect(screen.getByText('Bundesliga')).toBeInTheDocument();
    expect(screen.getByText('Ligue 1')).toBeInTheDocument();
    expect(screen.getByText('Champions League')).toBeInTheDocument();
  });

  it('renders league logos', () => {
    render(<HomeScreen {...defaultProps} />);

    const leagueLogos = screen.getAllByRole('img');
    // First image is news, rest are league logos
    expect(leagueLogos[1]).toHaveAttribute('src', '/pl-logo.png');
    expect(leagueLogos[2]).toHaveAttribute('src', '/laliga-logo.png');
  });

  it('calls setActiveTab when quick action cards are clicked', () => {
    render(<HomeScreen {...defaultProps} />);

    // Test Live Matches action
    fireEvent.click(screen.getByText('Live Matches'));
    expect(mockSetActiveTab).toHaveBeenCalledWith('matches');

    // Test Highlights action
    fireEvent.click(screen.getByText('Highlights'));
    expect(mockSetActiveTab).toHaveBeenCalledWith('highlights');

    // Test Standings action
    fireEvent.click(screen.getByText('Standings'));
    expect(mockSetActiveTab).toHaveBeenCalledWith('leagueStandings');

    // Test Favorites action
    fireEvent.click(screen.getByText('Favorites'));
    expect(mockSetActiveTab).toHaveBeenCalledWith('favorites');
  });

  it('calls setActiveTab when View All news button is clicked', () => {
    render(<HomeScreen {...defaultProps} />);

    fireEvent.click(screen.getByText('View All'));
    expect(mockSetActiveTab).toHaveBeenCalledWith('news');
  });

  it('calls setActiveTab when news items are clicked', () => {
    render(<HomeScreen {...defaultProps} />);

    const firstNewsItem = screen.getByText('Breaking News: Team Wins Championship');
    fireEvent.click(firstNewsItem);
    expect(mockSetActiveTab).toHaveBeenCalledWith('news');
  });

  it('calls setSelectedLeague and setActiveTab when league cards are clicked', () => {
    render(<HomeScreen {...defaultProps} />);

    // Click on Premier League card
    fireEvent.click(screen.getByText('Premier League'));
    expect(mockSetSelectedLeague).toHaveBeenCalledWith('PL');
    expect(mockSetActiveTab).toHaveBeenCalledWith('leagueStandings');

    // Click on La Liga card
    fireEvent.click(screen.getByText('La Liga'));
    expect(mockSetSelectedLeague).toHaveBeenCalledWith('LL');
    expect(mockSetActiveTab).toHaveBeenCalledWith('leagueStandings');
  });

  it('limits featured leagues to first 6', () => {
    const manyLeagues = [
      { key: 'PL', name: 'Premier League', img: '/pl.png', color: '#000', desc: 'Desc' },
      { key: 'LL', name: 'La Liga', img: '/ll.png', color: '#000', desc: 'Desc' },
      { key: 'SA', name: 'Serie A', img: '/sa.png', color: '#000', desc: 'Desc' },
      { key: 'BL', name: 'Bundesliga', img: '/bl.png', color: '#000', desc: 'Desc' },
      { key: 'FL', name: 'Ligue 1', img: '/fl.png', color: '#000', desc: 'Desc' },
      { key: 'CL', name: 'Champions League', img: '/cl.png', color: '#000', desc: 'Desc' },
      { key: 'EL', name: 'Europa League', img: '/el.png', color: '#000', desc: 'Desc' }, // 7th league
    ];

    render(<HomeScreen {...defaultProps} leagues={manyLeagues} />);

    expect(screen.getByText('Premier League')).toBeInTheDocument();
    expect(screen.getByText('La Liga')).toBeInTheDocument();
    expect(screen.getByText('Serie A')).toBeInTheDocument();
    expect(screen.getByText('Bundesliga')).toBeInTheDocument();
    expect(screen.getByText('Ligue 1')).toBeInTheDocument();
    expect(screen.getByText('Champions League')).toBeInTheDocument();
    expect(screen.queryByText('Europa League')).not.toBeInTheDocument();
  });

  it('formats news dates correctly', () => {
    render(<HomeScreen {...defaultProps} />);

    // Check that dates are formatted (format will depend on locale)
    const dateElements = screen.getAllByText(/2024/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('truncates news descriptions', () => {
    render(<HomeScreen {...defaultProps} />);

    const excerpt = screen.getByText(/In an incredible match, the team secured their victory in the final minutes\.\.\./);
    expect(excerpt).toBeInTheDocument();
  });

  it('handles news items without images', () => {
    render(<HomeScreen {...defaultProps} />);

    // The second news item has no images, but should still render
    expect(screen.getByText('Transfer Window Update')).toBeInTheDocument();
  });

  it('matches snapshot with default props', () => {
    const { container } = render(<HomeScreen {...defaultProps} />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot with loading state', () => {
    const { container } = render(<HomeScreen {...defaultProps} newsLoading={true} />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot with empty news', () => {
    const { container } = render(<HomeScreen {...defaultProps} latestNews={[]} />);
    expect(container).toMatchSnapshot();
  });
});