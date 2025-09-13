//reporting.js
const { ObjectId } = require('mongodb');
const { getReportsCollection } = require('../lib/mongodb');
console.log('Reports handler loaded');
module.exports = async function handler(req, res) {
  try {
    const collection = await getReportsCollection();
    const id = req.query.id || req.params.id; // support both query and path param

    // POST new report (anonymous)
    if (req.method === 'POST' && !id) {
      const { matchId, eventId, title, description } = req.body || {};
      if (!matchId || !eventId || !title || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const now = new Date().toISOString();
      const newReport = {
        matchId,
        eventId,
        title,
        description,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      };

      const result = await collection.insertOne(newReport);
      return res.status(201).json({ success: true, id: result.insertedId, data: newReport });
    }

    // GET all reports or single report
    if (req.method === 'GET') {
      if (id) {
        let doc;
        try {
          doc = await collection.findOne({ _id: new ObjectId(id) });
        } catch {
          return res.status(400).json({ error: 'Invalid id format' });
        }
        if (!doc) return res.status(404).json({ error: 'Report not found' });
        return res.status(200).json({ success: true, data: doc });
      } else {
        const docs = await collection.find().sort({ createdAt: -1 }).toArray();
        return res.status(200).json({ success: true, data: docs });
      }
    }

    // PUT update report by id
    if (req.method === 'PUT' && id) {
      const updates = req.body || {};
      updates.updatedAt = new Date().toISOString();

      let filter;
      try {
        filter = { _id: new ObjectId(id) };
      } catch {
        return res.status(400).json({ error: 'Invalid id format' });
      }

      const result = await collection.updateOne(filter, { $set: updates });
      if (!result.matchedCount) return res.status(404).json({ success: false, error: 'Report not found' });
      return res.status(200).json({ success: true, modified: result.modifiedCount > 0 });
    }

    // DELETE report by id
    if (req.method === 'DELETE' && id) {
      let filter;
      try {
        filter = { _id: new ObjectId(id) };
      } catch {
        return res.status(400).json({ error: 'Invalid id format' });
      }

      const result = await collection.deleteOne(filter);
      if (!result.deletedCount) return res.status(404).json({ success: false, error: 'Report not found' });
      return res.status(200).json({ success: true, deleted: true });
    }

    // Method not allowed
    res.setHeader('Allow', ['GET','POST','PUT','DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (err) {
    console.error('Reports API error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
