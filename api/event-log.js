// Event Log API endpoint
const { getEventLogCollection } = require('../lib/mongodb');
///
const { ObjectId } = require('mongodb');


async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const eventLogCollection = await getEventLogCollection();

  if (req.method === 'GET') {
    try {
      const { limit = 50, type, startDate, endDate } = req.query;
      
      let filter = {};
      if (type) filter.type = type;
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
      const { type, message, data } = req.body;
      
      if (!type || !message) {
        return res.status(400).json({ error: 'Type and message are required' });
      }

      const event = {
        timestamp: new Date(),
        type,
        message,
        data: data || null,
        source: 'api'
      };

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
  } 
  ////////////////////////////////////////////////////////////////////////////////
   else if (req.method === 'DELETE') { 
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Event id required' });

      const result = await eventLogCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Event not found' });

      res.status(200).json({ success: true, message: 'Event deleted', eventId: id });
    } catch (error) {
      console.error('Error deleting event log:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }

  }
  ///////////////////////////////////////////////////////////
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }

}

module.exports = handler;
