import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FavoritesPanel from "../favouritespanel/FavoritesPanel" ;

// Mock Clerk
jest.mock("@clerk/clerk-react", () => ({
  useUser: jest.fn(),
}));

// Mock API client
jest.mock("../../lib/api", () => ({
  apiClient: {
    getMatchesByDate: jest.fn(),
    getTeams: jest.fn(),
    getUserFavorites: jest.fn(),
    addUserFavorite: jest.fn(),
    removeUserFavorite: jest.fn(),
  },
}));

import { useUser } from "@clerk/clerk-react";
import { apiClient } from "../../lib/api";

describe("FavoritesPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders sign-in message if no user", () => {
    useUser.mockReturnValue({ user: null });

    render(<FavoritesPanel />);

    expect(screen.getByTestId("no-user")).toHaveTextContent(
      "Please sign in to manage favorites"
    );
  });

  test("renders with no favorites", async () => {
    useUser.mockReturnValue({ user: { id: "user_123" } });
    apiClient.getUserFavorites.mockResolvedValue({ data: [] });
    apiClient.getTeams.mockResolvedValue({ data: [] });
    apiClient.getMatchesByDate.mockResolvedValue({ data: [] });

    render(<FavoritesPanel />);

    expect(await screen.findByTestId("no-favorites")).toBeInTheDocument();
  });

  test("can add a favorite", async () => {
    useUser.mockReturnValue({ user: { id: "user_123" } });
    apiClient.getUserFavorites.mockResolvedValue({ data: [] });
    apiClient.getTeams.mockResolvedValue({
      data: [{ name: "Arsenal" }, { name: "Chelsea" }],
    });
    apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
    apiClient.addUserFavorite.mockResolvedValue({});

    render(<FavoritesPanel />);

    const input = await screen.findByTestId("add-input");
    fireEvent.change(input, { target: { value: "Arsenal" } });

    const button = screen.getByTestId("add-button");
    fireEvent.click(button);

    await waitFor(() =>
      expect(apiClient.addUserFavorite).toHaveBeenCalledWith("user_123", "Arsenal")
    );
  });
  
  test("shows loading state while fetching matches", async () => {
  useUser.mockReturnValue({ user: { id: "user_123" } });
  apiClient.getUserFavorites.mockResolvedValue({ data: [] });
  apiClient.getTeams.mockResolvedValue({ data: [] });

  // Make matches API slow
  let resolveMatches;
  apiClient.getMatchesByDate.mockReturnValue(new Promise(r => (resolveMatches = r)));

  render(<FavoritesPanel />);
  expect(screen.getByTestId("loading")).toHaveTextContent("Loading matches...");

  resolveMatches({ data: [] });
});

test("disables add button when input is invalid", async () => {
  useUser.mockReturnValue({ user: { id: "user_123" } });
  apiClient.getUserFavorites.mockResolvedValue({ data: [] });
  apiClient.getTeams.mockResolvedValue({ data: [{ name: "Arsenal" }] });
  apiClient.getMatchesByDate.mockResolvedValue({ data: [] });

  render(<FavoritesPanel />);
  const input = await screen.findByTestId("add-input");
  fireEvent.change(input, { target: { value: "InvalidTeam" } });

  const button = screen.getByTestId("add-button");
  expect(button).toBeDisabled();
});

test("pressing Enter adds a favorite", async () => {
  useUser.mockReturnValue({ user: { id: "user_123" } });
  apiClient.getUserFavorites.mockResolvedValue({ data: [] });
  apiClient.getTeams.mockResolvedValue({ data: [{ name: "Chelsea" }] });
  apiClient.getMatchesByDate.mockResolvedValue({ data: [] });

  render(<FavoritesPanel />);
  const input = await screen.findByTestId("add-input");
  fireEvent.change(input, { target: { value: "Chelsea" } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

  await waitFor(() =>
    expect(apiClient.addUserFavorite).toHaveBeenCalledWith("user_123", "Chelsea")
  );
});



test("renders favorite item with upcoming matches", async () => {
  useUser.mockReturnValue({ user: { id: "user_123" } });
  apiClient.getUserFavorites.mockResolvedValue({ data: ["Arsenal"] });
  apiClient.getTeams.mockResolvedValue({ data: [{ name: "Arsenal" }] });
  apiClient.getMatchesByDate.mockResolvedValue({
    data: [
      {
        id: "1",
        homeTeam: { name: "Arsenal" },
        awayTeam: { name: "Chelsea" },
        utcDate: new Date().toISOString(),
        competition: "Premier League",
      },
    ],
  });

  const onMatchSelect = jest.fn();
  render(<FavoritesPanel onMatchSelect={onMatchSelect} />);

  const matchCard = await screen.findByTestId("favorite-item");
  fireEvent.click(matchCard.querySelector(".ls-up-card"));
  expect(onMatchSelect).toHaveBeenCalled();
});

  test("can remove a favorite", async () => {
    useUser.mockReturnValue({ user: { id: "user_123" } });
    apiClient.getUserFavorites.mockResolvedValue({ data: ["Arsenal"] });
    apiClient.getTeams.mockResolvedValue({
      data: [{ name: "Arsenal", crest: "/arsenal.png" }],
    });
    apiClient.getMatchesByDate.mockResolvedValue({ data: [] });
    apiClient.removeUserFavorite.mockResolvedValue({});

    render(<FavoritesPanel />);

    const removeBtn = await screen.findByLabelText("Remove Arsenal");
    fireEvent.click(removeBtn);

    await waitFor(() =>
      expect(apiClient.removeUserFavorite).toHaveBeenCalledWith("user_123", "Arsenal")
    );
  });

  test("shows error if API fails", async () => {
    useUser.mockReturnValue({ user: { id: "user_123" } });
    apiClient.getUserFavorites.mockRejectedValue(new Error("API down"));
    apiClient.getTeams.mockResolvedValue({ data: [] });
    apiClient.getMatchesByDate.mockResolvedValue({ data: [] });

    render(<FavoritesPanel />);

    expect(await screen.findByTestId("error")).toHaveTextContent("API down");
  });
});