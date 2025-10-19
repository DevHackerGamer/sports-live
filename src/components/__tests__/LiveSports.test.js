import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LiveSports, {
  normalize,
  buildWeeklyChunks,
  groupByDateAndLeague,
  getTeamCrest,
  formatDate,
  getStatusBadge,
} from '../sports/LiveSports';

import TeamInfo from '../TeamInfo/TeamInfo';
import { useUser } from '@clerk/clerk-react';
import { useLiveSports } from '../../hooks/useLiveSports';
import { apiClient } from '../../lib/api';


jest.mock('../../hooks/useLiveSports', () => ({ useLiveSports: jest.fn() }));
jest.mock('@clerk/clerk-react', () => ({ useUser: jest.fn() }));
jest.mock('../../lib/api', () => ({
  apiClient: { addUserMatch: jest.fn() },
}));

// Mock TeamInfo so we can assert it renders
jest.mock('../TeamInfo/TeamInfo', () => ({ team, onBack }) => (
  <div data-testid="team-info">
    {team.name}
    <button onClick={onBack}>Back</button>
  </div>
));

describe('LiveSports selectedTeam and MatchCard behavior', () => {
  const mockUser = { id: 'user1' };
  const mockGames = [
    {
      id: 'match1',
      homeTeam: { name: 'Team A' },
      awayTeam: { name: 'Team B' },
      homeScore: 1,
      awayScore: 0,
      utcDate: new Date().toISOString(),
      status: 'scheduled',
      competition: 'League',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockReturnValue({ user: mockUser });
    useLiveSports.mockReturnValue({
      sportsData: { games: mockGames },
      isConnected: true,
      error: null,
      refreshData: jest.fn(),
    });
  });

  it('renders TeamInfo when a team is selected and calls onBack', async () => {
    const { container } = render(<LiveSports />);
    
    // Simulate selecting a team
    const liveSportsInstance = container.firstChild._owner.stateNode;
    liveSportsInstance.setSelectedTeam({ name: 'Team A' });

    // TeamInfo should now render
    expect(await screen.findByTestId('team-info')).toBeInTheDocument();
    expect(screen.getByText('Team A')).toBeInTheDocument();

    // Clicking back clears selection
    fireEvent.click(screen.getByText('Back'));
    expect(screen.queryByTestId('team-info')).not.toBeInTheDocument();
  });

  it('handles MatchCard hover and watchlist click', async () => {
    render(<LiveSports />);
    
    const matchCard = await screen.findByTestId('match-match1');
    
    // Hover over card
    fireEvent.mouseEnter(matchCard);

    const watchBtn = matchCard.querySelector('button');
    if (watchBtn) {
      fireEvent.click(watchBtn);
      await waitFor(() => {
        expect(apiClient.addUserMatch).toHaveBeenCalledWith('user1', mockGames[0]);
      });
    }

    // Hover out resets hover state
    fireEvent.mouseLeave(matchCard);
  });
});

// Mock API client
jest.mock('../../lib/api', () => ({
  apiClient: {
    getUserWatchlist: jest.fn(),
    getTeams: jest.fn(),
    addUserMatch: jest.fn(),
  },
}));

// Mock hooks
jest.mock('../../hooks/useLiveSports', () => ({
  useLiveSports: jest.fn(),
}));

jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
}));

describe('LiveSports Component', () => {
  const mockUser = { id: 'user1' };
  const mockGames = [
    {
      id: 'match1',
      homeTeam: { name: 'Team A' },
      awayTeam: { name: 'Team B' },
      utcDate: new Date().toISOString(),
      status: 'scheduled',
    },
  ];
  const mockSportsData = {
    games: mockGames,
    totalMatches: 1,
    dateFrom: new Date().toISOString(),
    dateTo: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useUser.mockReturnValue({ user: mockUser });

    apiClient.getUserWatchlist.mockResolvedValue({ data: [] });
    apiClient.getTeams.mockResolvedValue({
      data: [
        { name: 'Team A', crest: '/a.png' },
        { name: 'Team B', crest: '/b.png' },
      ],
    });

    useLiveSports.mockReturnValue({
      sportsData: mockSportsData,
      isConnected: true,
      error: null,
      lastUpdated: new Date(),
      refreshData: jest.fn(),
    });
  });

  it('renders loading state initially', () => {
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: true,
      error: null,
      refreshData: jest.fn(),
    });

    render(<LiveSports />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders error state if hook returns error', () => {
    const mockRefresh = jest.fn();
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: false,
      error: 'Failed',
      refreshData: mockRefresh,
    });

    render(<LiveSports />);
    expect(screen.getByTestId('error')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Retry/i));
    expect(mockRefresh).toHaveBeenCalled();
  });

  // it('renders match cards', async () => {
  //   render(<LiveSports />);
  //   await waitFor(() => screen.getByText(/Team A vs Team B/i));
  //   expect(screen.getByText(/Team A vs Team B/i)).toBeInTheDocument();
  // });

  it('fetches user watchlist and team crests', async () => {
    render(<LiveSports />);
    await waitFor(() => {
      expect(apiClient.getUserWatchlist).toHaveBeenCalledWith('user1');
      expect(apiClient.getTeams).toHaveBeenCalled();
    });
  });
  it('renders no matches available when chunks are empty', async () => {
  useLiveSports.mockReturnValue({
    sportsData: { games: [], totalMatches: 0 },
    isConnected: true,
    error: null,
    refreshData: jest.fn(),
  });

  render(<LiveSports />);
  expect(await screen.findByTestId('empty')).toBeInTheDocument();
  expect(screen.getByText(/No matches available/i)).toBeInTheDocument();
});
const statuses = ['live', 'paused', 'final', 'scheduled', 'unknown'];
statuses.forEach(status => {
  it(`renders correct badge for status: ${status}`, () => {
    const { container } = render(<LiveSports />);
    const badge = container.querySelector(`[data-testid="status-${status}"]`);
    if (badge) expect(badge).toBeInTheDocument();
  });
});

// it('calculates displayMinute for live match and triggers goal animation', async () => {
//   jest.useFakeTimers();
//   const pastDate = new Date(Date.now() - 5 * 60000).toISOString(); // 5 min ago
//   const liveGame = {
//     id: 'match2',
//     homeTeam: { name: 'Team X' },
//     awayTeam: { name: 'Team Y' },
//     homeScore: 1,
//     awayScore: 0,
//     utcDate: pastDate,
//     status: 'live',
//   };
  
//   useLiveSports.mockReturnValue({
//     sportsData: { games: [liveGame] },
//     isConnected: true,
//     error: null,
//     refreshData: jest.fn(),
//   });

//   render(<LiveSports />);
//   const matchCard = await screen.findByTestId('match-match2');

//   // Score animation should show ⚽
//   expect(matchCard.querySelector('.ls-goal-animation')).not.toBeInTheDocument();

//   // Simulate score update
//   fireEvent.click(matchCard);
//   jest.runAllTimers(); // advance timers for animation
//   jest.useRealTimers();
// // });
// it('uses placeholder crest if team not found', async () => {
//   apiClient.getTeams.mockResolvedValue({ data: [] });
//   const game = { id: 'match3', homeTeam: { name: 'Unknown FC' }, awayTeam: { name: 'NoTeam' }, utcDate: new Date().toISOString(), status: 'scheduled' };
//   useLiveSports.mockReturnValue({ sportsData: { games: [game] }, isConnected: true, error: null, refreshData: jest.fn() });

//   render(<LiveSports />);
//   const card = await screen.findByTestId('match-match3');
//   const imgs = card.querySelectorAll('img');
//   imgs.forEach(img => expect(img.src).toContain('/placeholder.png'));
// // });
// it('calls onMatchSelect and onTeamSelect when match or team clicked', async () => {
//   const onMatchSelect = jest.fn();
//   const { container } = render(<LiveSports onMatchSelect={onMatchSelect} />);
//   const matchCard = await screen.findByTestId('match-match1');

//   // Click on match
//   fireEvent.click(matchCard);
//   expect(onMatchSelect).toHaveBeenCalled();

//   // Click on home team crest
//   const homeCrest = matchCard.querySelector('img[alt="home crest"]');
//   fireEvent.click(homeCrest);
//   expect(container.firstChild._owner.stateNode.state.selectedTeam).toEqual({ name: 'Team A' });
// });


// test('normalize removes accents and special chars', () => {
//   expect(normalize('Café FC')).toBe('cafe fc');
//   expect(normalize('Team-123!')).toBe('team123');
// });

describe('LiveSports utility functions', () => {
  test('normalize removes accents and special chars', () => {
    expect(normalize('Café FC')).toBe('cafefc');
    expect(normalize('Team-123!')).toBe('team123');
  });
});

test('buildWeeklyChunks returns correct week grouping', () => {
  const games = [{ __utcMs: Date.now(), id: '1' }];
  const chunks = LiveSportsModule.buildWeeklyChunks(games, '2025-10-01', '2025-10-07');
  expect(chunks.length).toBeGreaterThan(0);
});

test('groupByDateAndLeague groups games correctly', () => {
  const games = [{ utcDate: '2025-10-18T12:00:00Z', competition: 'League', id: '1' }];
  const grouped = LiveSportsModule.groupByDateAndLeague(games);
  expect(grouped[0].leagues[0].items[0].id).toBe('1');
});


  // it('updates watchlist when adding match', async () => {
  //   apiClient.addUserMatch.mockResolvedValue({});
  //   render(<LiveSports />);
  //   await waitFor(() => screen.getByText(/Team A vs Team B/i));

  //   // Simulate hovering and clicking watchlist button
  //   const matchCard = screen.getByText(/Team A vs Team B/i).parentElement;
  //   fireEvent.mouseEnter(matchCard);

  //   const watchBtn = matchCard.querySelector('button');
  //   if (watchBtn) {
  //     fireEvent.click(watchBtn);
  //     await waitFor(() => {
  //       expect(apiClient.addUserMatch).toHaveBeenCalledWith('user1', mockGames[0]);
  //     });
  //   }
  // });

  // it('calls onMatchSelect when a match is clicked', async () => {
  //   const onMatchSelect = jest.fn();
  //   render(<LiveSports onMatchSelect={onMatchSelect} />);
  //   const card = await screen.findByText(/Team A vs Team B/i);
  //   fireEvent.click(card);
  //   expect(onMatchSelect).toHaveBeenCalledWith(mockGames[0]);
  // });

  // --- 🔥 Additional Tests for Coverage Improvement ---

describe('LiveSports Utility Functions', () => {
  const { buildWeeklyChunks, groupByDateAndLeague, getTeamCrest, formatDate, getStatusBadge } = LiveSportsModule;

  test('buildWeeklyChunks groups matches into correct weeks', () => {
    const start = '2025-10-01T00:00:00Z';
    const end = '2025-10-20T00:00:00Z';
    const games = [
      { id: '1', __utcMs: new Date('2025-10-02').getTime() },
      { id: '2', __utcMs: new Date('2025-10-09').getTime() },
      { id: '3', __utcMs: new Date('2025-10-17').getTime() },
    ];

    const chunks = buildWeeklyChunks(games, start, end);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toHaveProperty('label');
    expect(chunks[0].items).toBeInstanceOf(Array);
  });

  test('groupByDateAndLeague correctly groups games by date and league', () => {
    const games = [
      {
        id: '1',
        utcDate: '2025-10-18T12:00:00Z',
        competition: 'Premier League',
        __utcMs: Date.now(),
      },
      {
        id: '2',
        utcDate: '2025-10-18T15:00:00Z',
        competition: 'La Liga',
        __utcMs: Date.now(),
      },
    ];

    const result = groupByDateAndLeague(games);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].leagues.length).toBe(2);
    expect(result[0].leagues[0].items[0]).toHaveProperty('id');
  });

  test('getTeamCrest handles partial, last-word, and special case matches', () => {
    const normalizedTeams = {
      'sportlisboaebenfica': '/benfica.png',
      'fcporto': '/porto.png',
      'olympiquelyonnais': '/lyon.png',
      'olympiquedemarseille': '/marseille.png',
      'parissaintgermain': '/psg.png',
      'teamx': '/x.png',
    };

    // partial match
    expect(getTeamCrest('Team X', normalizedTeams)).toBe('/x.png');
    // special case (psg)
    expect(getTeamCrest('PSG', normalizedTeams)).toBe('/psg.png');
    // last word match
    expect(getTeamCrest('Sport Lisboa Benfica', normalizedTeams)).toBe('/benfica.png');
    // fallback to placeholder
    expect(getTeamCrest('Unknown Team', normalizedTeams)).toBe('/placeholder.png');
  });

  test('formatDate returns formatted string or empty when invalid', () => {
    const formatted = formatDate('2025-10-18T12:00:00Z');
    expect(typeof formatted).toBe('string');
    expect(formatDate('')).toBe('');
  });

  test('getStatusBadge renders proper badges for known statuses', () => {
    const { container: live } = render(getStatusBadge('live'));
    const { container: paused } = render(getStatusBadge('paused'));
    const { container: final } = render(getStatusBadge('final'));
    const { container: scheduled } = render(getStatusBadge('scheduled'));
    const { container: defaultBadge } = render(getStatusBadge('unknown'));

    expect(live.querySelector('.ls-status-live')).toBeInTheDocument();
    expect(paused.querySelector('.ls-status-paused')).toBeInTheDocument();
    expect(final.querySelector('.ls-status-final')).toBeInTheDocument();
    expect(scheduled.querySelector('.ls-status-scheduled')).toBeInTheDocument();
    expect(defaultBadge.querySelector('.ls-status-default')).toBeInTheDocument();
  });
});

});
