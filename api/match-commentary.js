// /api/match-commentary.js
const { getMatchCommentaryCollection, getMatchCommentaryCollectionESPN } = require('../lib/mongodb');

async function handler(req, res) {
  try {
  const commentaryCollection = await getMatchCommentaryCollection();
  const commentaryCollectionESPN = await getMatchCommentaryCollectionESPN();
    // Ensure helpful indexes (fast lookups by match)
    try { await commentaryCollectionESPN.createIndex({ matchId: 1 }); } catch(_) {}
    try { await commentaryCollection.createIndex({ matchId: 1 }); } catch(_) {}

    // --- Fetch commentary by matchId ---
    if (req.method === 'GET') {
      const matchId = req.query.matchId;
      if (!matchId) {
        return res.status(400).json({ error: 'Missing matchId parameter' });
      }

      // Try ESPN-cached commentary first, then fallback to legacy collection
      let raw = [];
      let dbDocESPN = await commentaryCollectionESPN.findOne({ matchId: matchId.toString() });
      if (dbDocESPN && Array.isArray(dbDocESPN.commentary) && dbDocESPN.commentary.length) {
        raw = dbDocESPN.commentary;
      }
      // Load existing persisted commentary to merge (legacy table)
      let dbDoc = await commentaryCollection.findOne({ matchId: matchId.toString() });
      let persisted = dbDoc && Array.isArray(dbDoc.commentary) ? dbDoc.commentary : [];

      // Merge with DB to build full history and avoid flicker when live feed is transiently empty
      if (persisted.length || raw.length) {
        const toKey = (c) => c?.id || `${c?.text || ''}|${c?.clock?.displayValue || c?.time || ''}`;
        const byKey = new Map();
        for (const c of persisted) { byKey.set(toKey(c), c); }
        for (const c of raw) { byKey.set(toKey(c), c); }
        raw = Array.from(byKey.values());
        // Persist back if we have more than DB
        if (raw.length > persisted.length) {
          try {
            await commentaryCollection.updateOne(
              { matchId: matchId.toString() },
              { $set: { matchId: matchId.toString(), commentary: raw, lastUpdated: new Date() } },
              { upsert: true }
            );
            await commentaryCollectionESPN.updateOne(
              { matchId: matchId.toString() },
              { $set: { matchId: matchId.toString(), commentary: raw, lastUpdated: new Date() } },
              { upsert: true }
            );
          } catch(_) {}
        }
      }
      // Final fallback to persisted only if still empty
      if (!raw.length && persisted.length) raw = persisted;
      // Normalize to UI shape: [{ id, time, text }]
      // Ensure chronological order using soccer-aware periods: pre, 1H, 1H stoppage, HT, 2H, 2H stoppage, FT, post
      const getTimeString = (c) => {
        let time = c?.time;
        if (!time && c?.clock && (typeof c.clock === 'object')) {
          time = c.clock.displayValue || c.clock.detail || c.clock.text;
        }
        if (time && typeof time === 'object') {
          time = time.displayValue || time.value || '';
        }
        if (!time && (typeof c?.minute === 'number')) {
          time = `${c.minute}'`;
        }
        return (time || '').toString();
      };
      const parseTimeParts = (t) => {
        if (!t) return { base: NaN, plus: 0, mm: NaN };
        const s0 = String(t).trim();
        const s = s0.replace(/[’′`´]/g, "'").replace(/\s+/g, '');
        // 45'+3 or 45+3'
        let m = /^(\d{1,3})'?\+(\d{1,2})'?$/.exec(s);
        if (m) return { base: parseInt(m[1],10), plus: parseInt(m[2],10), mm: parseInt(m[1],10) };
        m = /^(\d{1,3})'?$/.exec(s);
        if (m) return { base: parseInt(m[1],10), plus: 0, mm: parseInt(m[1],10) };
        m = /^(\d{1,2}):(\d{2})$/.exec(s);
        if (m) return { base: parseInt(m[1],10), plus: 0, mm: parseInt(m[1],10) };
        return { base: NaN, plus: 0, mm: NaN };
      };
      const classifyPhase = (c, tStr) => {
        const textRaw = (c?.text || c?.description || c?.comment || '').toString().toLowerCase();
        const typeRaw = (typeof c?.type === 'string' ? c.type : (c?.type?.text || c?.type?.id || '')).toString().toLowerCase();
        const combined = `${typeRaw} ${textRaw}`;
        // Explicit markers
        if (/(kick\s*off|start\s*of\s*(match|game|first\s*half)|match\s*start)/.test(combined)) return { rank: 0, bias: -1 };
        if (/(half\s*time|end\s*of\s*first\s*half|first\s*half\s*ends)/.test(combined)) return { rank: 3, bias: 0 };
        if (/(start\s*of\s*second\s*half|second\s*half\s*begins|2nd\s*half\s*begins)/.test(combined)) return { rank: 4, bias: -1, assume46: true };
        if (/(full\s*time|end\s*of\s*match|end\s*of\s*second\s*half|match\s*ends)/.test(combined)) return { rank: 6, bias: 0 };
        // Fallback by time
        const { base, plus } = parseTimeParts(tStr);
        if (!isNaN(base)) {
          if (base <= 45) {
            if (plus > 0) return { rank: 2, bias: plus/100 };
            return { rank: 1, bias: base/100 };
          }
          if (base <= 90) {
            // 46..90 regular
            if (plus > 0) return { rank: 5, bias: plus/100 };
            return { rank: 4, bias: base/100 };
          }
          // Extra time
          if (base <= 105) {
            if (plus > 0) return { rank: 8, bias: plus/100 }; // 1st ET stoppage
            return { rank: 7, bias: base/100 }; // 1st ET
          }
          if (base <= 120) {
            if (plus > 0) return { rank: 10, bias: plus/100 }; // 2nd ET stoppage
            return { rank: 9, bias: base/100 }; // 2nd ET
          }
        }
        // Unknown -> put after FT as post
        return { rank: 11, bias: 0 };
      };
      let norm = raw.map((c, idx) => {
        const id = c?.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const timeStr = getTimeString(c);
        const { base, plus, mm } = parseTimeParts(timeStr);
        const phase = classifyPhase(c, timeStr);
        // Compute sortable key
        // For second-half start marker, ensure it precedes 46'
        const minuteWithin = (!isNaN(mm) ? mm : (phase.assume46 ? 46 : NaN));
        const sortKey = [phase.rank, isNaN(minuteWithin) ? 0 : minuteWithin, plus, phase.bias || 0, idx];
        const text = c?.text || c?.description || c?.comment || '';
        return { id, time: timeStr || '', text, _key: sortKey };
      }).sort((a,b)=>{
        const ak = a._key, bk = b._key;
        for (let i=0;i<Math.max(ak.length,bk.length);i++) {
          const av = ak[i] ?? 0, bv = bk[i] ?? 0;
          if (av < bv) return -1;
          if (av > bv) return 1;
        }
        return 0;
      }).map(({_key, ...rest})=>rest);
  // Do not drop entries without time; ensure they still display (set to empty string if missing)
  norm = norm.map(e => ({ ...e, time: (e.time == null ? '' : e.time) }));
      return res.status(200).json(norm);
    }

    // --- Add or overwrite commentary ---
    if (req.method === 'POST') {
      const { matchId, newComment, overwrite, commentary } = req.body;
      if (!matchId) {
        return res.status(400).json({ error: 'Missing matchId in request body' });
      }

      const matchKey = matchId.toString();
      const existing = await commentaryCollection.findOne({ matchId: matchKey });

      if (overwrite && Array.isArray(commentary)) {
        // Replace full commentary list in both collections
        await Promise.all([
          commentaryCollection.updateOne(
            { matchId: matchKey },
            { $set: { commentary, lastUpdated: new Date() } },
            { upsert: true }
          ),
          commentaryCollectionESPN.updateOne(
            { matchId: matchKey },
            { $set: { commentary, lastUpdated: new Date() } },
            { upsert: true }
          )
        ]);
      } else if (newComment) {
        // Append new comment to both collections
        const update = {
          $push: { commentary: newComment },
          $set: { lastUpdated: new Date() },
        };
        await Promise.all([
          commentaryCollection.updateOne({ matchId: matchKey }, update, { upsert: true }),
          commentaryCollectionESPN.updateOne({ matchId: matchKey }, update, { upsert: true })
        ]);
      } else {
        return res.status(400).json({ error: 'No newComment or commentary array provided' });
      }

      return res.status(200).json({ message: 'Commentary updated successfully' });
    }

    // --- Delete entire commentary for a match ---
    if (req.method === 'DELETE') {
      const { matchId } = req.query;
      if (!matchId) {
        return res.status(400).json({ error: 'Missing matchId parameter' });
      }
      await commentaryCollection.deleteOne({ matchId: matchId.toString() });
      return res.status(200).json({ message: 'Commentary deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('❌ match-commentary API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = handler;
