import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import LineupsAdminModal from "../components/LineupsAdminModal/LineupsAdminModal";
import { apiClient } from "../../lib/api";

// 🧩 Mock apiClient methods
jest.mock("../../lib/api", () => ({
  apiClient: {
    getLineupsByMatch: jest.fn(),
    saveLineup: jest.fn(),
  },
}));

// 🧩 Mock fetch for player fetching
global.fetch = jest.fn();

describe("LineupsAdminModal Component", () => {
  const mockMatch = {
    id: "match123",
    homeTeam: { id: "1", name: "Team A" },
    awayTeam: { id: "2", name: "Team B" },
  };

  const mockHomePlayers = [
    { id: "H1", name: "Home Player 1", position: "GK" },
    { id: "H2", name: "Home Player 2", position: "DF" },
  ];

  const mockAwayPlayers = [
    { id: "A1", name: "Away Player 1", position: "MF" },
    { id: "A2", name: "Away Player 2", position: "FW" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders loading state initially", async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockHomePlayers }) });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockAwayPlayers }) });
    apiClient.getLineupsByMatch.mockResolvedValueOnce([]);

    render(<LineupsAdminModal match={mockMatch} onClose={jest.fn()} />);
    expect(screen.getByText(/loading lineups/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Team A Lineup")).toBeInTheDocument();
      expect(screen.getByText("Team B Lineup")).toBeInTheDocument();
    });
  });

  test("displays players for both teams after fetch", async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockHomePlayers }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockAwayPlayers }) });
    apiClient.getLineupsByMatch.mockResolvedValueOnce([]);

    render(<LineupsAdminModal match={mockMatch} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Home Player 1 (GK)")).toBeInTheDocument();
      expect(screen.getByText("Away Player 1 (MF)")).toBeInTheDocument();
    });
  });

  test("toggles player between starter and substitute when clicked", async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockHomePlayers }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockAwayPlayers }) });
    apiClient.getLineupsByMatch.mockResolvedValueOnce([]);

    render(<LineupsAdminModal match={mockMatch} onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText("Home Player 1 (GK)")).toBeInTheDocument());

    const playerCard = screen.getByText("Home Player 1 (GK)");
    expect(playerCard).toHaveClass("substitute");

    // First click → starter
    fireEvent.click(playerCard);
    expect(playerCard).toHaveClass("starter");

    // Second click → substitute again
    fireEvent.click(playerCard);
    expect(playerCard).toHaveClass("substitute");
  });

  test("shows starter summary updates correctly", async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockHomePlayers }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockAwayPlayers }) });
    apiClient.getLineupsByMatch.mockResolvedValueOnce([]);

    render(<LineupsAdminModal match={mockMatch} onClose={jest.fn()} />);

    await waitFor(() => screen.getByText("Home Player 1 (GK)"));

    fireEvent.click(screen.getByText("Home Player 1 (GK)"));

    await waitFor(() => {
      expect(screen.getByText("Starters Summary")).toBeInTheDocument();
      expect(screen.getByText("Home Player 1")).toBeInTheDocument();
    });
  });

  test("saves lineups successfully", async () => {
    window.alert = jest.fn();

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockHomePlayers }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockAwayPlayers }) });
    apiClient.getLineupsByMatch.mockResolvedValueOnce([]);

    const onCloseMock = jest.fn();
    apiClient.saveLineup.mockResolvedValueOnce({ success: true });

    render(<LineupsAdminModal match={mockMatch} onClose={onCloseMock} />);

    await waitFor(() => screen.getByText("Home Player 1 (GK)"));

    // Add one starter
    fireEvent.click(screen.getByText("Home Player 1 (GK)"));

    // Save
    fireEvent.click(screen.getByText(/save lineups/i));

    await waitFor(() => {
      expect(apiClient.saveLineup).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith("✅ Lineups saved successfully");
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  test("handles save error gracefully", async () => {
    window.alert = jest.fn();

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockHomePlayers }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockAwayPlayers }) });
    apiClient.getLineupsByMatch.mockResolvedValueOnce([]);
    apiClient.saveLineup.mockRejectedValueOnce(new Error("Save failed"));

    render(<LineupsAdminModal match={mockMatch} onClose={jest.fn()} />);

    await waitFor(() => screen.getByText("Home Player 1 (GK)"));
    fireEvent.click(screen.getByText(/save lineups/i));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("❌ Failed to save lineups");
    });
  });

  test("calls onClose when Cancel is clicked", async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockHomePlayers }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ players: mockAwayPlayers }) });
    apiClient.getLineupsByMatch.mockResolvedValueOnce([]);

    const onCloseMock = jest.fn();
    render(<LineupsAdminModal match={mockMatch} onClose={onCloseMock} />);

    await waitFor(() => screen.getByText("Cancel"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCloseMock).toHaveBeenCalled();
  });
});
