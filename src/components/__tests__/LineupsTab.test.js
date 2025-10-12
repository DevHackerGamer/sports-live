import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import LineupsTab from "../matchViewer/LineupsTab";
import { apiClient } from "../../lib/api";

jest.mock("../../lib/api", () => ({
  apiClient: {
    getLineupsByMatch: jest.fn(),
    getTeams: jest.fn(),
  },
}));

describe("LineupsTab Component", () => {
  const mockMatch = {
    id: "match123",
    homeTeam: { id: "1", name: "Team A", crest: "/teamA.png" },
    awayTeam: { id: "2", name: "Team B", crest: "/teamB.png" },
  };

  const mockTeams = [
    { id: "1", name: "Team A", crest: "/teamA.png" },
    { id: "2", name: "Team B", crest: "/teamB.png" },
  ];

  const mockLineups = [
    {
      teamId: "1",
      starters: [
        { _id: "H1", name: "Home Player 1", position: "GK", nationality: "SA" },
      ],
      substitutes: [
        { _id: "H2", name: "Home Player 2", position: "DF", nationality: "BR" },
      ],
    },
    {
      teamId: "2",
      starters: [
        { _id: "A1", name: "Away Player 1", position: "MF", nationality: "EN" },
      ],
      substitutes: [
        { _id: "A2", name: "Away Player 2", position: "FW", nationality: "FR" },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders loading state initially", () => {
    apiClient.getTeams.mockResolvedValueOnce({ data: [] });
    apiClient.getLineupsByMatch.mockResolvedValueOnce([]);

    render(<LineupsTab match={mockMatch} />);
    expect(screen.getByText(/loading lineups/i)).toBeInTheDocument();
  });

  test("renders lineups correctly after API call", async () => {
    apiClient.getTeams.mockResolvedValueOnce({ data: mockTeams });
    apiClient.getLineupsByMatch.mockResolvedValueOnce(mockLineups);

    render(<LineupsTab match={mockMatch} />);

    // Wait for table to appear
    await waitFor(() => {
      expect(screen.getByText("Team A")).toBeInTheDocument();
      expect(screen.getByText("Team B")).toBeInTheDocument();

      // Check starter player names
      expect(screen.getByText("Home Player 1")).toBeInTheDocument();
      expect(screen.getByText("Away Player 1")).toBeInTheDocument();

      // Check substitute player names
      expect(screen.getByText("Home Player 2")).toBeInTheDocument();
      expect(screen.getByText("Away Player 2")).toBeInTheDocument();
    });
  });

  test("renders error state if API call fails", async () => {
    apiClient.getTeams.mockRejectedValueOnce(new Error("Teams API Error"));
    apiClient.getLineupsByMatch.mockResolvedValueOnce([]);

    render(<LineupsTab match={mockMatch} />);

    await waitFor(() => {
      expect(screen.getByText(/Teams API Error/i)).toBeInTheDocument();
    });
  });

  test("renders empty state if no lineup data", async () => {
    apiClient.getTeams.mockResolvedValueOnce({ data: mockTeams });
    apiClient.getLineupsByMatch.mockResolvedValueOnce([]);

    render(<LineupsTab match={mockMatch} />);

    await waitFor(() => {
      expect(screen.getByText(/No lineup data found/i)).toBeInTheDocument();
    });
  });

  test("resolves team logos correctly", async () => {
    apiClient.getTeams.mockResolvedValueOnce({ data: mockTeams });
    apiClient.getLineupsByMatch.mockResolvedValueOnce(mockLineups);

    render(<LineupsTab match={mockMatch} />);

    await waitFor(() => {
      const homeLogo = screen.getByAltText("Team A");
      const awayLogo = screen.getByAltText("Team B");

      expect(homeLogo).toHaveAttribute("src", "/teamA.png");
      expect(awayLogo).toHaveAttribute("src", "/teamB.png");
    });
  });
});
