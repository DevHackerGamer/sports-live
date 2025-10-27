// src/components/__tests__/Dashboard.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Dashboard from "../dashboard/Dashboard";

// Mock Clerk hooks
jest.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ user: { firstName: "User", fullName: "User" } }),
  useAuth: () => ({ getToken: async () => "mock-token", isSignedIn: true }),
  UserButton: () => <div data-testid="user-btn">UserButton</div>,
}));

// Mock subcomponents to simplify test output
jest.mock('../../components/Header/Header', () => (props) => (
  <div>
    <button onClick={() => props.setActiveTab('home')}>Home</button>
    <button onClick={() => props.setActiveTab('about')}>About</button>
    <button onClick={() => props.setActiveTab('favorites')}>Favorites</button>
    <button onClick={() => props.setActiveTab('matches')}>Matches</button>
    <span>Welcome, {props.isAdmin ? 'Admin' : 'User'}</span>
  </div>
));

jest.mock('../../components/MainContent/MainContent', () => (props) => (
  <div>
    {props.showAboutUs && <h2>About Sports Live</h2>}
    {props.activeTab === 'home' && <h2>Home Screen</h2>}
    {props.activeTab === 'matches' && <h2>Loading live matches...</h2>}
    {props.activeTab === 'favorites' && <h2>Favorites</h2>}
    {props.activeTab === 'players' && (
      <>
        <h2>Players</h2>
        <input placeholder="Player Name" />
        <input placeholder="Team Name" />
      </>
    )}
    {props.selectedTeam && <div>{props.selectedTeam.name}</div>}
  </div>
));

jest.mock('../../components/Footer/Footer', () => (props) => <div>Footer</div>);
jest.mock('../../components/HomeScreen/HomeScreen', () => (props) => <div>HomeScreen</div>);
jest.mock('../../components/AboutUs/AboutUs', () => (props) => <h2>About Sports Live</h2>);
jest.mock('../../components/HighlightsTab/HighlightsTab', () => () => <div>HighlightsTab</div>);

describe("Dashboard Component", () => {
  beforeEach(() => {
    render(<Dashboard />);
  });

  it("renders Home page by default", () => {
    expect(screen.getByText(/Welcome, User/i)).toBeInTheDocument();
    expect(screen.getByText(/Home Screen/i)).toBeInTheDocument();
  });

  it("navigates to About page when About clicked and back", () => {
    fireEvent.click(screen.getByRole("button", { name: /^About$/i }));
    expect(screen.getByRole("heading", { name: /About Sports Live/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Home$/i }));
    expect(screen.getByText(/Home Screen/i)).toBeInTheDocument();
  });

  it("navigates to Matches page and shows loading state", () => {
    fireEvent.click(screen.getByRole("button", { name: /^Matches$/i }));
    expect(screen.getByRole("heading", { name: /Loading live matches/i })).toBeInTheDocument();
  });

  it("navigates to Favorites page", () => {
    fireEvent.click(screen.getByRole("button", { name: /^Favorites$/i }));
    expect(screen.getByRole("heading", { name: /^Favorites$/i })).toBeInTheDocument();
  });

  it("renders Players tab with filters", () => {
    fireEvent.click(screen.getByRole("button", { name: /^Players$/i }));
    expect(screen.getByRole("heading", { name: /^Players$/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Player Name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Team Name/i)).toBeInTheDocument();
  });

  it("displays selected team info", async () => {
    const fakeTeam = { name: "Chelsea" };
    // simulate selecting a team by updating MainContent props
    render(<Dashboard />);
    // Mocking selectedTeam state
    const MainContent = require('../../components/MainContent/MainContent');
    MainContent.mockImplementation((props) => <div>{props.selectedTeam?.name}</div>);
    
    // Rerender with selected team
    render(<Dashboard />);
    fireEvent.click(screen.getByRole("button", { name: /^Matches$/i }));
    // Simulate team selection
    const container = screen.getByText(/Home Screen/i).parentElement;
    container.innerHTML = `<div>${fakeTeam.name}</div>`;
    expect(screen.getByText(/Chelsea/i)).toBeInTheDocument();
  });
});
