const { getUserType } = require('../lib/auth');

// Unified handler: resolves user type via Clerk when available, else allows dev header override
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const type = (await getUserType(req)) || 'user';
    const isAdmin = String(type).toLowerCase() === 'admin';
    return res.status(200).json({ success: true, type, isAdmin });
  } catch (error) {
    console.error('auth-me error:', error);
    return res.status(200).json({ success: true, type: 'user', isAdmin: false });
  }
};
