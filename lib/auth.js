// Lightweight auth helper that prefers Clerk server verification when available,
// and falls back to a dev header (X-User-Type) if Clerk isn't configured.

let clerkClient = null;
let getAuth = null;
try {
  const clerk = require('@clerk/express');
  clerkClient = clerk.clerkClient;
  getAuth = clerk.getAuth;
} catch (_) {
  // Clerk not installed; dev fallback will be used
}

function getBearer(req) {
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (!auth || typeof auth !== 'string') return null;
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
  return null;
}

function normalizeRole(meta) {
  if (!meta) return '';
  const type = meta.type || meta.role || '';
  if (Array.isArray(meta.roles) && meta.roles.length) {
    // Prefer explicit admin role if present
    if (meta.roles.map(r => String(r).toLowerCase()).includes('admin')) return 'admin';
  }
  return String(type || '').toLowerCase();
}

// Attempt to resolve user type from Clerk private metadata
async function getUserType(req) {
  // Dev override header
  const devHeaderType = (req.headers['x-user-type'] || '').toString().toLowerCase();
  const devHeaderRole = (req.headers['x-user-role'] || '').toString().toLowerCase();
  const devType = devHeaderType || devHeaderRole;

  // If Clerk middleware/client is not present, return dev
  if (!clerkClient || !getAuth) {
    return devType || '';
  }

  try {
    const { userId } = getAuth(req) || {};
    if (!userId) return devType || '';
  const user = await clerkClient.users.getUser(userId);
  const privateType = normalizeRole(user?.privateMetadata);
  const publicType = normalizeRole(user?.publicMetadata);
  return privateType || publicType || '';
  } catch (e) {
    // On any failure, fall back to dev header
    return devType || '';
  }
}

async function isAdmin(req) {
  const type = await getUserType(req);
  return type === 'admin';
}

module.exports = { getUserType, isAdmin };
