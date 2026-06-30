import { DISCOVERY_USER_SUGGESTIONS_LIMIT } from '@/features/discovery/constants';
import type { DiscoveryScope, DiscoveryUserResult } from '@/features/discovery/types';
import { supabase } from '@/lib/supabase/client';

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

function mapRow(row: ProfileRow): DiscoveryUserResult {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
  };
}

export async function fetchDiscoverUserSuggestions(
  regionId: string,
  scope: DiscoveryScope,
  options?: { excludeUserId?: string; limit?: number },
): Promise<DiscoveryUserResult[]> {
  const limit = options?.limit ?? DISCOVERY_USER_SUGGESTIONS_LIMIT;
  const isKaradenizWideScope = scope === 'karadeniz';

  const { data, error } = await supabase.rpc('fetch_discover_popular_users', {
    p_region_id: regionId,
    p_karadeniz_wide: isKaradenizWideScope,
    p_exclude_user_id: options?.excludeUserId ?? null,
    p_limit: limit,
  });

  if (!error && data) {
    return (data as ProfileRow[]).map(mapRow);
  }

  let query = supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_verified')
    .eq('account_status', 'active')
    .eq('is_guest', false)
    .order('is_verified', { ascending: false })
    .limit(limit);

  if (!isKaradenizWideScope) {
    query = query.eq('region_id', regionId);
  }

  if (options?.excludeUserId) {
    query = query.neq('id', options.excludeUserId);
  }

  const { data: fallback, error: fallbackError } = await query;
  if (fallbackError || !fallback) return [];

  return (fallback as ProfileRow[]).map(mapRow);
}
