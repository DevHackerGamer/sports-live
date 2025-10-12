import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LiveCommentaryFeed from "../matchViewer/LiveCommentaryFeed" ;
import { apiClient } from "../../lib/api";

// 🧩 Mock apiClient
jest.mock("../../lib/api", () => ({
  apiClient: {
    getCommentary: jest.fn(),
  },
}));

// ⏱ Mock setInterval/clearInterval to avoid real timing
jest.useFakeTimers();

describe("LiveCommentaryFeed Component", () => {
  const mockMatchId = "12345";

  const mockComments = [
    { id: 1, time: "12'", text: "Kickoff! The game begins." },
    { id: 2, time: "23'", text: "Goal! What a strike!" },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders loading state initially", async () => {
    apiClient.getCommentary.mockResolvedValueOnce([]);
    render(<LiveCommentaryFeed matchId={mockMatchId} />);
    expect(screen.getByText(/loading commentary/i)).toBeInTheDocument();
  });

  test("renders commentary after API resolves", async () => {
    apiClient.getCommentary.mockResolvedValueOnce(mockComments);
    render(<LiveCommentaryFeed matchId={mockMatchId} />);

    await waitFor(() =>
      expect(screen.getByText("Kickoff! The game begins.")).toBeInTheDocument()
    );
    expect(screen.getByText("Goal! What a strike!")).toBeInTheDocument();
  });

  test("renders 'no commentary' message when list is empty", async () => {
    apiClient.getCommentary.mockResolvedValueOnce([]);
    render(<LiveCommentaryFeed matchId={mockMatchId} />);

    await waitFor(() =>
      expect(screen.getByText(/no commentary yet/i)).toBeInTheDocument()
    );
  });

  test("handles API error gracefully", async () => {
    console.error = jest.fn(); // suppress expected console error
    apiClient.getCommentary.mockRejectedValueOnce(new Error("API Error"));
    render(<LiveCommentaryFeed matchId={mockMatchId} />);

    await waitFor(() =>
      expect(screen.queryByText(/loading commentary/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText(/no commentary yet/i)).toBeInTheDocument();
  });

  test("does not fetch data if no matchId is provided", async () => {
    render(<LiveCommentaryFeed />);
    expect(apiClient.getCommentary).not.toHaveBeenCalled();
  });

  test("refreshes commentary every 10 seconds", async () => {
    apiClient.getCommentary.mockResolvedValue(mockComments);
    render(<LiveCommentaryFeed matchId={mockMatchId} />);

    // Run initial fetch
    await waitFor(() =>
      expect(apiClient.getCommentary).toHaveBeenCalledTimes(1)
    );

    // Advance time by 10 seconds → should trigger again
    jest.advanceTimersByTime(10000);
    await waitFor(() =>
      expect(apiClient.getCommentary).toHaveBeenCalledTimes(2)
    );
  });
});
