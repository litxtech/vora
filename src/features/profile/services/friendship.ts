import { fetchMutualFriendIds } from '@/features/profile/services/mutualFriends';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type FriendUser = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: import('@/types/database').UserRole;
  isVerified: boolean;
  trustScore: number;
};

export async function fetchFriendsList(
  userId: string,
  _viewerId: string | null,
  search = '',
): Promise<FriendUser[]> {
  const friendIds = await fetchMutualFriendIds(userId);
  if (friendIds.length === 0) return [];

  let query = supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, role, is_verified, trust_score')
    .in('id', friendIds);

  if (search.trim()) {
    query = query.or(`username.ilike.%${search.trim()}%,full_name.ilike.%${search.trim()}%`);
  }

  const { data: profiles } = await query;
  return (profiles ?? []).map((p) => ({
    id: p.id,
    username: p.username,
    fullName: p.full_name,
    avatarUrl: p.avatar_url,
    role: p.role,
    isVerified: p.is_verified,
    trustScore: (p as { trust_score?: number }).trust_score ?? 50,
  }));
}

export async function removeFriend(
  userId: string,
  friendId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('following_id', friendId);

  return { error: supabaseErrorMessage(error) };
}

/** Profil sahibi, kendisini takip eden bir kullanıcıyı takipçilerinden çıkarır. */
export async function removeFollower(
  followerId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('remove_follower', {
    p_follower_id: followerId,
  });

  return { error: supabaseErrorMessage(error) };
}
