import { supabase } from '@/lib/supabase/client';
import type { MessagingParticipant } from '../types';

type SearchRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

function mapRow(row: SearchRow): MessagingParticipant {
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    is_verified: row.is_verified,
  };
}

async function searchProfilesDirect(query: string, limit = 20): Promise<MessagingParticipant[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_verified')
    .or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as SearchRow[]).map(mapRow);
}

export async function searchMessagingUsers(query: string): Promise<MessagingParticipant[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { data, error } = await supabase.rpc('search_messaging_users', {
    p_query: q,
    p_limit: 20,
  });

  if (!error) {
    return ((data ?? []) as SearchRow[]).map(mapRow);
  }

  return searchProfilesDirect(q);
}

export function filterBlockedUsers(
  users: MessagingParticipant[],
  blockedIds: Set<string>,
  selfId?: string,
): MessagingParticipant[] {
  return users.filter((u) => u.id !== selfId && !blockedIds.has(u.id));
}
