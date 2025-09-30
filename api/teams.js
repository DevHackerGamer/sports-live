// api/teams.js
const { getTeamsInfoCollection } = require("../lib/mongodb");

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const teamsCollection = await getTeamsInfoCollection();

    if (req.method === "GET") {
      const { id } = req.query;

      if (id) {
        const team = await teamsCollection.findOne({ id: parseInt(id) });
        if (!team) {
          return res.status(404).json({ success: false, error: "Team not found" });
        }
        return res.status(200).json({ success: true, data: team });
      }

      const teams = await teamsCollection.find({}).toArray();
      return res.status(200).json({
        success: true,
        data: teams,
        count: teams.length,
        lastUpdated: new Date().toISOString(),
      });
    }

    if (req.method === "POST") {
      const { teams } = req.body;
      if (!teams || !Array.isArray(teams)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid or missing teams array" });
      }

      const result = await teamsCollection.insertMany(teams);
      return res
        .status(201)
        .json({ success: true, insertedCount: result.insertedCount });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("Teams API error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to handle teams request",
      message: error.message,
    });
  }
}

module.exports = handler;