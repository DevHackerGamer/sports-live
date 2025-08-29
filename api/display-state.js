// Display State API endpoint
const { getDisplayStateCollection } = require('../lib/mongodb');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const displayStateCollection = await getDisplayStateCollection();

  if (req.method === 'GET') {
    try {
      const state = await displayStateCollection.findOne({ _id: 'main' });
      
      if (!state) {
        // Return default state if none exists
        const defaultState = {
          _id: 'main',
          status: 'idle',
          message: 'No data fetch in progress',
          lastUpdated: new Date()
        };
        
        await displayStateCollection.insertOne(defaultState);
        return res.status(200).json({ success: true, state: defaultState });
      }

      res.status(200).json({ success: true, state });
    } catch (error) {
      console.error('Error fetching display state:', error);
      res.status(500).json({ error: 'Failed to fetch display state' });
    }
  } else if (req.method === 'PUT') {
    try {
      const updates = req.body;
      
      const result = await displayStateCollection.updateOne(
        { _id: 'main' },
        { 
          $set: { 
            ...updates, 
            lastUpdated: new Date() 
          } 
        },
        { upsert: true }
      );

      const updatedState = await displayStateCollection.findOne({ _id: 'main' });
      
      res.status(200).json({
        success: true,
        state: updatedState,
        modified: result.modifiedCount > 0 || result.upsertedCount > 0
      });
    } catch (error) {
      console.error('Error updating display state:', error);
      res.status(500).json({ error: 'Failed to update display state' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

module.exports = handler;
