import { supabase } from '@/lib/supabase/client';

export async function areMutualFriends(userA: string, userB: string): Promise<boolean> {
  if (userA === userB) return false;

  const [{ data: aToB }, { data: bToA }] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', userA)
      .eq('following_id', userB)
      .maybeSingle(),
    supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', userB)
      .eq('following_id', userA)
      .maybeSingle(),
  ]);

  return !!aToB && !!bToA;
}

export async function fetchMutualFriendIds(userId: string): Promise<string[]> {
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  const followingIds = (following ?? []).map((row) => row.following_id);
  if (followingIds.length === 0) return [];

  const { data: mutual } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
    .in('follower_id', followingIds);

  return (mutual ?? []).map((row) => row.follower_id);
}

export async function countMutualFriends(userId: string): Promise<number> {
  const ids = await fetchMutualFriendIds(userId);
  return ids.length;
}
