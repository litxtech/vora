import { areMutualFriends, fetchMutualFriendIds } from '@/features/profile/services/mutualFriends';
import { supabase } from '@/lib/supabase/client';
import type { FeedAuthor } from '@/features/feed/types';
import type { UserRole } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';

export type CloseFriend = FeedAuthor & { addedAt: string };

export async function fetchCloseFriends(userId: string): Promise<CloseFriend[]> {
  const { data } = await supabase
    .from('close_friends')
    .select(
      `friend_id, created_at,
       profiles!close_friends_friend_id_fkey (id, username, full_name, avatar_url, role, is_verified)`,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  type Row = {
    friend_id: string;
    created_at: string;
    profiles: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
      role: UserRole;
      is_verified: boolean;
    } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.profiles)
    .map((r) => ({
      id: r.profiles!.id,
      username: r.profiles!.username,
      fullName: r.profiles!.full_name,
      avatarUrl: r.profiles!.avatar_url,
      role: r.profiles!.role,
      isVerified: r.profiles!.is_verified,
      addedAt: r.created_at,
    }));
}

export async function fetchAvailableFriends(userId: string): Promise<CloseFriend[]> {
  const friendIds = await fetchMutualFriendIds(userId);
  if (friendIds.length === 0) return [];

  const { data: closeData } = await supabase
    .from('close_friends')
    .select('friend_id')
    .eq('user_id', userId);

  const closeSet = new Set((closeData ?? []).map((c) => c.friend_id));
  const availableIds = friendIds.filter((id) => !closeSet.has(id));

  if (availableIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, role, is_verified')
    .in('id', availableIds);

  return (profiles ?? []).map((p) => ({
    id: p.id,
    username: p.username,
    fullName: p.full_name,
    avatarUrl: p.avatar_url,
    role: p.role as UserRole,
    isVerified: p.is_verified,
    addedAt: '',
  }));
}

export async function addCloseFriend(
  userId: string,
  friendId: string,
): Promise<{ error: string | null }> {
  const isFriend = await areMutualFriends(userId, friendId);
  if (!isFriend) return { error: 'Sadece arkadaşlarınızı ekleyebilirsiniz.' };

  const { error } = await supabase.from('close_friends').insert({
    user_id: userId,
    friend_id: friendId,
  });

  return { error: supabaseErrorMessage(error) };
}

export async function removeCloseFriend(
  userId: string,
  friendId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('close_friends')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendId);

  return { error: supabaseErrorMessage(error) };
}

export async function isCloseFriend(userId: string, friendId: string): Promise<boolean> {
  const { data } = await supabase
    .from('close_friends')
    .select('friend_id')
    .eq('user_id', userId)
    .eq('friend_id', friendId)
    .maybeSingle();

  return !!data;
}
