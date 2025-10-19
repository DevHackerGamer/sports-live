import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventFeed from '../EventFeeds/EventFeed';

// Mock CSS to avoid import errors
jest.mock('../../styles/EventFeed.css', () => ({}));

// Mapping for event types to emojis
const typeToEmoji = {
  goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
  substitution: '🔁',
  match_start: '▶️',
  match_end: '⏹️',
  half_time: '⏸️',
  injury: '🚑',
  yellowred: '🟨🟥',
  penalty: '⚽️❗',
  owngoal: '🥅❌',
  foul: '🚫',
  corner: '� corner',
  freekick: '🎯',
  offside: '🚩',
  save: '🧤',
  other: '🔔',
};

describe('EventFeed Component', () => {
  test('renders heading and initial events', () => {
    render(<EventFeed />);

    expect(screen.getByText('Live Event Feed')).toBeInTheDocument();
    expect(screen.getByText('Match started')).toBeInTheDocument();
    expect(screen.getByText('Left foot shot to bottom corner')).toBeInTheDocument();
    expect(screen.getByText('Professional foul')).toBeInTheDocument();
  });

  test('renders event meta only when team/player exist', () => {
    render(<EventFeed />);

    const barcaEvents = screen.getAllByText(/FC Barcelona/i);
    expect(barcaEvents).toHaveLength(2);

    expect(screen.getByText(/Messi/i)).toBeInTheDocument();
    expect(screen.getByText(/Suarez/i)).toBeInTheDocument();

    const eventWithoutTeam = screen.getByText('Match started').closest('.event-item');
    expect(eventWithoutTeam.textContent).not.toContain('•');
  });

  test('adds a new event when form is filled correctly', () => {
    render(<EventFeed />);

    const timeInput = screen.getByPlaceholderText('Time (e.g., 23:45)');
    const teamInput = screen.getByPlaceholderText('Team');
    const playerInput = screen.getByPlaceholderText('Player');
    const descriptionArea = screen.getByPlaceholderText('Event description');
    const addButton = screen.getByText('Add Event');

    fireEvent.change(timeInput, { target: { value: '75:00' } });
    fireEvent.change(teamInput, { target: { value: 'Chelsea' } });
    fireEvent.change(playerInput, { target: { value: 'Drogba' } });
    fireEvent.change(descriptionArea, { target: { value: 'Header goal from corner' } });

    fireEvent.click(addButton);

    expect(screen.getByText(/Header goal from corner/i)).toBeInTheDocument();
    expect(screen.getByText(/Chelsea/i)).toBeInTheDocument();
    expect(screen.getByText(/Drogba/i)).toBeInTheDocument();

    expect(timeInput.value).toBe('');
    expect(teamInput.value).toBe('');
    expect(playerInput.value).toBe('');
    expect(descriptionArea.value).toBe('');
  });

  test('does not add event if required fields are missing', () => {
    render(<EventFeed />);
    const addButton = screen.getByText('Add Event');
    fireEvent.click(addButton);

    const events = document.querySelectorAll('.event-item');
    expect(events.length).toBe(6);
  });

  // ✅ Fixed test for all event icons
  test('renders correct icons for selectable event types', () => {
    render(<EventFeed />);

    const selectableTypes = [
      'goal', 'yellow_card', 'red_card', 'substitution',
      'match_start', 'half_time', 'match_end', 'other'
    ];

    selectableTypes.forEach(type => {
      const timeInput = screen.getByPlaceholderText('Time (e.g., 23:45)');
      const descriptionArea = screen.getByPlaceholderText('Event description');
      const typeSelect = screen.getByRole('combobox');
      const addButton = screen.getByText('Add Event');

      fireEvent.change(timeInput, { target: { value: '10:00' } });
      fireEvent.change(descriptionArea, { target: { value: `Test ${type}` } });
      fireEvent.change(typeSelect, { target: { value: type } });
      fireEvent.click(addButton);

      const allEventItems = document.querySelectorAll('.event-item');
      const lastEvent = allEventItems[allEventItems.length - 1];
      const icon = lastEvent.querySelector('.event-icon').textContent;

      expect(icon).toContain(typeToEmoji[type]);
    });
  });
});