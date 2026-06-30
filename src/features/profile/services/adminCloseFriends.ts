import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminCloseFriendRow = {
  friend_id: string;
  username: string;
  full_name: string | null;
  created_at: string;
};

export async function fetchAdminUserCloseFriends(
  userId: string,
  limit = 30,
): Promise<AdminCloseFriendRow[]> {
  const { data, error } = await supabase.rpc('admin_list_user_close_friends', {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as AdminCloseFriendRow[];
}

export async function removeAdminCloseFriend(
  userId: string,
  friendId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_remove_close_friend', {
    p_user_id: userId,
    p_friend_id: friendId,
  });
  return { error: supabaseErrorMessage(error) };
}
