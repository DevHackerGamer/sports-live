

// src/components/__tests__/api.test.js
import {
  apiClient,
  realTimeData,
  ref,
  onValue,
  get,
  update,
  set,
  child,
} from "../../lib/api";
import { waitFor } from "@testing-library/react";

global.fetch = jest.fn();

describe("ApiClient", () => {
  beforeEach(() => {
    fetch.mockReset();
  });

  it("makes a GET request and returns JSON", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: "ok" }),
    });

    const data = await apiClient.getTeams();
    expect(fetch).toHaveBeenCalledWith("/api/teams", expect.any(Object));
    expect(data).toEqual({ data: "ok" });
  });

  it("throws on error response with message", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "Bad Request" }),
    });

    await expect(apiClient.getTeams()).rejects.toThrow("Bad Request");
  });

  it("throws on error response without message", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(apiClient.getTeams()).rejects.toThrow("HTTP 500");
  });

  it("sends POST body correctly", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ created: true }),
    });

    await apiClient.addMatchEvent("m1", { type: "goal" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/matches/m1/events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ type: "goal" }),
      })
    );
  });

  it("merges headers with userType", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await apiClient.updateMatch("m1", { score: 1 }, { userType: "admin" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/matches/m1",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-User-Type": "admin" }),
      })
    );
  });

  it("handles network error", async () => {
    fetch.mockRejectedValueOnce(new Error("Network down"));
    await expect(apiClient.getTeams()).rejects.toThrow("Network down");
  });
});

describe("RealTimeData", () => {
  beforeEach(() => {
    fetch.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    realTimeData.cleanup();
    jest.useRealTimers();
  });

  it("subscribes to matches and calls callback", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "1", name: "Match 1" }] }),
    });

    const cb = jest.fn();
    onValue(ref(null, "matches"), cb);

    await waitFor(() => expect(cb).toHaveBeenCalled());

    const arg = cb.mock.calls[0][0];
    expect(arg.val()).toEqual({ "1": { id: "1", name: "Match 1" } });
  });

  it("polls repeatedly and can unsubscribe", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "1" }] }),
    });

    const cb = jest.fn();
    const unsub = onValue(ref(null, "matches"), cb);

    await waitFor(() => expect(cb).toHaveBeenCalledTimes(1));

    jest.advanceTimersByTime(31000);
    await waitFor(() => expect(cb).toHaveBeenCalledTimes(2));

    unsub();
    jest.advanceTimersByTime(31000);
    expect(cb).toHaveBeenCalledTimes(2); // no new calls
  });

  it("calls errorCallback on failure", async () => {
    fetch.mockRejectedValueOnce(new Error("Boom"));
    const cb = jest.fn();
    const errCb = jest.fn();

    onValue(ref(null, "matches"), cb, errCb);
    await waitFor(() => expect(errCb).toHaveBeenCalledWith(expect.any(Error)));
  });
});

describe("Firebase-like helpers", () => {
  beforeEach(() => {
    fetch.mockReset();
  });

  it("get() returns matches", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "m1" }] }),
    });

    const result = await get(ref(null, "matches"));
    expect(result.val()).toEqual([{ id: "m1" }]);
  });

  it("getMatchesByDate returns parsed data", async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: [{ id: "m1" }] }),
  });
  const result = await apiClient.getMatchesByDate("2024-01-01", "2024-01-02");
  expect(result).toEqual({ data: [{ id: "m1" }] });
});

it("updateMatch stringifies body", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
  await apiClient.updateMatch("m1", { score: 2 });
  expect(fetch).toHaveBeenCalledWith(
    "/api/matches/m1",
    expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ score: 2 }),
    })
  );
});

it("deleteReport deletes by id", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ deleted: true }) });
  await apiClient.deleteReport("r123");
  expect(fetch).toHaveBeenCalledWith(
    "/api/reporting/r123",
    expect.objectContaining({ method: "DELETE" })
  );
});

it("RealTimeData fetches user favorites for a user", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: ["TeamA"] }) });
  const cb = jest.fn();
  onValue(ref(null, "users/42/favorites"), cb);
  await waitFor(() => expect(cb).toHaveBeenCalled());
  expect(cb.mock.calls[0][0].val()).toEqual(["TeamA"]);
});

it("getMatchById returns same as getMatch", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "mx" }) });
  const result = await apiClient.getMatchById("mx");
  expect(fetch).toHaveBeenCalledWith("/api/matches/mx", expect.any(Object));
  expect(result).toEqual({ id: "mx" });
});


  it("get() returns teams", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "t1" }] }),
    });

    const result = await get(ref(null, "teams"));
    expect(result.val()).toEqual([{ id: "t1" }]);
  });

  it("get() returns user favorites", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: ["FavTeam"] }),
    });

    const result = await get(ref(null, "users/u1/favorites"));
    expect(result.val()).toEqual(["FavTeam"]);
  });

  it("get() handles error gracefully", async () => {
    fetch.mockRejectedValueOnce(new Error("oops"));
    const result = await get(ref(null, "matches"));
    expect(result.val()).toBeNull();
  });

  it("update() creates matches", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await update(ref(null, "matches"), { id: "m1", name: "Test Match" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/matches",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("update() updates teams", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await update(ref(null, "teams"), { id: "t1", name: "Team 1" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/teams",
      expect.objectContaining({ method: "POST" })
    );
  });
  it("getReports without id calls /api/reporting", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });
  await apiClient.getReports();
  expect(fetch).toHaveBeenCalledWith("/api/reporting", expect.any(Object));
});

it("getReports with id calls /api/reporting/:id", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: {} }) });
  await apiClient.getReports("r1");
  expect(fetch).toHaveBeenCalledWith("/api/reporting/r1", expect.any(Object));
});

it("createReport posts body", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ created: true }) });
  await apiClient.createReport({ title: "test" });
  expect(fetch).toHaveBeenCalledWith(
    "/api/reporting",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "test" }) })
  );
});

it("getStandings builds query string", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ standings: [] }) });
  await apiClient.getStandings({ competition: "EPL", season: "2023" });
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/standings?competition=EPL&season=2023"),
    expect.any(Object)
  );
});

it("getMatchesByDate builds query params", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });
  await apiClient.getMatchesByDate("2024-01-01", "2024-01-10", 50);
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("dateFrom=2024-01-01&dateTo=2024-01-10&limit=50"),
    expect.any(Object)
  );
});

it("getMatch fetches by id", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "m1" }) });
  await apiClient.getMatch("m1");
  expect(fetch).toHaveBeenCalledWith("/api/matches/m1", expect.any(Object));
});

it("updateMatchEvent sends PUT with body", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ updated: true }) });
  await apiClient.updateMatchEvent("m1", "e1", { type: "foul" });
  expect(fetch).toHaveBeenCalledWith(
    "/api/matches/m1/events/e1",
    expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ type: "foul" }),
    })
  );
});

it("deleteMatchEvent calls DELETE", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ deleted: true }) });
  await apiClient.deleteMatchEvent("m1", "e1");
  expect(fetch).toHaveBeenCalledWith(
    "/api/matches/m1/events/e1",
    expect.objectContaining({ method: "DELETE" })
  );
});

it("deleteReport calls DELETE", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  await apiClient.deleteReport("r1");
  expect(fetch).toHaveBeenCalledWith(
    "/api/reporting/r1",
    expect.objectContaining({ method: "DELETE" })
  );
});
it("getMatchEvents fetches events by match id", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ events: [] }) });
  const result = await apiClient.getMatchEvents("m1");
  expect(fetch).toHaveBeenCalledWith("/api/matches/m1/events", expect.any(Object));
  expect(result).toEqual({ events: [] });
});

it("deleteMatch deletes a match by id", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ deleted: true }) });
  const result = await apiClient.deleteMatch("m1");
  expect(fetch).toHaveBeenCalledWith("/api/matches/m1", expect.objectContaining({ method: "DELETE" }));
  expect(result).toEqual({ deleted: true });
});

it("updateReport sends PUT with body", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ updated: true }) });
  const result = await apiClient.updateReport("r1", { status: "open" });
  expect(fetch).toHaveBeenCalledWith(
    "/api/reporting/r1",
    expect.objectContaining({ method: "PUT", body: JSON.stringify({ status: "open" }) })
  );
  expect(result).toEqual({ updated: true });
});

it("RealTimeData fetches teams and calls callback", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: "t1", name: "Team 1" }] }) });
  const cb = jest.fn();
  onValue(ref(null, "teams"), cb);
  await waitFor(() => expect(cb).toHaveBeenCalled());
  expect(cb.mock.calls[0][0].val()).toEqual([{ id: "t1", name: "Team 1" }]);
});

it("get() returns null for unknown path", async () => {
  const result = await get(ref(null, "unknown/path"));
  expect(result.val()).toBeNull();
});



it("getTeamById builds query string", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ team: {} }) });
  await apiClient.getTeamById("t1");
  expect(fetch).toHaveBeenCalledWith(
    "/api/teams?id=t1",
    expect.any(Object)
  );
});

it("RealTimeData fetches user favorites", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: ["FavTeam"] }) });
  const cb = jest.fn();
  onValue(ref(null, "users/u1/favorites"), cb);
  await waitFor(() => expect(cb).toHaveBeenCalled());
  expect(cb.mock.calls[0][0].val()).toEqual(["FavTeam"]);
});

it("getMatchById calls underlying getMatch", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "m1" }) });
  await apiClient.getMatchById("m1");
  expect(fetch).toHaveBeenCalledWith("/api/matches/m1", expect.any(Object));
});


it("getStandingById fetches by id", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  await apiClient.getStandingById("s1");
  expect(fetch).toHaveBeenCalledWith("/api/standings/s1", expect.any(Object));
});

it("addUserFavorite posts a team name", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  await apiClient.addUserFavorite("u1", "Chelsea");
  expect(fetch).toHaveBeenCalledWith(
    "/api/users/u1/favorites",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ teamName: "Chelsea" }) })
  );
});

it("removeUserFavorite encodes team name", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  await apiClient.removeUserFavorite("u1", "Real Madrid");
  expect(fetch).toHaveBeenCalledWith(
    "/api/users/u1/favorites/Real%20Madrid",
    expect.objectContaining({ method: "DELETE" })
  );
});

it("getEventLog appends query params", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ events: [] }) });
  await apiClient.getEventLog({ type: "goal", limit: 5 });
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/event-log?limit=5&type=goal"),
    expect.any(Object)
  );
});







  it("update() updates user favorites", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await update(ref(null, "users/u1/favorites"), { favorites: ["Team X"] });
    expect(fetch).toHaveBeenCalledWith(
      "/api/users/u1/favorites",
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("set() calls update()", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await set(ref(null, "teams"), { id: "t1", name: "Team 1" });
    expect(fetch).toHaveBeenCalled();
  });

  it("child() appends path", () => {
    const parent = ref(null, "users/123");
    const c = child(parent, "favorites");
    expect(c.path).toBe("users/123/favorites");
  });
});