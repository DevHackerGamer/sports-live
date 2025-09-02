const { ObjectId } = require('mongodb');
const { getAdminMatchesCollection } = require('../lib/mongodb');

module.exports = async function handler(req, res) {
  try {
    const collection = await getAdminMatchesCollection();
    const { id } = req.query; // get id from query

    // GET all admin-created matches
    if (req.method === 'GET' && !id) {
      const matches = await collection.find({ createdByAdmin: true }).toArray();
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

    // POST new admin-created match
    if (req.method === 'POST' && !id) {
      let { homeTeam, awayTeam, date, time, competition } = req.body;

      // Validate required fields
      if (!homeTeam || !awayTeam || !date || !time) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (typeof homeTeam === 'string') homeTeam = { id: homeTeam, name: { en: homeTeam } };
      if (typeof awayTeam === 'string') awayTeam = { id: awayTeam, name: { en: awayTeam } };

      if (!competition) competition = { id: 'unknown', name: { en: 'Unknown Competition' } };
      else if (typeof competition === 'string') competition = { id: competition, name: { en: competition } };

      const newMatch = {
        id: new ObjectId().toString(),
        homeTeam,
        awayTeam,
        competition,
        teamA: homeTeam.name.en,
        teamB: awayTeam.name.en,
        competitionName: competition.name.en,
        utcDate: new Date(`${date}T${time}`).toISOString(),
        date,
        time,
        status: 'TIMED',
        stage: 'REGULAR_SEASON',
        matchday: null,
        group: null,
        score: {},
        odds: {},
        referees: [],
        createdByAdmin: true, // mark this as admin-created
        lastUpdated: new Date(),
        createdAt: new Date(),
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
