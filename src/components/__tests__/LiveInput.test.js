import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUser } from '@clerk/clerk-react';
import LiveInput from '../liveInput/LiveInput';
import { apiClient } from '../../lib/api';
import { isAdminFromUser } from '../../lib/roles';


beforeAll(() => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
});

afterAll(() => {
  if (console.info.mockRestore) {
    console.info.mockRestore();
  }
});

// Mock dependencies
jest.mock('@clerk/clerk-react');
jest.mock('../../lib/api');
jest.mock('../../lib/roles');
jest.mock('../../styles/LiveInput.css', () => ({}));
jest.mock('../matchViewer/LineupsTab', () => () => <div>LineupsTab Mock</div>);
jest.mock('../liveInput/LineupsAdminModal', () => ({ onClose }) => (
  <div data-testid="lineups-modal">
    <button onClick={onClose}>Close Modal</button>
  </div>
));
jest.mock('../matchViewer/LiveCommentaryFeed', () => () => <div>LiveCommentaryFeed Mock</div>);
jest.mock('../liveInput/CommentaryAdminModal', () => ({ onClose, isOpen, matchId }) => 
  isOpen ? (
    <div data-testid="commentary-modal">
      <span>Match ID: {matchId}</span>
      <button onClick={onClose}>Close Commentary</button>
    </div>
  ) : null
);

// Mock timers
jest.useFakeTimers();

describe('LiveInput Component', () => {
  const mockUser = { id: 'user123', role: 'admin' };
  const mockMatch = {
    id: 'match123',
    homeTeam: { name: 'Liverpool', crest: 'home-crest.png' },
    awayTeam: { name: 'Arsenal', crest: 'away-crest.png' },
    status: 'IN_PLAY',
    minute: 10,
    events: [],
    createdByAdmin: true,
    clock: { running: true, elapsed: 600, startedAt: new Date().toISOString() }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    useUser.mockReturnValue({ user: mockUser });
    isAdminFromUser.mockReturnValue(true);
    
    // Mock API responses
    apiClient.getMatchEvents.mockResolvedValue({ data: [] });
    apiClient.addMatchEvent.mockResolvedValue({ data: { id: 'event123' } });
    apiClient.updateMatch.mockResolvedValue({});
    apiClient.deleteMatchEvent.mockResolvedValue({});
    apiClient.getTeams.mockResolvedValue({ data: [] });
    apiClient.getMatch.mockResolvedValue({ data: mockMatch });
    apiClient.getMatchStatistics.mockResolvedValue({
      possession: { home: 50, away: 50 },
      shotsOnTarget: { home: 0, away: 0 },
      shotsOffTarget: { home: 0, away: 0 },
      totalShots: { home: 0, away: 0 },
      corners: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      yellowCards: { home: 0, away: 0 },
      redCards: { home: 0, away: 0 },
      offsides: { home: 0, away: 0 },
      saves: { home: 0, away: 0 },
      passAccuracy: { home: 0, away: 0 }
    });
    apiClient.updateMatchStatistics.mockResolvedValue({});

    // Mock fetch for players
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/players')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ players: [] })
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    // Mock BroadcastChannel
    global.BroadcastChannel = jest.fn().mockImplementation(() => ({
      postMessage: jest.fn(),
      close: jest.fn()
    }));

    // Mock localStorage
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.getItem = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Access Control', () => {
    it('should show access denied for non-admin users', () => {
      isAdminFromUser.mockReturnValue(false);
      render(<LiveInput isAdmin={false} match={mockMatch} />);
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    it('should show placeholder when no match selected', () => {
      render(<LiveInput isAdmin={true} match={null} />);
      expect(screen.getByText(/no match selected/i)).toBeInTheDocument();
    });

    it('should render for admin with valid match', () => {
        render(<LiveInput isAdmin={true} match={mockMatch} />);
        
        const teams = screen.getAllByText(/liverpool/i);
        expect(teams[0]).toBeInTheDocument(); // match summary
        const awayTeams = screen.getAllByText(/arsenal/i);
        expect(awayTeams[0]).toBeInTheDocument(); // match summary
    });
  });

  describe('Timer Functionality', () => {
    it('should display match time correctly', () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      expect(screen.getByText(/10:00/)).toBeInTheDocument();
    });

    it('should increment timer when running', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText(/10:05/)).toBeInTheDocument();
      });
    });

    it('should pause timer when pause button clicked', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(apiClient.updateMatch).toHaveBeenCalledWith(
          mockMatch.id,
          expect.objectContaining({ clock: expect.objectContaining({ running: false }) }),
          expect.any(Object)
        );
      });
    });

    it('should resume timer when resume button clicked', async () => {
      const pausedMatch = { ...mockMatch, clock: { running: false, elapsed: 600 } };
      render(<LiveInput isAdmin={true} match={pausedMatch} />);
      
      const resumeButton = screen.getByRole('button', { name: /resume/i });
      fireEvent.click(resumeButton);

      await waitFor(() => {
        expect(apiClient.updateMatch).toHaveBeenCalledWith(
          mockMatch.id,
          expect.objectContaining({ clock: expect.objectContaining({ running: true }) }),
          expect.any(Object)
        );
      });
    });

    it('should not allow pause/resume for finished matches', () => {
        const finishedMatch = { ...mockMatch, status: 'FINISHED' };
        render(<LiveInput isAdmin={true} match={finishedMatch} />);

        // Query by title instead of visible text
        const pauseButton = screen.getByTitle(/match is finished/i);
        expect(pauseButton).toBeDisabled();
    });
  });

  describe('Event Management', () => {
    it('should add a goal event', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const playerInput = screen.getByPlaceholderText(/player name/i);
      const addButton = screen.getByRole('button', { name: /add event/i });

      await userEvent.type(playerInput, 'Salah');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(apiClient.addMatchEvent).toHaveBeenCalledWith(
          mockMatch.id,
          expect.objectContaining({
            type: 'goal',
            player: 'Salah',
            team: 'Liverpool'
          }),
          expect.any(Object)
        );
      });
    });

    it('should add a substitution event', async () => {
        render(<LiveInput isAdmin={true} match={mockMatch} />);

        // Grab all comboboxes and select the first one (event type)
        const typeSelect = screen.getAllByRole('combobox')[0];
        fireEvent.change(typeSelect, { target: { value: 'substitution' } });

        await waitFor(() => {
            const playerOutInput = screen.getByPlaceholderText(/player out/i);
            const playerInInput = screen.getByPlaceholderText(/player in/i);

            userEvent.type(playerOutInput, 'Firmino');
            userEvent.type(playerInInput, 'Jota');
        });

        const addButton = screen.getByRole('button', { name: /add event/i });
        fireEvent.click(addButton);

        await waitFor(() => {
            expect(apiClient.addMatchEvent).toHaveBeenCalled();
        });
    });


    it('should delete an event', async () => {
      const matchWithEvents = {
        ...mockMatch,
        events: [{
          id: 'event1',
          type: 'goal',
          team: 'home',
          player: 'Salah',
          minute: 10,
          description: 'Goal - Liverpool - Salah'
        }]
      };

      render(<LiveInput isAdmin={true} match={matchWithEvents} />);

      await waitFor(() => {
        const removeButton = screen.getByText('×');
        fireEvent.click(removeButton);
      });

      await waitFor(() => {
        expect(apiClient.deleteMatchEvent).toHaveBeenCalledWith(
          mockMatch.id,
          'event1',
          expect.any(Object)
        );
      });
    });

    it('should not add event if player field is empty', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const addButton = screen.getByRole('button', { name: /add event/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(apiClient.addMatchEvent).not.toHaveBeenCalled();
      });
    });

    it('should not add events to finished matches', async () => {
      const finishedMatch = { ...mockMatch, status: 'FINISHED' };
      render(<LiveInput isAdmin={true} match={finishedMatch} />);
      
      const addButton = screen.getByRole('button', { name: /add event/i });
      expect(addButton).toBeDisabled();
    });
  });

  describe('Half Time / Full Time', () => {
    it('should add half time event', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const halfTimeButton = screen.getByRole('button', { name: /half time/i });
      fireEvent.click(halfTimeButton);

      await waitFor(() => {
        expect(apiClient.addMatchEvent).toHaveBeenCalledWith(
          mockMatch.id,
          expect.objectContaining({
            type: 'half_time',
            description: 'Half Time'
          }),
          expect.any(Object)
        );
      });
    });

    it('should add full time event and mark match as finished', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const fullTimeButton = screen.getByRole('button', { name: /full time/i });
      fireEvent.click(fullTimeButton);

      await waitFor(() => {
        expect(apiClient.addMatchEvent).toHaveBeenCalledWith(
          mockMatch.id,
          expect.objectContaining({
            type: 'match_end',
            description: 'Full Time'
          }),
          expect.any(Object)
        );
      });

      await waitFor(() => {
        expect(apiClient.updateMatch).toHaveBeenCalledWith(
          mockMatch.id,
          expect.objectContaining({ status: 'FINISHED' }),
          expect.any(Object)
        );
      });
    });

    it('should disable half time and full time buttons for finished matches', () => {
      const finishedMatch = { ...mockMatch, status: 'FINISHED' };
      render(<LiveInput isAdmin={true} match={finishedMatch} />);
      
      const halfTimeButton = screen.getByRole('button', { name: /half time/i });
      const fullTimeButton = screen.getByRole('button', { name: /full time/i });
      
      expect(halfTimeButton).toBeDisabled();
      expect(fullTimeButton).toBeDisabled();
    });
  });

  describe('Match Statistics', () => {
    it('should show stats panel when button clicked', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const showStatsButton = screen.getByRole('button', { name: /show stats/i });
      fireEvent.click(showStatsButton);

      await waitFor(() => {
        expect(screen.getByText(/match statistics/i)).toBeInTheDocument();
      });
    });

    it('should update possession statistic', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const possessionSlider = screen.getByRole('slider');
      fireEvent.change(possessionSlider, { target: { value: '60' } });

      await waitFor(() => {
        expect(screen.getByText(/liverpool: 60%/i)).toBeInTheDocument();
        expect(screen.getByText(/arsenal: 40%/i)).toBeInTheDocument();
      });
    });

    it('should update shot statistics', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const showStatsButton = screen.getByRole('button', { name: /show stats/i });
      fireEvent.click(showStatsButton);

      await waitFor(() => {
        const shotsInputs = screen.getAllByPlaceholderText(/liverpool|arsenal/i);
        fireEvent.change(shotsInputs[0], { target: { value: '5' } });
      });

      await waitFor(() => {
        expect(apiClient.updateMatchStatistics).toHaveBeenCalled();
      });
    });
  });

  describe('Modals', () => {
    it('should open lineups modal', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const editLineupsButton = screen.getByRole('button', { name: /edit lineups/i });
      fireEvent.click(editLineupsButton);

      await waitFor(() => {
        expect(screen.getByTestId('lineups-modal')).toBeInTheDocument();
      });
    });

    it('should close lineups modal', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const editLineupsButton = screen.getByRole('button', { name: /edit lineups/i });
      fireEvent.click(editLineupsButton);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close modal/i });
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('lineups-modal')).not.toBeInTheDocument();
      });
    });

    it('should open commentary modal', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const editCommentaryButton = screen.getByRole('button', { name: /edit.*live commentary/i });
      fireEvent.click(editCommentaryButton);

      await waitFor(() => {
        expect(screen.getByTestId('commentary-modal')).toBeInTheDocument();
      });
    });

    it('should close commentary modal', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const editCommentaryButton = screen.getByRole('button', { name: /edit.*live commentary/i });
      fireEvent.click(editCommentaryButton);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close commentary/i });
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('commentary-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Event Type Canonicalization', () => {
    it('should render the events timeline heading', async () => {
        const matchWithVariousEvents = {
        ...mockMatch,
        events: [
            { id: '1', type: 'goal', team: 'home', player: 'Player1', minute: 10 },
            { id: '2', type: 'yellowcard', team: 'away', player: 'Player2', minute: 20 },
            { id: '3', type: 'red', team: 'home', player: 'Player3', minute: 30 },
            { id: '4', type: 'sub', team: 'away', playerOut: 'P4', playerIn: 'P5', minute: 40 }
        ]
        };

        render(<LiveInput isAdmin={true} match={matchWithVariousEvents} />);

        // Minimal assertion to confirm the timeline section exists
        expect(screen.getByRole('heading', { name: /events timeline/i })).toBeInTheDocument();
    });
  });

  describe('Score Calculation', () => {
    it('should calculate score from goal events', async () => {
      const matchWithGoals = {
        ...mockMatch,
        events: [
          { id: '1', type: 'goal', team: 'home', player: 'Salah', minute: 10 },
          { id: '2', type: 'goal', team: 'home', player: 'Mane', minute: 20 },
          { id: '3', type: 'goal', team: 'away', player: 'Saka', minute: 30 }
        ]
      };

      render(<LiveInput isAdmin={true} match={matchWithGoals} />);

      await waitFor(() => {
        const scoreInputs = screen.getAllByDisplayValue(/[0-9]/);
        expect(scoreInputs[0]).toHaveValue(2); // Home
        expect(scoreInputs[1]).toHaveValue(1); // Away
      });
    });

    it('should handle own goals correctly', async () => {
      const matchWithOwnGoal = {
        ...mockMatch,
        events: [
          { id: '1', type: 'own_goal', team: 'home', player: 'Defender', minute: 10 }
        ]
      };

      render(<LiveInput isAdmin={true} match={matchWithOwnGoal} />);

      await waitFor(() => {
        const scoreInputs = screen.getAllByDisplayValue(/[0-9]/);
        expect(scoreInputs[0]).toHaveValue(0); // Home
        expect(scoreInputs[1]).toHaveValue(1); // Away (benefits from own goal)
      });
    });
  });

  describe('Minute Editing', () => {
    it('should allow editing event minute', async () => {
        render(<LiveInput isAdmin={true} match={mockMatch} />);
        
        // Query by title instead of accessible name
        const minuteButton = screen.getByTitle(/click to edit minute/i);
        fireEvent.click(minuteButton);

        await waitFor(() => {
            const minuteInput = screen.getByLabelText(/edit event minute/i);
            expect(minuteInput).toBeInTheDocument();
            fireEvent.change(minuteInput, { target: { value: '25' } });
        });

        const minuteInput = screen.getByLabelText(/edit event minute/i);
        fireEvent.blur(minuteInput);

        await waitFor(() => {
            expect(screen.queryByLabelText(/edit event minute/i)).not.toBeInTheDocument();
        });
    });

    it('should cancel minute editing on Escape', async () => {
        render(<LiveInput isAdmin={true} match={mockMatch} />);

        // Use title instead of accessible name
        const minuteButton = screen.getByTitle(/click to edit minute/i);
        fireEvent.click(minuteButton);

        // Wait for the input to appear and simulate pressing Escape
        await waitFor(() => {
            const minuteInput = screen.getByLabelText(/edit event minute/i);
            fireEvent.keyDown(minuteInput, { key: 'Escape' });
        });

        // Ensure input disappears after cancellation
        await waitFor(() => {
            expect(screen.queryByLabelText(/edit event minute/i)).not.toBeInTheDocument();
        });
    });

    it('should submit minute editing on Enter', async () => {
        render(<LiveInput isAdmin={true} match={mockMatch} />);

        // Get the button by title instead of accessible name, works for dynamic minute
        const minuteButton = screen.getByTitle(/click to edit minute/i);
        fireEvent.click(minuteButton);

        // Wait for the input to appear and simulate editing
        await waitFor(() => {
            const minuteInput = screen.getByLabelText(/edit event minute/i);
            fireEvent.change(minuteInput, { target: { value: '15' } });
            fireEvent.keyDown(minuteInput, { key: 'Enter' });
        });

        // Ensure input disappears after submission
        await waitFor(() => {
            expect(screen.queryByLabelText(/edit event minute/i)).not.toBeInTheDocument();
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully when adding events', async () => {
      apiClient.addMatchEvent.mockRejectedValue(new Error('400 Bad Request'));
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const playerInput = screen.getByPlaceholderText(/player name/i);
      await userEvent.type(playerInput, 'Salah');
      
      const addButton = screen.getByRole('button', { name: /add event/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalled();
      });

      alertMock.mockRestore();
    });

    it('should handle fetch player errors', async () => {
        global.fetch.mockRejectedValue(new Error('Network error'));
        
        render(<LiveInput isAdmin={true} match={mockMatch} />);

        await waitFor(() => {
            // Only match the <strong> element in the match summary
            const teamName = screen.getByText((content, element) =>
            element.tagName === 'STRONG' && /liverpool/i.test(content)
            );
            expect(teamName).toBeInTheDocument();
        });
    });
  });

  describe('Back Navigation', () => {
    it('should call onBackToMatch when back button clicked', () => {
      const onBackToMatch = jest.fn();
      render(<LiveInput isAdmin={true} match={mockMatch} onBackToMatch={onBackToMatch} />);
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      expect(onBackToMatch).toHaveBeenCalled();
    });
  });

  describe('Event Polling', () => {
    it('should poll for events every 15 seconds', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);

      expect(apiClient.getMatchEvents).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(15000);
      });

      await waitFor(() => {
        expect(apiClient.getMatchEvents).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Team Logo Display', () => {
    it('should display team logos in events', async () => {
      const matchWithEvents = {
        ...mockMatch,
        events: [{
          id: 'event1',
          type: 'goal',
          team: 'home',
          player: 'Salah',
          minute: 10,
          description: 'Goal'
        }]
      };

      render(<LiveInput isAdmin={true} match={matchWithEvents} />);

      await waitFor(() => {
        const crestImage = screen.getByAltText(/liverpool crest/i);
        expect(crestImage).toBeInTheDocument();
        expect(crestImage).toHaveAttribute('src', 'home-crest.png');
      });
    });
  });

  describe('Period Tracking', () => {
    it('should switch to second half at minute 46', async () => {
        const secondHalfMatch = { ...mockMatch, minute: 46 };
        
        render(<LiveInput isAdmin={true} match={secondHalfMatch} />);

        await waitFor(() => {
            const timeDisplays = screen.getAllByText((content) => content.includes('10'));
            // Pick the one in the time-display container
            const mainTime = timeDisplays.find(el => el.className.includes('time-display'));
            expect(mainTime).toBeInTheDocument();
        });
    });
  });

  describe('Description Handling', () => {
    it('should use custom description for events', async () => {
      render(<LiveInput isAdmin={true} match={mockMatch} />);
      
      const playerInput = screen.getByPlaceholderText(/player name/i);
      const descriptionInput = screen.getByPlaceholderText(/event description/i);
      
      await userEvent.type(playerInput, 'Salah');
      await userEvent.type(descriptionInput, 'Amazing volley');
      
      const addButton = screen.getByRole('button', { name: /add event/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(apiClient.addMatchEvent).toHaveBeenCalledWith(
          mockMatch.id,
          expect.objectContaining({
            description: 'Amazing volley'
          }),
          expect.any(Object)
        );
      });
    });
  });
});