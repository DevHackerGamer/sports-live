// Vercel serverless function for Teams API
const { MongoClient } = require("mongodb");

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const client = await connectToDatabase();
    const db = client.db(process.env.DATABASE_NAME || "SportsLiveTrackerDB");
    const teamsCollection = db.collection("Teams");

    if (req.method === "GET") {
      const { id } = req.query;

      if (id) {
        // Find by numeric team ID
        const team = await teamsCollection.findOne({ id: parseInt(id) });
        if (!team) {
          return res.status(404).json({ success: false, error: "Team not found" });
        }
        return res.status(200).json({ success: true, data: team });
      }

      // Default: return all teams
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

    // Unsupported method
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

// Export for both Vercel and Express
module.exports = handler;
