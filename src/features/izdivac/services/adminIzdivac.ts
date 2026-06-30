import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type {
  AdminIzdivacUserRow,
  IzdivacBadgeVisibility,
  IzdivacSpecialBadgeType,
} from '@/features/izdivac/types';
import type { GenderId } from '@/constants/registration';

type RpcAdminRow = {
  user_id: string;
  username: string;
  full_name: string | null;
  gender: GenderId | null;
  birth_date: string | null;
  izdivac_access_granted: boolean;
  is_online: boolean;
  in_lobby: boolean;
  granted_at: string;
};

function mapAdminRow(row: RpcAdminRow): AdminIzdivacUserRow {
  return {
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    gender: row.gender,
    birthDate: row.birth_date,
    izdivacAccessGranted: row.izdivac_access_granted,
    isOnline: row.is_online,
    inLobby: row.in_lobby,
    grantedAt: row.granted_at,
  };
}

export async function grantIzdivacAccess(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_grant_izdivac_access', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}

export async function revokeIzdivacAccess(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_revoke_izdivac_access', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}

export async function fetchAdminIzdivacUsers(search?: string, limit = 50) {
  const { data, error } = await supabase.rpc('admin_list_izdivac_users', {
    p_search: search?.trim() || null,
    p_limit: limit,
  });

  return {
    data: ((data ?? []) as RpcAdminRow[]).map(mapAdminRow),
    error: supabaseErrorMessage(error),
  };
}

export type AdminIzdivacBadgeRow = {
  badgeType: IzdivacSpecialBadgeType;
  visibility: IzdivacBadgeVisibility;
  grantedAt: string;
};

export async function grantIzdivacBadge(
  userId: string,
  badgeType: IzdivacSpecialBadgeType,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_grant_izdivac_badge', {
    p_user_id: userId,
    p_badge_type: badgeType,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function revokeIzdivacBadge(
  userId: string,
  badgeType: IzdivacSpecialBadgeType,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_revoke_izdivac_badge', {
    p_user_id: userId,
    p_badge_type: badgeType,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function fetchAdminIzdivacBadges(
  userId: string,
): Promise<{ data: AdminIzdivacBadgeRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_list_izdivac_badges', { p_user_id: userId });
  return {
    data: ((data ?? []) as { badge_type: string; visibility: string; granted_at: string }[]).map((r) => ({
      badgeType: r.badge_type as IzdivacSpecialBadgeType,
      visibility: r.visibility as IzdivacBadgeVisibility,
      grantedAt: r.granted_at,
    })),
    error: supabaseErrorMessage(error),
  };
}

/** Uygulama bağlamında görünmesi gereken tikler (app/both) */
export async function fetchIzdivacAppBadges(
  userId: string,
): Promise<IzdivacSpecialBadgeType[]> {
  const { data, error } = await supabase.rpc('izdivac_user_special_badges', {
    p_user_id: userId,
    p_context: 'app',
  });
  if (error || !Array.isArray(data)) return [];
  const valid = ['jigolo', 'tilki', 'finansman'];
  return (data as { badge_type: string }[])
    .map((r) => r.badge_type)
    .filter((b): b is IzdivacSpecialBadgeType => valid.includes(b));
}

/** Birden fazla kullanıcının uygulama tiklerini tek sorguda getirir (feed için). */
export async function fetchIzdivacAppBadgesBatch(
  userIds: string[],
): Promise<Map<string, IzdivacSpecialBadgeType[]>> {
  const result = new Map<string, IzdivacSpecialBadgeType[]>();
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return result;

  const { data, error } = await supabase.rpc('izdivac_app_special_badges_batch', {
    p_user_ids: ids,
  });
  if (error || !Array.isArray(data)) return result;

  const valid = ['jigolo', 'tilki', 'finansman'];
  for (const row of data as { user_id: string; badge_type: string }[]) {
    if (!valid.includes(row.badge_type)) continue;
    const list = result.get(row.user_id) ?? [];
    list.push(row.badge_type as IzdivacSpecialBadgeType);
    result.set(row.user_id, list);
  }
  return result;
}
