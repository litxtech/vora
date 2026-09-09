import type { GenderId } from '@/constants/registration';
import {
  DATE_USER_SEARCH_LIMIT,
  DATE_USER_SEARCH_MIN_LENGTH,
} from '@/features/date/constants';
import { supabase } from '@/lib/supabase/client';

export type DateUserSnippet = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  gender: GenderId | null;
};

type SnippetRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  gender: string | null;
};

function mapSnippet(row: SnippetRow): DateUserSnippet {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    gender: (row.gender as GenderId) ?? null,
  };
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/^@/, '');
}

export async function fetchDateParticipantProfiles(
  userIds: string[],
): Promise<Map<string, DateUserSnippet>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase.rpc('date_participant_snippets' as never, {
    p_user_ids: unique,
  } as never);

  if (error || !data) return new Map();

  return new Map(
    ((data ?? []) as SnippetRow[]).map((row) => [row.id, mapSnippet(row)]),
  );
}

async function searchDateUsersDirect(query: string, limit = DATE_USER_SEARCH_LIMIT): Promise<DateUserSnippet[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, gender')
    .eq('account_status', 'active')
    .or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as SnippetRow[]).map(mapSnippet);
}

export async function searchDateUsers(query: string): Promise<DateUserSnippet[]> {
  const q = normalizeQuery(query);
  if (q.length < DATE_USER_SEARCH_MIN_LENGTH) return [];

  const { data, error } = await supabase.rpc('search_date_users' as never, {
    p_query: q,
    p_limit: DATE_USER_SEARCH_LIMIT,
  } as never);

  if (!error) {
    return ((data ?? []) as SnippetRow[]).map(mapSnippet);
  }

  return searchDateUsersDirect(q);
}

export function snippetToParticipant(
  snippet: DateUserSnippet,
  options: { isCreator?: boolean } = {},
) {
  return {
    userId: snippet.id,
    username: snippet.username,
    fullName: snippet.fullName,
    avatarUrl: snippet.avatarUrl,
    gender: snippet.gender,
    isCreator: options.isCreator ?? false,
  };
}
