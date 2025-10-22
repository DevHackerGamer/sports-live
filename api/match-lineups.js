const { getMatchLineupsCollection, getMatchLineupsCollectionESPN } = require('../lib/mongodb');

module.exports = async function handler(req, res) {
 
  try {
  const collection = await getMatchLineupsCollection();
  const collectionESPN = await getMatchLineupsCollectionESPN();
    // Ensure helpful indexes for quick lookups
    try { await collectionESPN.createIndex({ matchId: 1, teamId: 1 }); } catch(_) {}
    try { await collection.createIndex({ matchId: 1, teamId: 1 }); } catch(_) {}
    console.log('✅ Connected to Match_Lineups collection');

  let { matchId, teamId, live, source, refresh, force } = req.query;
  const mNum = matchId && /^\d+$/.test(matchId) ? parseInt(matchId, 10) : null;
  const tNum = teamId && /^\d+$/.test(teamId) ? parseInt(teamId, 10) : null;

    

    switch (req.method) {
      case 'GET':
        if (!matchId) {
          return res.status(400).json({ error: 'matchId is required' });
        }
        // Build precise filter to match test expectations and avoid over-broad scans
        const filter = {};
        if (mNum != null) filter.matchId = mNum; else filter.matchId = matchId;
        if (teamId) filter.teamId = (tNum != null ? tNum : teamId);
        // Prefer ESPN-cached lineups first
        let lineups = await collectionESPN.find(filter).toArray();
        if (!lineups || !lineups.length) {
          lineups = await collection.find(filter).toArray();
        }
        // Helper: normalize lineup shape to include starters/substitutes arrays
        const ensureNormalizedShape = (doc) => {
          if (!doc) return doc;
          // If already has starters/substitutes, keep as-is
          if (Array.isArray(doc.starters) || Array.isArray(doc.substitutes)) return doc;
          const players = Array.isArray(doc.players) ? doc.players : [];
          const starters = players.filter(p => p && p.starter);
          const substitutes = players.filter(p => p && !p.starter);
          // Map to minimal UI shape fields
          const mapP = (p) => ({
            id: p.id,
            name: p.name || p.displayName || p.shortName || 'Unknown',
            position: p.position || p.pos || '',
            jersey: p.jersey || p.uniform,
            nationality: p.nationality || p.country || ''
          });
          return {
            ...doc,
            starters: starters.map(mapP),
            substitutes: substitutes.map(mapP)
          };
        };

        // No live fetching here to avoid slow match loads; rely on periodic ESPN ingestor

        // Ensure any DB-fetched lineups are normalized before returning
        const normalized = (lineups || []).map(ensureNormalizedShape);
        // If a specific teamId was requested, filter down the response
        const response = teamId
          ? normalized.filter(l => String(l.teamId) === String(tNum != null ? tNum : teamId))
          : normalized;
        // Optionally persist normalization for legacy docs lacking starters/substitutes
        try {
          for (const lu of normalized) {
            if (!Array.isArray(lu.starters) && !Array.isArray(lu.substitutes)) continue;
            await collection.updateOne(
              { matchId: lu.matchId, teamId: lu.teamId },
              { $set: { starters: lu.starters || [], substitutes: lu.substitutes || [] } }
            );
          }
        } catch (_) {}

  return res.status(200).json(response);

      case 'POST':
        const data = req.body;
        console.log('POST data:', data);

        if (!data.matchId || !data.teamId || !data.teamName) {
          return res.status(400).json({ error: 'matchId, teamId, teamName required' });
        }

        // Ensure numeric IDs
        if (typeof data.matchId === 'string' && /^\d+$/.test(data.matchId)) data.matchId = parseInt(data.matchId, 10);
        if (typeof data.teamId === 'string' && /^\d+$/.test(data.teamId)) data.teamId = parseInt(data.teamId, 10);

        data.lastUpdated = new Date();
        
        // Update both regular and ESPN collections
        await Promise.all([
          collection.updateOne(
            { matchId: data.matchId, teamId: data.teamId },
            { $set: data },
            { upsert: true }
          ),
          collectionESPN.updateOne(
            { matchId: data.matchId, teamId: data.teamId },
            { $set: data },
            { upsert: true }
          )
        ]);

      
        return res.status(200).json({ message: 'Lineup saved', lineup: data });

      case 'DELETE':
        if (!matchId || !teamId) {
          return res.status(400).json({ error: 'matchId and teamId required' });
        }

        // Delete from both collections
        await Promise.all([
          collection.deleteOne({ matchId, teamId }),
          collectionESPN.deleteOne({ matchId, teamId })
        ]);
       
        return res.status(200).json({ message: 'Lineup deleted' });

      default:
        res.setHeader('Allow', ['GET','POST','DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
   
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
