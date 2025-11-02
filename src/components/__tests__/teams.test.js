global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;

const handler = require("../../../api/teams");
const {
  getTeamsInfoCollection,
  getTeamsCollectionESPN,
} = require("../../../lib/mongodb");

jest.mock("../../../lib/mongodb.js", () => ({
  getTeamsInfoCollection: jest.fn(),
  getTeamsCollectionESPN: jest.fn(),
}));

function mockReqRes({ method = "GET", query = {}, body = {} } = {}) {
  const json = jest.fn();
  const end = jest.fn();
  const setHeader = jest.fn();
  const status = jest.fn(() => ({ json, end }));
  const res = { setHeader, status, json, end };
  const req = { method, url: "/api/teams", query, body, headers: {} };
  return { req, res, json, end, status, setHeader };
}

describe("Teams API", () => {
  let mockTeamsInfo;
  let mockTeamsESPN;

  beforeEach(() => {
    mockTeamsInfo = {
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      insertMany: jest.fn(),
    };
    mockTeamsESPN = {
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };

    getTeamsInfoCollection.mockResolvedValue(mockTeamsInfo);
    getTeamsCollectionESPN.mockResolvedValue(mockTeamsESPN);
    jest.clearAllMocks();
  });

  // ---------------- OPTIONS ----------------
  test("OPTIONS request returns 200", async () => {
    const { req, res, end } = mockReqRes({ method: "OPTIONS" });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(end).toHaveBeenCalled();
  });

  // ---------------- GET all teams (ESPN default) ----------------
  test("GET all teams returns ESPN teams by default", async () => {
    const espnTeams = [
      { id: 1, name: "Barcelona" },
      { id: 2, name: "Arsenal" },
    ];
    mockTeamsESPN.toArray.mockResolvedValue(espnTeams);

    const { req, res, json } = mockReqRes({ method: "GET" });
    await handler(req, res);

    expect(mockTeamsESPN.find).toHaveBeenCalledWith({});
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: espnTeams.sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
        source: "espn",
      })
    );
  });

  // ---------------- GET all teams with ?source=all ----------------
  test("GET with source=all merges ESPN and regular teams", async () => {
    const espnTeams = [
      { id: 1, name: "Real Madrid" },
      { id: 2, name: "Chelsea" },
    ];
    const regularTeams = [
      { id: 2, name: "Chelsea Legacy" },
      { id: 3, name: "Napoli" },
    ];

    mockTeamsESPN.toArray.mockResolvedValue(espnTeams);
    mockTeamsInfo.toArray.mockResolvedValue(regularTeams);

    const { req, res, json } = mockReqRes({
      method: "GET",
      query: { source: "all" },
    });
    await handler(req, res);

    expect(mockTeamsESPN.find).toHaveBeenCalledWith({});
    expect(mockTeamsInfo.find).toHaveBeenCalledWith({});
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        count: 3, // merged unique IDs
        source: "all",
      })
    );
  });

  // ---------------- GET by ID ----------------
  test("GET by id returns team (found in ESPN)", async () => {
    const fakeTeam = { id: 7, name: "Man City" };
    mockTeamsESPN.findOne.mockResolvedValue(fakeTeam);

    const { req, res, json } = mockReqRes({
      method: "GET",
      query: { id: "7" },
    });
    await handler(req, res);

    expect(mockTeamsESPN.findOne).toHaveBeenCalledWith({ id: 7 });
    expect(json).toHaveBeenCalledWith({ success: true, data: fakeTeam });
  });

  test("GET by id falls back to regular teams if not in ESPN", async () => {
    const fallbackTeam = { id: 9, name: "Juventus" };
    mockTeamsESPN.findOne.mockResolvedValue(null);
    mockTeamsInfo.findOne.mockResolvedValue(fallbackTeam);

    const { req, res, json } = mockReqRes({
      method: "GET",
      query: { id: "9" },
    });
    await handler(req, res);

    expect(mockTeamsESPN.findOne).toHaveBeenCalledWith({ id: 9 });
    expect(mockTeamsInfo.findOne).toHaveBeenCalledWith({ id: 9 });
    expect(json).toHaveBeenCalledWith({ success: true, data: fallbackTeam });
  });

  test("GET by id not found returns 404", async () => {
    mockTeamsESPN.findOne.mockResolvedValue(null);
    mockTeamsInfo.findOne.mockResolvedValue(null);

    const { req, res, json } = mockReqRes({
      method: "GET",
      query: { id: "404" },
    });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Team not found",
    });
  });

  // ---------------- POST ----------------
  test("POST inserts valid teams", async () => {
    mockTeamsInfo.insertMany.mockResolvedValue({ insertedCount: 2 });
    const newTeams = [
      { id: 10, name: "PSG" },
      { id: 11, name: "Monaco" },
    ];

    const { req, res, json } = mockReqRes({
      method: "POST",
      body: { teams: newTeams },
    });
    await handler(req, res);

    expect(mockTeamsInfo.insertMany).toHaveBeenCalledWith(newTeams);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      success: true,
      insertedCount: 2,
    });
  });

  test("POST with invalid body returns 400", async () => {
    const { req, res, json } = mockReqRes({
      method: "POST",
      body: {},
    });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Invalid or missing teams array",
    });
  });

  // ---------------- Method not allowed ----------------
  test("DELETE returns 405", async () => {
    const { req, res, json } = mockReqRes({ method: "DELETE" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Method not allowed",
    });
  });

  // ---------------- Internal error ----------------
  test("handles internal server error", async () => {
    getTeamsInfoCollection.mockRejectedValue(new Error("DB fail"));
    const { req, res, json } = mockReqRes({ method: "GET" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Failed to handle teams request",
      })
    );
  });
});
