import type { LinkableSiblingProfile } from '@/features/account-switch/types';
import { supabase } from '@/lib/supabase/client';

type SearchRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

function mapRow(row: SearchRow): LinkableSiblingProfile {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
  };
}

async function searchDirect(
  query: string,
  accountType: 'personal' | 'business',
  excludeUserId: string | undefined,
  limit: number,
): Promise<LinkableSiblingProfile[]> {
  const trimmed = query.trim().replace(/^@/, '');
  if (trimmed.length < 2) return [];

  const pattern = `%${trimmed}%`;
  let builder = supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_verified')
    .eq('account_type', accountType)
    .or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
    .limit(limit);

  if (excludeUserId) {
    builder = builder.neq('id', excludeUserId);
  }

  const { data, error } = await builder;

  if (error) throw error;
  return ((data ?? []) as SearchRow[]).map(mapRow);
}

export async function searchLinkableSiblingAccounts(
  query: string,
  accountType: 'personal' | 'business',
  options?: { limit?: number; excludeUserId?: string },
): Promise<LinkableSiblingProfile[]> {
  const limit = options?.limit ?? 8;
  const trimmed = query.trim().replace(/^@/, '');
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase.rpc('search_linkable_sibling_accounts', {
    p_query: trimmed,
    p_account_type: accountType,
    p_limit: limit,
  });

  if (!error) {
    return ((data ?? []) as SearchRow[]).map(mapRow);
  }

  return searchDirect(trimmed, accountType, options?.excludeUserId, limit);
}
