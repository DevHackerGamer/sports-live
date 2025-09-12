const { getMatchesCollection } = require('../lib/mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success:false, error:'Method not allowed'});
  try {
    const matchesCollection = await getMatchesCollection();
    const names = await matchesCollection.distinct('competition.name', { 'competition.name': { $exists: true } });
    const filtered = names.filter(n => typeof n === 'string' && n.trim()).sort();
    res.status(200).json({ success:true, data: filtered, count: filtered.length });
  } catch (e) {
    res.status(500).json({ success:false, error:'Failed to load competitions', message: e.message });
  }
};
