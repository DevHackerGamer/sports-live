// Client-side role utilities to interpret Clerk metadata consistently

export function getUserRoles(user) {
  if (!user) return [];
  const raw = [
    user?.privateMetadata?.type,
    user?.publicMetadata?.type,

  ]
    .concat(Array.isArray(user?.privateMetadata?.roles) ? user.privateMetadata.roles : [])
    .concat(Array.isArray(user?.publicMetadata?.roles) ? user.publicMetadata.roles : [])
    .filter(Boolean)
    .map(v => String(v).toLowerCase());
  return Array.from(new Set(raw));
}

export function isAdminFromUser(user) {
  const roles = getUserRoles(user);
  return roles.includes('admin');
}
