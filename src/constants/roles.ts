export const USER_ROLES = [
  'user',
  'verified_reporter',
  'moderator',
  'admin',
  'super_admin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Kullanıcı',
  verified_reporter: 'Doğrulanmış Muhabir',
  moderator: 'Moderatör',
  admin: 'Admin',
  super_admin: 'Süper Admin',
};

export function canModerate(role: UserRole): boolean {
  return role === 'moderator' || role === 'admin' || role === 'super_admin';
}

export function canAdmin(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}
