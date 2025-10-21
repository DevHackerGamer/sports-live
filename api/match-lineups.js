const { getMatchLineupsCollection } = require('../lib/mongodb');

module.exports = async function handler(req, res) {
 
  try {
    const collection = await getMatchLineupsCollection();
    console.log('✅ Connected to Match_Lineups collection');

    let { matchId, teamId } = req.query;

    // Convert matchId and teamId to numbers if they are numeric strings
    if (matchId && /^\d+$/.test(matchId)) matchId = parseInt(matchId, 10);
    if (teamId && /^\d+$/.test(teamId)) teamId = parseInt(teamId, 10);

    

    switch (req.method) {
      case 'GET':
        if (!matchId) {
          return res.status(400).json({ error: 'matchId is required' });
        }

        const lineups = await collection.find({ matchId }).toArray();
        

        return res.status(200).json(lineups);

      case 'POST':
        const data = req.body;
        console.log('POST data:', data);

        if (!data.matchId || !data.teamId || !data.teamName) {
          return res.status(400).json({ error: 'matchId, teamId, teamName required' });
        }

        // Ensure numeric IDs
        if (typeof data.matchId === 'string' && /^\d+$/.test(data.matchId)) {
          data.matchId = parseInt(data.matchId, 10);
        }
        if (typeof data.teamId === 'string' && /^\d+$/.test(data.teamId)) {
          data.teamId = parseInt(data.teamId, 10);
        }

        data.lastUpdated = new Date();
        await collection.updateOne(
          { matchId: data.matchId, teamId: data.teamId },
          { $set: data },
          { upsert: true }
        );

      
        return res.status(200).json({ message: 'Lineup saved', lineup: data });

      case 'DELETE':
        if (!matchId || !teamId) {
          return res.status(400).json({ error: 'matchId and teamId required' });
        }

        await collection.deleteOne({ matchId, teamId });
       
        return res.status(200).json({ message: 'Lineup deleted' });

      default:
        res.setHeader('Allow', ['GET','POST','DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
   
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
