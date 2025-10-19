// Deprecated legacy endpoint kept temporarily for backward compatibility.
// Now proxies admin-created match CRUD operations into the primary matches collection
// so that newly created matches appear in the live sports feed (Match_Info collection).
const { ObjectId } = require('mongodb');
const { getMatchesCollection } = require('../lib/mongodb');

module.exports = async function handler(req, res) {
  try {
  const collection = await getMatchesCollection();
    const { id } = req.query; // get id from query

    // GET all admin-created matches (now stored inside main matches collection)
    if (req.method === 'GET' && !id) {
      const matches = await collection.find({ createdByAdmin: true }).sort({ utcDate: 1 }).toArray();
      const transformed = matches.map(m => ({
        ...m,
        teamA: m.homeTeam?.name?.en || 'Unnamed Team',
        teamB: m.awayTeam?.name?.en || 'Unnamed Team',
        competition: m.competition?.name?.en || 'Unknown Competition'
      }));
      return res.status(200).json(transformed);
    }

    // GET single admin-created match
    if (req.method === 'GET' && id) {
      const match = await collection.findOne({ id, createdByAdmin: true });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      return res.status(200).json(match);
    }

    // POST new admin-created match (writes into main matches collection)
    if (req.method === 'POST' && !id) {
      let { homeTeam, awayTeam, date, time, competition } = req.body || {};

      if (!homeTeam || !awayTeam || !date || !time) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (typeof homeTeam === 'string') homeTeam = { id: homeTeam, name: { en: homeTeam } };
      if (typeof awayTeam === 'string') awayTeam = { id: awayTeam, name: { en: awayTeam } };

      if (!competition) competition = { id: 'unknown', name: { en: 'Unknown Competition' } };
      else if (typeof competition === 'string') competition = { id: competition, name: { en: competition } };

      const now = new Date();
      // Interpret provided date/time as local and convert to UTC ISO
      const localStart = new Date(`${date}T${time}`);
      const utcDate = new Date(localStart.getTime() - localStart.getTimezoneOffset()*60000).toISOString();
      const newMatch = {
        id: `a_${new ObjectId().toString()}`, // prefix to avoid collision with numeric API IDs
        homeTeam,
        awayTeam,
        competition,
        utcDate,
        date,
        time,
        status: 'TIMED',
        stage: 'REGULAR_SEASON',
        matchday: null,
        group: null,
        score: { fullTime: { home: null, away: null } },
        odds: {},
        referees: [],
        createdByAdmin: true,
        lastUpdated: now.toISOString(),
        createdAt: now.toISOString(),
        source: 'admin'
      };

      await collection.insertOne(newMatch);
      return res.status(201).json(newMatch);
    }

    // DELETE single admin-created match
    if (req.method === 'DELETE' && id) {
    let filter;
    try {
        filter = { _id: new ObjectId(id), createdByAdmin: true };
    } catch {
        return res.status(400).json({ error: 'Invalid id format' });
    }

    const result = await collection.deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Match not found' });
    return res.status(200).json({ message: 'Match deleted successfully' });
    }

    // Method not allowed
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (err) {
    console.error('createdMatches API error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
