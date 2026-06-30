import {
  ADMIN_PANEL_PERMISSION_CATALOG,
  ACTION_PERMISSION_KEYS,
  panelPermissionKey,
  ROLE_PERMISSION_PRESET_VALUES,
  type RolePermissionPresetId,
} from '@/features/admin/constants';
import { canModerate } from '@/constants/roles';
import type { UserRole } from '@/types/database';

export type PermissionMap = Record<string, boolean>;

export { panelPermissionKey };

export function canAccessAdminMenuItem(
  item: { id: string; adminOnly: boolean },
  permissions: PermissionMap | null,
  role: UserRole | null | undefined,
  isAdmin: boolean,
): boolean {
  if (!role || !canModerate(role)) return false;
  if (role === 'super_admin') return true;

  const key = panelPermissionKey(item.id);
  if (permissions && key in permissions) {
    return permissions[key] === true;
  }

  return !item.adminOnly || isAdmin;
}

export function countAllowedPermissions(permissions: PermissionMap, keys: string[]): number {
  return keys.filter((key) => permissions[key] === true).length;
}

export function getAllPermissionKeys(): string[] {
  return [...ACTION_PERMISSION_KEYS, ...ADMIN_PANEL_PERMISSION_CATALOG.map((item) => item.key)];
}

export function buildPresetPermissionMap(preset: RolePermissionPresetId): PermissionMap {
  return { ...ROLE_PERMISSION_PRESET_VALUES[preset] };
}

export function summarizeRolePermissions(
  permissions: PermissionMap,
  role: UserRole,
): { enabled: number; total: number; label: string } {
  const keys = getAllPermissionKeys();
  const enabled = countAllowedPermissions(permissions, keys);
  if (role === 'super_admin') {
    return { enabled: keys.length, total: keys.length, label: 'Tam yetki — tüm modüller' };
  }
  return { enabled, total: keys.length, label: `${enabled}/${keys.length} modül ve işlem` };
}

export function roleHasFullPanelAccess(role: UserRole, isAdmin: boolean): boolean {
  return role === 'super_admin' || (role === 'admin' && isAdmin);
}
