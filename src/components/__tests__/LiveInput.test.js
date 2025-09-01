import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LiveInput from '../liveInput/LiveInput';
import { useUser } from '@clerk/clerk-react';

jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
}));

// Mock Date.now to make IDs predictable
const MOCK_ID = 12345;
global.Date.now = jest.fn(() => MOCK_ID);

describe('LiveInput Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useUser.mockReturnValue({ user: { id: 'u1', publicMetadata: { role: 'admin' } } });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders access denied for non-admin', () => {
    useUser.mockReturnValue({ user: { id: 'u1', publicMetadata: { role: 'user' } } });
    render(<LiveInput />);
    expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
  });

  test('renders admin interface', () => {
    render(<LiveInput isAdmin />);
    expect(screen.getByText(/Live Match Input/i)).toBeInTheDocument();
    expect(screen.getByText(/Match Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Possession/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Match Event/i)).toBeInTheDocument();
  });

  test('timer start, pause, and reset', () => {
    render(<LiveInput isAdmin />);
    const startBtn = screen.getByText('Start');
    const resetBtn = screen.getByText('Reset');
    const timeDisplay = screen.getByText('00:00');

    // Start timer
    fireEvent.click(startBtn);
    expect(screen.getByText('Pause')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000); // advance 2 seconds
    });
    expect(timeDisplay.textContent).toBe('00:02');

    // Pause timer
    fireEvent.click(screen.getByText('Pause'));
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(timeDisplay.textContent).toBe('00:02');

    // Reset timer
    fireEvent.click(resetBtn);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  test('update score and possession', () => {
    render(<LiveInput isAdmin />);
    const homeInput = screen.getAllByRole('spinbutton')[0];
    const awayInput = screen.getAllByRole('spinbutton')[1];
    const possessionSlider = screen.getByRole('slider');

    fireEvent.change(homeInput, { target: { value: '2' } });
    expect(homeInput.value).toBe('2');

    fireEvent.change(awayInput, { target: { value: '3' } });
    expect(awayInput.value).toBe('3');

    fireEvent.change(possessionSlider, { target: { value: '60' } });
    expect(possessionSlider.value).toBe('60');
    expect(screen.getByText(/Home: 60%/i)).toBeInTheDocument();
    expect(screen.getByText(/Away: 40%/i)).toBeInTheDocument();
  });

  test('add and remove event', () => {
    render(<LiveInput isAdmin />);

    const playerInput = screen.getByPlaceholderText('Player Name');
    const descriptionInput = screen.getByPlaceholderText('Event description');
    const addBtn = screen.getByText('Add Event');

    fireEvent.change(playerInput, { target: { value: 'Messi' } });
    fireEvent.change(descriptionInput, { target: { value: 'Scored a goal' } });

    fireEvent.click(addBtn);

    // Check that event appears in log
    const eventDetails = screen.getByText(/Home - Messi: Scored a goal/i);
    expect(eventDetails).toBeInTheDocument();
    const goalIcon = screen.getByText('⚽');
    expect(goalIcon).toBeInTheDocument();

    // Remove event
    const removeBtn = screen.getByText('×');
    fireEvent.click(removeBtn);
    expect(eventDetails).not.toBeInTheDocument();
  });

  test('minute updates with timer', () => {
    render(<LiveInput isAdmin />);
    const playerInput = screen.getByPlaceholderText('Player Name');
    const descriptionInput = screen.getByPlaceholderText('Event description');
    const addBtn = screen.getByText('Add Event');

    // Start timer
    fireEvent.click(screen.getByText('Start'));
    act(() => {
      jest.advanceTimersByTime(65000); // 65 seconds
    });

    fireEvent.change(playerInput, { target: { value: 'Ramos' } });
    fireEvent.change(descriptionInput, { target: { value: 'Yellow card' } });
    fireEvent.click(addBtn);

    const event = screen.getByText(/Home - Ramos: Yellow card/i);
    expect(event).toBeInTheDocument();
    expect(screen.getByText(/1'/i)).toBeInTheDocument(); // minute should be 1
  });
});
