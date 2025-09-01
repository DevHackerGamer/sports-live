import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EventFeed from '../EventFeeds/EventFeed';

describe('EventFeed Component', () => {

  test('renders the main feed', () => {
    render(<EventFeed />);
    expect(screen.getByTestId('event-feed-title')).toHaveTextContent('Live Event Feed');
    expect(screen.getByTestId('event-container')).toBeInTheDocument();
    expect(screen.getByTestId('add-event-form')).toBeInTheDocument();
  });

  test('renders initial events with time, description, meta and icons', () => {
    render(<EventFeed />);
    const firstEvent = screen.getByTestId('event-item-1');
    expect(firstEvent).toBeInTheDocument();

    expect(screen.getByTestId('event-time-2')).toHaveTextContent('23:15');
    expect(screen.getByTestId('event-description-2')).toHaveTextContent('Left foot shot to bottom corner');
    expect(screen.getByTestId('event-meta-2')).toHaveTextContent('FC Barcelona • Messi');

    // Check icons
    expect(screen.getByTestId('event-icon-1')).toHaveTextContent('▶️');
    expect(screen.getByTestId('event-icon-5')).toHaveTextContent('🟨');
    expect(screen.getByTestId('event-icon-6')).toHaveTextContent('🔁');
  });

  test('can type in the add event form', () => {
    render(<EventFeed />);
    fireEvent.change(screen.getByTestId('new-event-time'), { target: { value: '70:00' } });
    fireEvent.change(screen.getByTestId('new-event-type'), { target: { value: 'yellow_card' } });
    fireEvent.change(screen.getByTestId('new-event-team'), { target: { value: 'Liverpool' } });
    fireEvent.change(screen.getByTestId('new-event-player'), { target: { value: 'Salah' } });
    fireEvent.change(screen.getByTestId('new-event-description'), { target: { value: 'Foul play' } });

    expect(screen.getByTestId('new-event-time')).toHaveValue('70:00');
    expect(screen.getByTestId('new-event-type')).toHaveValue('yellow_card');
    expect(screen.getByTestId('new-event-team')).toHaveValue('Liverpool');
    expect(screen.getByTestId('new-event-player')).toHaveValue('Salah');
    expect(screen.getByTestId('new-event-description')).toHaveValue('Foul play');
  });

  test('can add a new event', () => {
    render(<EventFeed />);
    fireEvent.change(screen.getByTestId('new-event-time'), { target: { value: '70:00' } });
    fireEvent.change(screen.getByTestId('new-event-description'), { target: { value: 'Foul play' } });
    fireEvent.click(screen.getByTestId('add-event-button'));

    expect(screen.getByText('Foul play')).toBeInTheDocument();
    expect(screen.getByText('70:00')).toBeInTheDocument();
  });

  test('does not add event if time or description is missing', () => {
    render(<EventFeed />);
    fireEvent.change(screen.getByTestId('new-event-time'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('new-event-description'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('add-event-button'));

    const events = screen.getAllByTestId(/event-item-/);
    expect(events.length).toBe(6); // initial events remain
  });

  test('renders default icon for unknown event type', () => {
    render(<EventFeed />);
    fireEvent.change(screen.getByTestId('new-event-time'), { target: { value: '80:00' } });
    fireEvent.change(screen.getByTestId('new-event-description'), { target: { value: 'Weird event' } });
    fireEvent.change(screen.getByTestId('new-event-type'), { target: { value: 'weird' } });
    fireEvent.click(screen.getByTestId('add-event-button'));

    const newEventIcon = screen.getByTestId('event-icon-7'); // 6 initial + 1 new
    expect(newEventIcon).toHaveTextContent('🔔');
  });

  test('renders all icons correctly for coverage', () => {
    const iconTypes = [
      'goal', 'yellow_card', 'red_card', 'substitution', 'match_start', 
      'half_time', 'match_end', 'injury', 'yellowred', 'penalty', 
      'owngoal', 'foul', 'corner', 'freekick', 'offside', 'save'
    ];

    const { container } = render(<EventFeed />);
    iconTypes.forEach((type, index) => {
      fireEvent.change(screen.getByTestId('new-event-time'), { target: { value: `${index+90}:00` } });
      fireEvent.change(screen.getByTestId('new-event-type'), { target: { value: type } });
      fireEvent.change(screen.getByTestId('new-event-description'), { target: { value: `${type} description` } });
      fireEvent.click(screen.getByTestId('add-event-button'));
    });

    iconTypes.forEach((type, index) => {
      const eventId = 7 + index; // initial 6 + first added event = 7...
      expect(screen.getByTestId(`event-icon-${eventId}`)).toBeInTheDocument();
    });
  });
});
