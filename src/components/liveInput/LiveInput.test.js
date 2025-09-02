import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LiveInput from './LiveInput';
import { useUser } from '@clerk/clerk-react';
import { isAdminFromUser } from '../../lib/roles';

jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn()
}));

jest.mock('../../lib/roles', () => ({
  isAdminFromUser: jest.fn()
}));

describe('LiveInput Component', () => {
  const mockUser = { id: 'user123' };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('shows access denied for non-admin', () => {
    useUser.mockReturnValue({ user: mockUser });
    isAdminFromUser.mockReturnValue(false);
    render(<LiveInput />);
    expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
  });

  test('renders correctly for admin', () => {
    useUser.mockReturnValue({ user: mockUser });
    isAdminFromUser.mockReturnValue(true);
    render(<LiveInput />);
    expect(screen.getByText(/Live Match Input/i)).toBeInTheDocument();
    expect(screen.getByText(/Match Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Match Event/i)).toBeInTheDocument();
  });

  test('timer starts and increments', () => {
    useUser.mockReturnValue({ user: mockUser });
    isAdminFromUser.mockReturnValue(true);
    render(<LiveInput />);

    const startBtn = screen.getByText(/Start/i);
    fireEvent.click(startBtn);
    expect(screen.getByText(/Pause/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3000); // 3 seconds
    });

    expect(screen.getByText(/00:03/)).toBeInTheDocument();
  });

  test('timer resets', () => {
    useUser.mockReturnValue({ user: mockUser });
    isAdminFromUser.mockReturnValue(true);
    render(<LiveInput />);

    const startBtn = screen.getByText(/Start/i);
    fireEvent.click(startBtn);
    act(() => jest.advanceTimersByTime(5000));
    fireEvent.click(screen.getByText(/Reset/i));

    expect(screen.getByText(/00:00/)).toBeInTheDocument();
  });

  test('score inputs change', () => {
    useUser.mockReturnValue({ user: mockUser });
    isAdminFromUser.mockReturnValue(true);
    render(<LiveInput />);

    const [homeInput, awayInput] = screen.getAllByRole('spinbutton');
    fireEvent.change(homeInput, { target: { value: '2' } });
    fireEvent.change(awayInput, { target: { value: '1' } });

    expect(homeInput.value).toBe('2');
    expect(awayInput.value).toBe('1');
  });

  test('possession slider changes', () => {
    useUser.mockReturnValue({ user: mockUser });
    isAdminFromUser.mockReturnValue(true);
    render(<LiveInput />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '70' } });

    expect(screen.getByText(/Home: 70%/i)).toBeInTheDocument();
    expect(screen.getByText(/Away: 30%/i)).toBeInTheDocument();
  });

  test('adds an event with player', () => {
    useUser.mockReturnValue({ user: mockUser });
    isAdminFromUser.mockReturnValue(true);
    render(<LiveInput />);

    const playerInput = screen.getByPlaceholderText(/Player Name/i);
    const descriptionInput = screen.getByPlaceholderText(/Event description/i);
    const addBtn = screen.getByText(/Add Event/i);

    fireEvent.change(playerInput, { target: { value: 'Player1' } });
    fireEvent.change(descriptionInput, { target: { value: 'Scored a goal' } });
    fireEvent.click(addBtn);

    expect(screen.getByText(/Player1/i)).toBeInTheDocument();
    expect(screen.getByText(/Scored a goal/i)).toBeInTheDocument();
  });

  test('does not add event without player', () => {
    useUser.mockReturnValue({ user: mockUser });
    isAdminFromUser.mockReturnValue(true);
    render(<LiveInput />);

    const descriptionInput = screen.getByPlaceholderText(/Event description/i);
    const addBtn = screen.getByText(/Add Event/i);

    fireEvent.change(descriptionInput, { target: { value: 'No player' } });
    fireEvent.click(addBtn);

    expect(screen.getByText(/No events recorded yet/i)).toBeInTheDocument();
  });

  test('removes an event', () => {
    useUser.mockReturnValue({ user: mockUser });
    isAdminFromUser.mockReturnValue(true);
    render(<LiveInput />);

    const playerInput = screen.getByPlaceholderText(/Player Name/i);
    const addBtn = screen.getByText(/Add Event/i);

    fireEvent.change(playerInput, { target: { value: 'Player2' } });
    fireEvent.click(addBtn);

    const removeBtn = screen.getByText('×');
    fireEvent.click(removeBtn);

    expect(screen.getByText(/No events recorded yet/i)).toBeInTheDocument();
  });

  test('handles event type and team selection', () => {
    useUser.mockReturnValue({ user: mockUser });
    isAdminFromUser.mockReturnValue(true);
    render(<LiveInput />);

    const typeSelect = screen.getByDisplayValue('goal');
    const teamSelect = screen.getByDisplayValue('home');

    fireEvent.change(typeSelect, { target: { value: 'yellow' } });
    fireEvent.change(teamSelect, { target: { value: 'away' } });

    expect(typeSelect.value).toBe('yellow');
    expect(teamSelect.value).toBe('away');
  });
});
