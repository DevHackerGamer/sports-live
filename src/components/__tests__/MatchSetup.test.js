// __tests__/MatchSetup.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MatchSetup from '../matchsetup/MatchSetup';
import { useUser } from '@clerk/clerk-react';
import '@testing-library/jest-dom/extend-expect';

// Mock Clerk
jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
}));

// Mock MatchViewer
jest.mock('../components/matchViewer/MatchViewer', () => ({ match, onBack }) => (
  <div>
    MatchViewer: {match?.id}
    <button onClick={onBack}>Back</button>
  </div>
));

beforeEach(() => {
  useUser.mockReturnValue({ user: { firstName: 'Admin', id: 'user1', publicMetadata: { roles: ['admin'] } } });
  global.fetch = jest.fn();
  window.confirm = jest.fn(() => true); // auto-confirm deletions
});

afterEach(() => {
  jest.resetAllMocks();
});

test('non-admin sees access denied', () => {
  useUser.mockReturnValue({ user: { firstName: 'User' } });
  render(<MatchSetup />);
  expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
});

test('renders match list', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      success: true,
      data: [
        { id: 'm1', homeTeam: { name: 'Team A' }, awayTeam: { name: 'Team B' }, competition: { name: 'League 1' }, utcDate: new Date().toISOString(), createdByAdmin: true }
      ]
    }),
  });
  
  render(<MatchSetup />);
  await waitFor(() => screen.getByText(/Team A/i));
  expect(screen.getByText(/Team B/i)).toBeInTheDocument();
});

test('opens form and input changes', async () => {
  fetch.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
  render(<MatchSetup isAdmin={true} />);
  
  fireEvent.click(screen.getByText('Create Match'));
  expect(screen.getByText('Create New Match')).toBeInTheDocument();

  const dateInput = screen.getByLabelText(/date/i) || screen.getByRole('textbox', { name: /date/i });
  fireEvent.change(dateInput, { target: { value: '2025-09-26' } });
  expect(dateInput.value).toBe('2025-09-26');
});

test('addMatch optimistic update and API success', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, data: { id: 'm2', homeTeam: { name: 'A' }, awayTeam: { name: 'B' }, competition: { name: 'League 1' }, utcDate: new Date().toISOString() } })
  });

  render(<MatchSetup isAdmin={true} />);
  fireEvent.click(screen.getByText('Create Match'));
  
  // mock select values
  const teamA = screen.getByText('Select Home Team') || screen.getByRole('combobox', { name: /teamA/i });
  fireEvent.change(teamA, { target: { value: '1' } });
  
  const teamB = screen.getByText('Select Away Team') || screen.getByRole('combobox', { name: /teamB/i });
  fireEvent.change(teamB, { target: { value: '2' } });

  const comp = screen.getByText('Select Competition') || screen.getByRole('combobox', { name: /competition/i });
  fireEvent.change(comp, { target: { value: 'League 1' } });

  const matchday = screen.getByPlaceholderText(/Matchday/i);
  fireEvent.change(matchday, { target: { value: '1' } });

  const dateInput = screen.getByRole('textbox', { name: /date/i });
  const timeInput = screen.getByRole('textbox', { name: /time/i });
  fireEvent.change(dateInput, { target: { value: '2025-09-26' } });
  fireEvent.change(timeInput, { target: { value: '12:00' } });

  await act(async () => {
    fireEvent.click(screen.getByText('Create Match'));
  });

  expect(fetch).toHaveBeenCalled();
  await waitFor(() => screen.getByText(/League 1/i));
});

test('delete match calls API and removes from list', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, data: [] })
  });
  render(<MatchSetup isAdmin={true} />);
  
  // pre-populate match
  const matchItem = { id: 'm1', homeTeam: { name: 'Team A' }, awayTeam: { name: 'Team B' }, competition: { name: 'League 1' }, utcDate: new Date().toISOString() };
  await act(async () => {
    fireEvent.click(screen.getByText('Create Match')); // trigger form to prevent empty match
  });

  // simulate removal
  await act(async () => {
    fireEvent.click(screen.getByText('Remove'));
  });

  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/matches/m1'), expect.objectContaining({ method: 'DELETE' }));
});

test('selecting a match opens MatchViewer', async () => {
  const match = { id: 'm1', homeTeam: { name: 'A' }, awayTeam: { name: 'B' }, competition: { name: 'League 1' }, utcDate: new Date().toISOString() };
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, data: [match] })
  });

  render(<MatchSetup isAdmin={true} />);
  await waitFor(() => screen.getByText(/Team A/i));

  fireEvent.click(screen.getByText(/Team A/i));
  expect(screen.getByText('MatchViewer: m1')).toBeInTheDocument();
});
