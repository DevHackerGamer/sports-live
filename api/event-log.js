// Event Log API endpoint
const { getEventLogCollection } = require('../lib/mongodb');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const eventLogCollection = await getEventLogCollection();

  if (req.method === 'GET') {
    try {
      const { limit = 50, type, startDate, endDate, matchId } = req.query;

      let filter = {};
      if (type) filter.type = type;
      // Allow filtering logs for a specific match's events
      if (matchId) {
        // matchId may be stored as a number or a string; search both on top-level and nested data
        const candidates = [];
        // original string
        candidates.push(matchId);
        // numeric form if applicable
        const num = Number(matchId);
        if (!Number.isNaN(num)) candidates.push(num);
        filter.$or = candidates.flatMap((v) => [
          { matchId: v },
          { 'data.matchId': v }
        ]);
      }
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const events = await eventLogCollection
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .toArray();

      res.status(200).json({
        success: true,
        events,
        total: events.length
      });
    } catch (error) {
      console.error('Error fetching event logs:', error);
      res.status(500).json({ error: 'Failed to fetch event logs' });
    }
  } else if (req.method === 'POST') {
    try {
      const { type, message, data, matchId } = req.body;
      
      if (!type || !message) {
        return res.status(400).json({ error: 'Type and message are required' });
      }

      const event = {
        timestamp: new Date(),
        type,
        message,
        // Ensure data is always an object when provided so we can enrich with matchId
        data: data && typeof data === 'object' ? { ...data, ...(matchId ? { matchId } : {}) } : (matchId ? { matchId } : (data || null)),
        source: 'api'
      };
      if (matchId) {
        event.matchId = matchId; // duplicate for easier querying/indexing
      }

      const result = await eventLogCollection.insertOne(event);
      res.status(201).json({
        success: true,
        eventId: result.insertedId,
        event
      });
    } catch (error) {
      console.error('Error creating event log:', error);
      res.status(500).json({ error: 'Failed to create event log' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

module.exports = handler;
