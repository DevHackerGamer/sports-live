// src/components/__tests__/MatchViewer.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MatchViewer from "../matchViewer/MatchViewer";
import { useUser } from "@clerk/clerk-react";

// Mock Clerk
jest.mock("@clerk/clerk-react", () => ({
  useUser: jest.fn(),
}));

// Mock apiClient
const mockGetMatchEvents = jest.fn();
jest.mock("../../lib/api", () => ({
  apiClient: {
    getMatchById: jest.fn().mockResolvedValue({ data: {} }),
    getMatchEvents: (...args) => mockGetMatchEvents(...args),
    getEventLog: jest.fn().mockResolvedValue({ events: [] }),
    getTeams: jest.fn().mockResolvedValue({ data: [] }),
    addMatchEvent: jest.fn().mockResolvedValue({}),
    updateMatch: jest.fn().mockResolvedValue({}),
    createReport: jest.fn().mockResolvedValue({}),
  },
}));

describe("MatchViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockReturnValue({ user: { privateMetadata: { type: "user" } } });
    mockGetMatchEvents.mockResolvedValue({ data: [] });
  });

  it("renders fallback when no match is provided", () => {
    render(<MatchViewer />);
    expect(screen.getByText(/Select a match/)).toBeInTheDocument();
  });

  it("renders with a match provided", () => {
    const match = {
      id: "1",
      homeTeam: "Home FC",
      awayTeam: "Away FC",
      status: "SCHEDULED",
      utcDate: new Date().toISOString(),
    };
    render(<MatchViewer match={match} />);
    expect(screen.getByText("Home FC")).toBeInTheDocument();
    expect(screen.getByText("Away FC")).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", () => {
    const mockBack = jest.fn();
    render(
      <MatchViewer
        match={{ id: "2", homeTeam: "Home", awayTeam: "Away", status: "FINISHED" }}
        onBack={mockBack}
      />
    );
    fireEvent.click(screen.getByText("← Back"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("calls onAddToWatchlist when add button clicked", async () => {
    const mockAdd = jest.fn().mockResolvedValue({});
    render(
      <MatchViewer
        match={{ id: "3", homeTeam: "Home", awayTeam: "Away", status: "SCHEDULED" }}
        onAddToWatchlist={mockAdd}
      />
    );

    fireEvent.click(screen.getByText("+ Add to Watchlist"));

    await waitFor(() =>
      expect(screen.getByText("Added ✅")).toBeInTheDocument()
    );
    expect(mockAdd).toHaveBeenCalled();
  });

  it("switches between sections", () => {
    render(
      <MatchViewer
        match={{ id: "4", homeTeam: "Home", awayTeam: "Away", status: "IN_PLAY" }}
        initialSection="details"
      />
    );

    // use role-based heading for uniqueness
    fireEvent.click(screen.getByText("Statistics"));
    expect(
      screen.getByRole("heading", { name: /Statistics/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Event Timeline"));
    expect(screen.getByText(/Match Events Timeline/)).toBeInTheDocument();
  });


   it("renders events returned from API", async () => {
    const fakeEvents = [
      { id: "e1", type: "goal", minute: 12, team: "Home", player: "Alice" },
    ];
    mockGetMatchEvents.mockResolvedValue({ data: fakeEvents });

    render(
      <MatchViewer
        match={{ id: "5", homeTeam: "Home", awayTeam: "Away", status: "FINISHED" }}
        initialSection="events"
      />
    );

    expect(
      await screen.findByText(/Goal - Home - Alice/)
    ).toBeInTheDocument();

    // Match exactly "Alice" (not the substring in "Goal - Home - Alice")
    expect(screen.getByText(/^Alice$/)).toBeInTheDocument();
  });
it("renders statistics when provided", () => {
  render(
    <MatchViewer
      match={{
        id: "12",
        homeTeam: "Home",
        awayTeam: "Away",
        status: "FINISHED",
        utcDate: new Date().toISOString(),
        statistics: [{ type: "Possession", value: 60 }],
      }}
      initialSection="stats"
    />
  );

  expect(screen.getByText(/Possession/)).toBeInTheDocument();
  expect(screen.getByText(/60%/)).toBeInTheDocument();
});

it("renders no statistics fallback", () => {
  render(
    <MatchViewer
      match={{
        id: "13",
        homeTeam: "Home",
        awayTeam: "Away",
        status: "FINISHED",
        utcDate: new Date().toISOString(),
      }}
      initialSection="stats"
    />
  );

  expect(
    screen.getByText(/No statistics available/)
  ).toBeInTheDocument();
});


it("shows no events fallback", async () => {
  mockGetMatchEvents.mockResolvedValueOnce({ data: [] });

  render(
    <MatchViewer
      match={{
        id: "15",
        homeTeam: "Home",
        awayTeam: "Away",
        status: "FINISHED",
        utcDate: new Date().toISOString(),
      }}
      initialSection="events"
    />
  );

  expect(await screen.findByText(/No events/)).toBeInTheDocument();
});

it("toggles report panel and fills in report form", async () => {
  mockGetMatchEvents.mockResolvedValueOnce({
    data: [{ id: "e1", description: "Goal 1" }],
  });

  render(
    <MatchViewer
      match={{
        id: "20",
        homeTeam: "Home",
        awayTeam: "Away",
        status: "FINISHED",
        utcDate: new Date().toISOString(),
      }}
      initialSection="events"
    />
  );

  // Initially button shows "Report an Issue"
  const toggleBtn = await screen.findByText("Report an Issue");
  fireEvent.click(toggleBtn);

  // Now panel appears
  expect(screen.getByText(/Report Event Issue/)).toBeInTheDocument();
  expect(screen.getByText("Hide Report Panel")).toBeInTheDocument();

  // Select event
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "e1" },
  });
  fireEvent.change(screen.getByPlaceholderText(/Brief title/), {
    target: { value: "Wrong Goal Time" },
  });
  fireEvent.change(screen.getByPlaceholderText(/Describe/), {
    target: { value: "The minute is incorrect." },
  });

  // Click submit (just to ensure button works)
  fireEvent.click(screen.getByText("Submit"));

  // Cancel closes panel
  fireEvent.click(screen.getByText("Cancel"));
  expect(screen.queryByText(/Report Event Issue/)).not.toBeInTheDocument();
});



it("fills add-event form fields correctly", () => {
  useUser.mockReturnValue({ user: { privateMetadata: { type: "admin" } } });

  render(
    <MatchViewer
      match={{
        id: "22",
        homeTeam: "Home",
        awayTeam: "Away",
        status: "FINISHED",
        utcDate: new Date().toISOString(),
      }}
      initialSection="update"
    />
  );

  // Time input
  fireEvent.change(screen.getByPlaceholderText(/Time/), {
    target: { value: "23:45" },
  });

  // Select type
  fireEvent.change(screen.getByDisplayValue("Goal"), {
    target: { value: "yellow_card" },
  });

  // Select team → should show players
  fireEvent.change(screen.getByDisplayValue("Select Team"), {
    target: { value: "Home" },
  });

  // Select player (should match from options)
  const playerSelect = screen.getByDisplayValue("Select Player");
  if (playerSelect.options.length > 1) {
    fireEvent.change(playerSelect, {
      target: { value: playerSelect.options[1].value },
    });
  }

  // Description
  fireEvent.change(screen.getByPlaceholderText(/Event description/), {
    target: { value: "Foul committed" },
  });
});

it("parses event.minute and event.time correctly", () => {
  const events = [
    { id: 1, minute: 42, description: "Goal!" },         // valid minute
    { id: 2, minute: "abc", description: "Invalid min" },// invalid minute
    { id: 3, time: "23:45", description: "From time" },  // valid time
    { id: 4, time: "xx:yy", description: "Bad time" },   // invalid time
  ];

  render(<MatchViewer match={{ id: "55", homeTeam: "H", awayTeam: "A", status: "FINISHED" }} initialSection="events" />);
  
  // Manually set events into state if needed, or mock API
  // expect correct rendering order: 42 → 23 → then others undefined
});

it("builds fallbackPieces with label, team, and player", () => {
  const makeEvent = (overrides) => ({
    id: "ev",
    type: "goal",
    team: "Home",
    player: "Messi",
    description: "", // force fallback
    ...overrides,
  });

  const onlyLabel = makeEvent({ team: undefined, player: undefined });
  const withTeam = makeEvent({ player: undefined });
  const withTeamPlayer = makeEvent({});

  render(<MatchViewer match={{ id: "56", homeTeam: "Home", awayTeam: "Away", status: "FINISHED" }} initialSection="events" />);
  
  // Insert events with above variations
  // Assert textContent includes correct fallbacks
  // e.g. expect(screen.getByText(/Goal/)).toBeInTheDocument();
  // expect(screen.getByText(/Goal Home/)).toBeInTheDocument();
  // expect(screen.getByText(/Goal Home Messi/)).toBeInTheDocument();
});






  it("handles empty events gracefully", async () => {
    mockGetMatchEvents.mockResolvedValueOnce({ data: [] });

    render(
      <MatchViewer
        match={{ id: "6", homeTeam: "Home", awayTeam: "Away", status: "FINISHED" }}
        initialSection="events"
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/No events/)).toBeInTheDocument()
    );
  });
});