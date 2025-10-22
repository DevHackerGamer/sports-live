// api/teams.js
const { getTeamsInfoCollection, getTeamsCollectionESPN } = require("../lib/mongodb");

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
    const teamsCollectionESPN = await getTeamsCollectionESPN();

    if (req.method === "GET") {
      const { id, source } = req.query;

      if (id) {
        // Try ESPN collection first for single team lookup
        let team = await teamsCollectionESPN.findOne({ id: parseInt(id) });
        if (!team) {
          team = await teamsCollection.findOne({ id: parseInt(id) });
        }
        if (!team) {
          return res.status(404).json({ success: false, error: "Team not found" });
        }
        return res.status(200).json({ success: true, data: team });
      }

      // ALWAYS return only ESPN-sourced teams for match creation
      // This ensures only API-backed teams are available in dropdowns
      const useAllTeams = source === 'all'; // admin override with ?source=all
      
      let teams;
      if (useAllTeams) {
        // Admin override: get all teams from both collections
        const [espnTeams, regularTeams] = await Promise.all([
          teamsCollectionESPN.find({}).toArray(),
          teamsCollection.find({}).toArray()
        ]);
        
        // Merge and deduplicate by team ID
        const teamMap = new Map();
        for (const team of [...espnTeams, ...regularTeams]) {
          if (!teamMap.has(team.id)) {
            teamMap.set(team.id, team);
          }
        }
        teams = Array.from(teamMap.values());
      } else {
        // DEFAULT: Only return ESPN-backed teams (Teams_ESPN collection)
        teams = await teamsCollectionESPN.find({}).toArray();
        
        // Sort by name for better UX
        teams.sort((a, b) => {
          const nameA = (a.name || '').toString().toLowerCase();
          const nameB = (b.name || '').toString().toLowerCase();
          return nameA.localeCompare(nameB);
        });
      }
      
      return res.status(200).json({
        success: true,
        data: teams,
        count: teams.length,
        source: useAllTeams ? 'all' : 'espn',
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