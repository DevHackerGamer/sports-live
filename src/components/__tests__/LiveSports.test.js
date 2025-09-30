import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import LiveSports from "../sports/LiveSports";

// mock the custom hook
jest.mock("../../hooks/useLiveSports", () => ({
  useLiveSports: jest.fn(),
}));

const { useLiveSports } = require("../../hooks/useLiveSports");

// helper to flush timers
const flushTimers = async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("LiveSports Component", () => {
  it("renders loading state initially", () => {
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: false,
      error: null,
      lastUpdated: null,
      refreshData: jest.fn(),
    });

    render(<LiveSports />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(screen.getByText(/loading live matches/i)).toBeInTheDocument();
  });

  it("renders error state when error exists", () => {
    const mockRefresh = jest.fn();
    useLiveSports.mockReturnValue({
      sportsData: null,
      isConnected: false,
      error: new Error("boom"),
      lastUpdated: null,
      refreshData: mockRefresh,
    });

    render(<LiveSports />);
    expect(screen.getByTestId("error")).toBeInTheDocument();
    expect(screen.getByText(/connection error/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/retry/i));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("renders empty state when no matches", () => {
    const mockRefresh = jest.fn();
    useLiveSports.mockReturnValue({
      sportsData: {
        games: [], // ✅ array, not object
        totalMatches: 0,
        dateFrom: "2025-01-01",
        dateTo: "2025-01-07",
      },
      isConnected: true,
      error: null,
      lastUpdated: new Date(),
      refreshData: mockRefresh,
    });

    render(<LiveSports />);
    expect(screen.getByTestId("empty")).toBeInTheDocument();
    expect(screen.getByText(/no matches available/i)).toBeInTheDocument();

    // pick the first refresh (the one inside empty state)
    const refreshButtons = screen.getAllByText(/refresh/i);
    fireEvent.click(refreshButtons[0]);
    expect(mockRefresh).toHaveBeenCalled();
  });

 

});
