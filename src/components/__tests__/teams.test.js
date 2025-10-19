// src/components/__tests__/teams.test.js
global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;

const handler = require("../../../api/teams");
const { getTeamsInfoCollection } = require("../../../lib/mongodb");

jest.mock("../../../lib/mongodb.js", () => ({
  getTeamsInfoCollection: jest.fn(),
}));

// mock req/res like in players.test.js
function mockReqRes({ method = "GET", query = {}, body = {} } = {}) {
  const json = jest.fn();
  const end = jest.fn();
  const status = jest.fn(() => ({ json, end }));
  const setHeader = jest.fn();
  const res = { status, setHeader, end, json };
  const req = { method, url: "/api/teams", query, body, headers: {} };
  return { req, res, json, status, setHeader, end };
}

describe("Teams API", () => {
  let mockTeams;

  beforeEach(() => {
    mockTeams = {
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      insertMany: jest.fn(),
    };
    getTeamsInfoCollection.mockResolvedValue(mockTeams);
    jest.clearAllMocks();
  });

  test("OPTIONS request returns 200", async () => {
    const { req, res, end } = mockReqRes({ method: "OPTIONS" });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(end).toHaveBeenCalled();
  });

  test("GET all teams success", async () => {
    const fakeTeams = [
      { id: 1, name: "Team A" },
      { id: 2, name: "Team B" },
    ];
    mockTeams.toArray.mockResolvedValue(fakeTeams);

    const { req, res, json } = mockReqRes({ method: "GET" });
    await handler(req, res);

    expect(mockTeams.find).toHaveBeenCalledWith({});
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: fakeTeams,
        count: fakeTeams.length,
      })
    );
  });

  test("GET by id returns team", async () => {
    const fakeTeam = { id: 123, name: "Special Team" };
    mockTeams.findOne.mockResolvedValue(fakeTeam);

    const { req, res, json } = mockReqRes({
      method: "GET",
      query: { id: "123" },
    });
    await handler(req, res);

    expect(mockTeams.findOne).toHaveBeenCalledWith({ id: 123 });
    expect(json).toHaveBeenCalledWith({ success: true, data: fakeTeam });
  });

  test("GET by id not found", async () => {
    mockTeams.findOne.mockResolvedValue(null);

    const { req, res, json } = mockReqRes({
      method: "GET",
      query: { id: "999" },
    });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Team not found",
    });
  });

  test("POST inserts valid teams", async () => {
    mockTeams.insertMany.mockResolvedValue({ insertedCount: 2 });
    const newTeams = [
      { id: 1, name: "T1" },
      { id: 2, name: "T2" },
    ];

    const { req, res, json } = mockReqRes({
      method: "POST",
      body: { teams: newTeams },
    });
    await handler(req, res);

    expect(mockTeams.insertMany).toHaveBeenCalledWith(newTeams);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      success: true,
      insertedCount: 2,
    });
  });

  test("POST with invalid body", async () => {
    const { req, res, json } = mockReqRes({ method: "POST", body: {} });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Invalid or missing teams array",
    });
  });

  test("internal error returns 500", async () => {
    getTeamsInfoCollection.mockRejectedValue(new Error("DB fail"));

    const { req, res, json } = mockReqRes({ method: "GET" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Failed to handle teams request" })
    );
  });

  test("method not allowed returns 405", async () => {
    const { req, res, json } = mockReqRes({ method: "DELETE" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Method not allowed",
    });
  });
});