import type { FeedAuthor } from '@/features/feed/types';
import { isUniqueViolation } from '@/lib/supabase/postgresErrors';
import { supabaseErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';

export async function fetchFollowedBusinessIdSet(
  userId: string | null,
  businessIds: string[],
): Promise<Set<string>> {
  const followed = new Set<string>();
  if (!userId || businessIds.length === 0) return followed;

  const { data } = await supabase
    .from('business_follows')
    .select('business_id')
    .eq('user_id', userId)
    .in('business_id', businessIds);

  for (const row of data ?? []) followed.add(row.business_id);
  return followed;
}

export async function toggleBusinessFollow(
  businessId: string,
  userId: string,
  isFollowing: boolean,
): Promise<{ error: string | null }> {
  if (isFollowing) {
    const { error } = await supabase
      .from('business_follows')
      .delete()
      .eq('user_id', userId)
      .eq('business_id', businessId);
    return { error: supabaseErrorMessage(error) };
  }

  const { data: inserted, error } = await supabase
    .from('business_follows')
    .insert({ user_id: userId, business_id: businessId }, { ignoreDuplicates: true })
    .select('user_id')
    .maybeSingle();

  if (error && !isUniqueViolation(error)) {
    return { error: supabaseErrorMessage(error)! };
  }

  return { error: null };
}

export async function isFollowingBusiness(
  userId: string,
  businessId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('business_follows')
    .select('user_id')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .maybeSingle();
  return !!data;
}

/** İşletme takiplerini mevcut isFollowing durumuna OR ile uygular. */
export async function applyBusinessFollowStateToFeedItems<
  T extends { author: FeedAuthor; isFollowing: boolean },
>(items: T[], userId: string | null): Promise<T[]> {
  if (!userId) return items;

  const businessIds = [
    ...new Set(
      items
        .map((item) => item.author.businessId)
        .filter((id): id is string => !!id),
    ),
  ];
  if (businessIds.length === 0) return items;

  const followed = await fetchFollowedBusinessIdSet(userId, businessIds);
  if (followed.size === 0) return items;

  return items.map((item) => {
    if (item.author.businessId && followed.has(item.author.businessId)) {
      return { ...item, isFollowing: true };
    }
    return item;
  });
}
