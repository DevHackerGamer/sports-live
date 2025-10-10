const { getMatchLineupsCollection } = require('../lib/mongodb');

module.exports = async function handler(req, res) {
  try {
    const collection = await getMatchLineupsCollection();
    const { matchId, teamId } = req.query;

    switch(req.method) {
      case 'GET':
        if (!matchId) return res.status(400).json({ error: 'matchId is required' });
        const lineups = await collection.find({ matchId }).toArray();
        return res.status(200).json(lineups);

      case 'POST':
        const data = req.body;
        if (!data.matchId || !data.teamId || !data.teamName) {
          return res.status(400).json({ error: 'matchId, teamId, teamName required' });
        }
        data.lastUpdated = new Date();
        await collection.updateOne(
          { matchId: data.matchId, teamId: data.teamId },
          { $set: data },
          { upsert: true }
        );
        return res.status(200).json({ message: 'Lineup saved', lineup: data });

      case 'DELETE':
        if (!matchId || !teamId) return res.status(400).json({ error: 'matchId and teamId required' });
        await collection.deleteOne({ matchId, teamId });
        return res.status(200).json({ message: 'Lineup deleted' });

      default:
        res.setHeader('Allow', ['GET','POST','DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
  console.error('match-lineups API error:', err.stack || err);

    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
