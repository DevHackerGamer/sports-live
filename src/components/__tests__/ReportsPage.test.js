import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ReportsPage from '../ReportsPage/ReportsPage';
import { apiClient } from '../../lib/api';

jest.mock('../../lib/api', () => ({
  apiClient: {
    getReports: jest.fn(),
    getMatchById: jest.fn(),
    getMatchEvents: jest.fn(),
    updateReport: jest.fn(),
    deleteReport: jest.fn(),
  },
}));

// Mock LiveInput
jest.mock('../liveInput/LiveInput', () => () => <div>LiveInput Component</div>);

describe('ReportsPage Component', () => {
  const mockReports = [
    {
      _id: 'r1',
      matchId: 'm1',
      eventId: 'e1',
      title: 'Bug 1',
      description: 'Description 1',
      status: 'open',
      createdAt: '2025-01-01T12:00:00Z',
    },
  ];

  const mockMatch = {
    id: 'm1',
    homeTeam: { name: 'Team A' },
    awayTeam: { name: 'Team B' },
    utcDate: '2025-01-01T12:00:00Z',
  };

  const mockEvent = [
    { _id: 'e1', type: 'Goal', minute: 23, player: 'Player 1', description: 'Scored' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.getReports.mockResolvedValue({ data: mockReports });
    apiClient.getMatchById.mockResolvedValue({ data: mockMatch });
    apiClient.getMatchEvents.mockResolvedValue({ data: mockEvent });
    apiClient.updateReport.mockResolvedValue({});
    apiClient.deleteReport.mockResolvedValue({});
    window.confirm = jest.fn(() => true);
  });

  it('renders report data including match and event details', async () => {
    render(<ReportsPage />);

    const row = await screen.findByText(/Bug 1/i).then(el => el.closest('tr'));

    await waitFor(() => {
      expect(within(row).getByText(/Team A vs Team B/i)).toBeInTheDocument();
      expect(within(row).getByText(/23' Goal - Player 1 \(Scored\)/i)).toBeInTheDocument();
    });

    expect(within(row).getByText(/Description 1/i)).toBeInTheDocument();
  });

  it('filters reports by status', async () => {
    render(<ReportsPage />);
    await screen.findByText(/Bug 1/i);

    const controls = screen.getByText(/Bug Reports/i).closest('div');
    const filterSelect = within(controls).getAllByRole('combobox')[0];
    fireEvent.change(filterSelect, { target: { value: 'resolved' } });

    await waitFor(() => expect(screen.getByText(/No reports found/i)).toBeInTheDocument());
  });

  it('updates report status', async () => {
    render(<ReportsPage />);
    const row = await screen.findByText(/Bug 1/i).then(el => el.closest('tr'));

    const statusSelect = within(row).getByRole('combobox');
    fireEvent.change(statusSelect, { target: { value: 'resolved' } });

    await waitFor(() =>
      expect(apiClient.updateReport).toHaveBeenCalledWith('r1', { status: 'resolved' })
    );
  });

  it('clears filters when Clear Filters is clicked', async () => {
    render(<ReportsPage />);
    await screen.findByText(/Bug 1/i);

    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'Bug' } });
    fireEvent.click(screen.getByText(/Clear Filters/i));

    expect(screen.getByPlaceholderText(/Search/i)).toHaveValue('');
    expect(screen.getAllByRole('option', { name: /All/i })[0].selected).toBe(true);
  });

  it('shows loading placeholders for match and event details', async () => {
    apiClient.getMatchById.mockResolvedValueOnce({ data: null });
    apiClient.getMatchEvents.mockResolvedValueOnce({ data: [] });

    render(<ReportsPage />);
    const row = await screen.findByText(/Bug 1/i).then(el => el.closest('tr'));

    const placeholders = within(row).getAllByText(/Loading.../i);
    expect(placeholders).toHaveLength(2);
  });

  it('deletes a report when delete is confirmed', async () => {
    render(<ReportsPage />);
    const row = await screen.findByText(/Bug 1/i).then(el => el.closest('tr'));

    const deleteBtn = within(row).getByText(/Delete/i);
    fireEvent.click(deleteBtn);

    await waitFor(() =>
      expect(apiClient.deleteReport).toHaveBeenCalledWith('r1')
    );
  });

  it('handles updateStatus API error', async () => {
    apiClient.updateReport.mockRejectedValueOnce(new Error('Update failed'));
    render(<ReportsPage />);
    const row = await screen.findByText(/Bug 1/i).then(el => el.closest('tr'));

    window.alert = jest.fn();
    const statusSelect = within(row).getByRole('combobox');
    fireEvent.change(statusSelect, { target: { value: 'resolved' } });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed')));
  });

 


  it('views a match and shows LiveInput', async () => {
    render(<ReportsPage />);
    const row = await screen.findByText(/Bug 1/i).then(el => el.closest('tr'));

    const viewBtn = within(row).getByText(/View/i);
    fireEvent.click(viewBtn);

    await waitFor(() =>
      expect(screen.getByText(/LiveInput Component/i)).toBeInTheDocument()
    );
  });

  it('handles error state', async () => {
    apiClient.getReports.mockRejectedValueOnce(new Error('Failed'));
    render(<ReportsPage />);
    await waitFor(() =>
      expect(screen.getByText(/Failed to fetch reports/i)).toBeInTheDocument()
    );
  });
});