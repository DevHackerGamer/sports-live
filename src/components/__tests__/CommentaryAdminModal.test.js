import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommentaryAdminModal from '../liveInput/CommentaryAdminModal';
import { apiClient } from '../../lib/api';

jest.mock('../../lib/api', () => ({
  apiClient: {
    getCommentary: jest.fn(),
    addCommentary: jest.fn(),
    overwriteCommentary: jest.fn(),
  },
}));

describe('CommentaryAdminModal', () => {
  const matchId = 'match1';
  const onCloseMock = jest.fn();

  const mockComments = [
    { id: 1, time: "12'", text: 'Goal by Player 1' },
    { id: 2, time: "34'", text: 'Yellow card for Player 2' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.getCommentary.mockResolvedValue(mockComments);
    apiClient.addCommentary.mockResolvedValue({});
    apiClient.overwriteCommentary.mockResolvedValue({});
  });

  it('renders null if modal is closed', () => {
    const { container } = render(
      <CommentaryAdminModal matchId={matchId} isOpen={false} onClose={onCloseMock} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('fetches and displays comments when opened', async () => {
    render(
      <CommentaryAdminModal matchId={matchId} isOpen={true} onClose={onCloseMock} />
    );

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Goal by Player 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Yellow card for Player 2/i)).toBeInTheDocument();
    });
  });

  it('adds a new comment', async () => {
    render(
      <CommentaryAdminModal matchId={matchId} isOpen={true} onClose={onCloseMock} />
    );

    await waitFor(() => screen.getByText(/Goal by Player 1/i));

    fireEvent.change(screen.getByPlaceholderText(/Enter commentary/i), {
      target: { value: 'Corner kick' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Time/i), {
      target: { value: "45'" },
    });

    fireEvent.click(screen.getByText(/Add/i));

    await waitFor(() => {
      expect(apiClient.addCommentary).toHaveBeenCalledWith(matchId, {
        id: expect.any(Number),
        time: "45'",
        text: 'Corner kick',
      });
      expect(apiClient.getCommentary).toHaveBeenCalledTimes(2); // fetch after add
    });
  });

  it('deletes a comment', async () => {
    render(
      <CommentaryAdminModal matchId={matchId} isOpen={true} onClose={onCloseMock} />
    );

    await waitFor(() => screen.getByText(/Goal by Player 1/i));

    const deleteBtns = screen.getAllByText('🗑');
    fireEvent.click(deleteBtns[0]);

    await waitFor(() => {
      expect(apiClient.overwriteCommentary).toHaveBeenCalledWith(matchId, [
        { id: 2, time: "34'", text: 'Yellow card for Player 2' },
      ]);
      expect(apiClient.getCommentary).toHaveBeenCalledTimes(2); // fetch after delete
    });
  });

  it('calls onClose when Close button is clicked', async () => {
    render(
      <CommentaryAdminModal matchId={matchId} isOpen={true} onClose={onCloseMock} />
    );

    await waitFor(() => screen.getByText(/Goal by Player 1/i));

    fireEvent.click(screen.getByText(/Close/i));
    expect(onCloseMock).toHaveBeenCalled();
  });
});
