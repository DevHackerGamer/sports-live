import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamInfo from "../TeamInfo/TeamInfo"; 
import { apiClient } from '../../lib/api';

// Mock apiClient
jest.mock("../../lib/api", () => ({
  apiClient: {
    getTeamById: jest.fn(),
    getMatchesByDate: jest.fn(),
  },
}));

// Mock TeamPlayers
jest.mock("../TeamInfo/TeamPlayers", () => () => <div data-testid="team-players">Mock Players</div>);

describe("TeamInfo", () => {
  const mockTeam = {
    id: 1,
    name: "Test FC",
    crest: "crest.png",
    founded: 1900,
    shortName: "TFC",
    tla: "TST",
    venue: "Test Stadium",
    address: "123 Street",
    clubColors: "Red/White",
    website: "http://testfc.com",
  };

  const onBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders team details in About tab by default", async () => {
    apiClient.getTeamById.mockResolvedValueOnce({ success: true, data: mockTeam });

    render(<TeamInfo team={mockTeam} onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText("About Test FC")).toBeInTheDocument();
    });

    expect(screen.getByText(/Founded:/)).toHaveTextContent("Founded:");
    expect(screen.getByRole("heading", { name: "Test FC" })).toBeInTheDocument();
  });

  it("switches to Players tab and renders TeamPlayers", async () => {
    render(<TeamInfo team={mockTeam} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: /Players/i }));

    expect(await screen.findByTestId("team-players")).toBeInTheDocument();
  });

  it("fetches and displays upcoming matches", async () => {
    const mockMatches = [
      {
        id: 101,
        utcDate: new Date().toISOString(),
        homeTeam: { id: 1, name: "Test FC", crest: "crest.png" },
        awayTeam: { id: 2, name: "Opponent FC", crest: "opp.png" },
      },
    ];

    apiClient.getMatchesByDate.mockResolvedValueOnce({ data: mockMatches });

    render(<TeamInfo team={mockTeam} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: /Next Matches/i }));

    expect(await screen.findByText('Test FC')).toBeInTheDocument();
    expect(await screen.findByText('Opponent FC')).toBeInTheDocument();
    expect(await screen.findByText('vs')).toBeInTheDocument();

  });

  it("shows message when no matches are returned", async () => {
    apiClient.getMatchesByDate.mockResolvedValueOnce({ data: [] });

    render(<TeamInfo team={mockTeam} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: /Next Matches/i }));

    expect(
      await screen.findByText(/No upcoming matches scheduled for Test FC./)
    ).toBeInTheDocument();
  });

  it("calls onBack when back button clicked", () => {
    render(<TeamInfo team={mockTeam} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: /← Back/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
