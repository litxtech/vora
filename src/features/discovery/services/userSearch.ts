import {
  DISCOVERY_USER_SEARCH_LIMIT,
  DISCOVERY_USER_SEARCH_MIN_LENGTH,
} from '@/features/discovery/constants';
import type { DiscoveryUserResult } from '@/features/discovery/types';
import { supabase } from '@/lib/supabase/client';

type SearchRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

function mapRow(row: SearchRow): DiscoveryUserResult {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
  };
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/^@/, '');
}

async function searchProfilesDirect(query: string, limit = DISCOVERY_USER_SEARCH_LIMIT): Promise<DiscoveryUserResult[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_verified')
    .eq('account_status', 'active')
    .or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as SearchRow[]).map(mapRow);
}

export async function searchDiscoverUsers(query: string): Promise<DiscoveryUserResult[]> {
  const q = normalizeQuery(query);
  if (q.length < DISCOVERY_USER_SEARCH_MIN_LENGTH) return [];

  const { data, error } = await supabase.rpc('search_discover_users', {
    p_query: q,
    p_limit: DISCOVERY_USER_SEARCH_LIMIT,
  });

  if (!error) {
    return ((data ?? []) as SearchRow[]).map(mapRow);
  }

  return searchProfilesDirect(q);
}
