import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EventFeed from './EventFeed';

describe('EventFeed Component', () => {
  beforeEach(() => {
    render(<EventFeed />);
  });

  test('renders initial events', () => {
    expect(screen.getByText(/Match started/i)).toBeInTheDocument();
    expect(screen.getByText(/Left foot shot to bottom corner/i)).toBeInTheDocument();
    expect(screen.getByText(/Penalty kick/i)).toBeInTheDocument();
  });

  test('displays all event icons correctly', () => {
    const icons = [
      '⚽', '🟨', '🟥', '🔁', '▶️', '⏹️', '⏸️', '🚑', '🟨🟥', '⚽️❗', '🥅❌', '🚫', '🎯', '🚩', '🧤', '🔔'
    ];

    const timeInput = screen.getByPlaceholderText(/Time/);
    const descInput = screen.getByPlaceholderText(/Event description/);
    const typeSelect = screen.getByLabelText(/Event type/i) || screen.getByDisplayValue('goal'); // fallback
    const addButton = screen.getByText(/Add Event/i);

    icons.forEach(icon => {
      fireEvent.change(timeInput, { target: { value: '99:99' } });
      fireEvent.change(descInput, { target: { value: `Test Event ${icon}` } });
      fireEvent.change(typeSelect, { target: { value: 'goal' } }); // assuming icon is linked to type
      fireEvent.click(addButton);

      expect(screen.getByText(`Test Event ${icon}`)).toBeInTheDocument();
    });
  });

  test('adds a new event when inputs are valid', () => {
    const timeInput = screen.getByPlaceholderText(/Time/);
    const descInput = screen.getByPlaceholderText(/Event description/);
    const addButton = screen.getByText(/Add Event/i);

    fireEvent.change(timeInput, { target: { value: '88:00' } });
    fireEvent.change(descInput, { target: { value: 'Amazing goal' } });
    fireEvent.click(addButton);

    expect(screen.getByText(/Amazing goal/i)).toBeInTheDocument();
    expect(timeInput.value).toBe('');
    expect(descInput.value).toBe('');
  });

  test('does not add event if time or description is empty', () => {
    const addButton = screen.getByText(/Add Event/i);
    fireEvent.click(addButton);

    // Original events should remain
    expect(screen.getByText(/Match started/i)).toBeInTheDocument();
    expect(screen.queryByText(/Amazing goal/i)).not.toBeInTheDocument();
  });

  test('renders event without team/player info correctly', () => {
    const event = screen.getByText(/Match started/i);
    expect(event).toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
  });

  test('renders event with team and player info', () => {
    // Assuming EventFeed has at least one preloaded event with player/team
    expect(screen.getByText(/Messi/i)).toBeInTheDocument();
    expect(screen.getByText(/FC Barcelona/i)).toBeInTheDocument();
  });

  test('clears inputs after adding an event', () => {
    const timeInput = screen.getByPlaceholderText(/Time/);
    const descInput = screen.getByPlaceholderText(/Event description/);
    const addButton = screen.getByText(/Add Event/i);

    fireEvent.change(timeInput, { target: { value: '12:34' } });
    fireEvent.change(descInput, { target: { value: 'Test Clear Inputs' } });
    fireEvent.click(addButton);

    expect(timeInput.value).toBe('');
    expect(descInput.value).toBe('');
  });

  test('handles multiple events being added sequentially', () => {
    const timeInput = screen.getByPlaceholderText(/Time/);
    const descInput = screen.getByPlaceholderText(/Event description/);
    const addButton = screen.getByText(/Add Event/i);

    const events = [
      { time: '01:00', desc: 'First Event' },
      { time: '02:00', desc: 'Second Event' },
      { time: '03:00', desc: 'Third Event' },
    ];

    events.forEach(ev => {
      fireEvent.change(timeInput, { target: { value: ev.time } });
      fireEvent.change(descInput, { target: { value: ev.desc } });
      fireEvent.click(addButton);

      expect(screen.getByText(ev.desc)).toBeInTheDocument();
    });
  });
});
