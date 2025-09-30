import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import MatchSetup from "../matchsetup/MatchSetup";
import { useUser } from "@clerk/clerk-react";
import { isAdminFromUser } from "../../lib/roles";

// Mock Clerk + roles
jest.mock("@clerk/clerk-react", () => ({ useUser: jest.fn() }));
jest.mock("../../lib/roles", () => ({ isAdminFromUser: jest.fn() }));

// Global fetch mock
global.fetch = jest.fn();

describe("MatchSetup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    window.confirm = jest.fn();
  });

  test("denies access if user is not admin", () => {
    useUser.mockReturnValue({ user: { id: "u1" } });
    isAdminFromUser.mockReturnValue(false);
    render(<MatchSetup />);
    expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
  });

  test("renders scheduled matches empty state", async () => {
    useUser.mockReturnValue({ user: { id: "u1" } });
    isAdminFromUser.mockReturnValue(true);
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) });
    render(<MatchSetup />);
    expect(await screen.findByText(/No matches scheduled/i)).toBeInTheDocument();
  });

  test("toggles create form", async () => {
    useUser.mockReturnValue({ user: { id: "u1" } });
    isAdminFromUser.mockReturnValue(true);
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) });

    render(<MatchSetup />);
    fireEvent.click(screen.getByText(/Create Match/i));
    expect(await screen.findByText(/Create New Match/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Close Form/i));
    expect(screen.queryByText(/Create New Match/i)).not.toBeInTheDocument();
  });

  test("creates match successfully", async () => {
    useUser.mockReturnValue({ user: { id: "u1" } });
    isAdminFromUser.mockReturnValue(true);

    fetch.mockImplementation((url, options) => {
      if (url.includes("/api/matches") && !options) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [{
              id: "m1",
              homeTeam: { id: "t1", name: "Arsenal" },
              awayTeam: { id: "t2", name: "Chelsea" },
              competition: { name: "Premier League" },
              utcDate: "2025-12-25T18:30:00Z",
            }],
          }),
        });
      }
      if (url.includes("/api/matches") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { id: "m1" } }),
        });
      }
      if (url.includes("/api/teams")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [{ id: "t1", name: "Arsenal" }, { id: "t2", name: "Chelsea" }] }),
        });
      }
      if (url.includes("/api/competitions")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: ["Premier League"] }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { container } = render(<MatchSetup />);
    fireEvent.click(screen.getByText(/Create Match/i));

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "t1" } });
    fireEvent.change(selects[1], { target: { value: "t2" } });
    fireEvent.change(selects[2], { target: { value: "Premier League" } });

    fireEvent.change(container.querySelector('input[name="date"]'), { target: { value: "2025-12-25" } });
    fireEvent.change(container.querySelector('input[name="time"]'), { target: { value: "18:30" } });
    fireEvent.change(container.querySelector('input[name="matchday"]'), { target: { value: "5" } });

    fireEvent.click(screen.getByText(/^Create Match$/));

    const matchesList = await screen.findByText(/Scheduled Matches/i);
    await waitFor(() => {
      expect(within(matchesList.closest("div")).getByText(/Arsenal/)).toBeInTheDocument();
      expect(within(matchesList.closest("div")).getByText(/Chelsea/)).toBeInTheDocument();
    });
  });

  // --- Edge cases ---
  test("validateMatch fails if fields missing", async () => {
    useUser.mockReturnValue({ user: { id: "u1" } });
    isAdminFromUser.mockReturnValue(true);
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) });

    render(<MatchSetup />);
    fireEvent.click(await screen.findByText(/Create Match/i));
    fireEvent.click(screen.getByText(/^Create Match$/));
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Fill in all required/i));
  });

 

  
 
  test("removes match after confirmation", async () => {
    useUser.mockReturnValue({ user: { id: "u1" } });
    isAdminFromUser.mockReturnValue(true);
    window.confirm.mockReturnValueOnce(true);

    fetch.mockImplementation((url, options) => {
      if (url.includes("/api/matches") && !options) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [{
              id: "m1",
              homeTeam: { id: "t1", name: "Arsenal" },
              awayTeam: { id: "t2", name: "Chelsea" },
              competition: { name: "Premier League" },
              utcDate: "2025-12-25T18:30:00Z",
              createdByAdmin: true,
            }],
          }),
        });
      }
      if (url.includes("/api/matches/") && options?.method === "DELETE") {
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<MatchSetup />);
    fireEvent.click(await screen.findByText(/Remove/i));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/matches/m1", expect.objectContaining({ method: "DELETE" }));
    });
  });


});

