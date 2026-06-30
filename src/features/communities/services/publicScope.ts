import { supabase } from '@/lib/supabase/client';

type CommunityScopedQuery<T> = T & {
  is(column: string, value: null): T;
};

/** Genel akış / keşfet / harita — topluluk gönderileri hariç. */
export function excludeCommunityPosts<T extends CommunityScopedQuery<T>>(query: T): T {
  return query.is('community_id', null);
}

/** Genel keşfet / harita — topluluk etkinlikleri hariç. */
export function excludeCommunityEvents<T extends CommunityScopedQuery<T>>(query: T): T {
  return query.is('community_id', null);
}

export async function communitySourcePostIds(postIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(postIds.filter(Boolean))];
  if (unique.length === 0) return new Set();

  const { data } = await supabase.from('posts').select('id').in('id', unique).not('community_id', 'is', null);

  return new Set((data ?? []).map((row) => row.id));
}

export async function excludeReelsFromCommunities<T extends { source_post_id?: string | null }>(
  rows: T[],
): Promise<T[]> {
  const sourcePostIds = rows.map((row) => row.source_post_id).filter((id): id is string => !!id);
  if (sourcePostIds.length === 0) return rows;

  const communityPosts = await communitySourcePostIds(sourcePostIds);
  if (communityPosts.size === 0) return rows;

  return rows.filter((row) => !row.source_post_id || !communityPosts.has(row.source_post_id));
}
