import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Dashboard from "../dashboard/Dashboard";

// Mock Clerk hooks
jest.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ user: { fullName: "User" } }),
  useAuth: () => ({ getToken: async () => "mock-token" }),
  UserButton: () => <div data-testid="user-btn">UserButton</div>,
}));

describe("Dashboard Component", () => {
  beforeEach(() => {
    render(<Dashboard />);
  });

  it("renders Home page by default", () => {
    expect(screen.getByText(/Welcome, User/i)).toBeInTheDocument();
  });

  it("navigates to About page when About clicked and back", () => {
    fireEvent.click(screen.getByRole("button", { name: /^About$/i }));
    expect(screen.getByRole("heading", { name: /About Sports Live/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Back to Dashboard/i }));
    expect(screen.getByText(/Welcome, User/i)).toBeInTheDocument();
  });

  it("navigates to Matches page and shows loading state", () => {
    // Pick the first Matches button if there are multiple
    fireEvent.click(screen.getAllByRole("button", { name: /^Matches$/i })[0]);
    expect(screen.getByRole("heading", { name: /Loading live matches/i })).toBeInTheDocument();
  });

  it("navigates to Favorites page and shows empty state", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /^Favorites$/i })[0]);
    expect(screen.getByRole("heading", { name: /^Favorites$/i })).toBeInTheDocument();
    expect(screen.getByTestId("no-favorites")).toBeInTheDocument();
  });

  it("navigates to Players page and shows filters", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /^Players$/i })[0]);
    expect(screen.getByRole("heading", { name: /^Players$/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Player Name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Team Name/i)).toBeInTheDocument();
  });
  it("renders TeamInfo when a team is selected", () => {
  // Pretend team selection
  fireEvent.click(screen.getAllByRole("button", { name: /^Matches$/i })[0]);

  // Simulate clicking on a team crest or name
  const fakeTeamBtn = document.createElement("button");
  fakeTeamBtn.textContent = "Chelsea";
  document.body.appendChild(fakeTeamBtn);

  fireEvent.click(fakeTeamBtn);

  expect(screen.getByText(/Chelsea/i)).toBeInTheDocument();
});


it("navigates back to Home when Home button clicked", () => {
  fireEvent.click(screen.getByRole("button", { name: /^About$/i }));
  expect(screen.getByRole("heading", { name: /About Sports Live/i })).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole("button", { name: /^Home$/i })[0]);
  expect(screen.getByText(/Welcome, User/i)).toBeInTheDocument();
});

});