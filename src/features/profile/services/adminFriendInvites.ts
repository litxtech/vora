import { supabase } from '@/lib/supabase/client';

export type AdminFriendInviteStats = {
  total_redemptions: number;
  redemptions_today: number;
  redemptions_week: number;
};

export type AdminFriendInviteRedemptionRow = {
  id: string;
  inviter_id: string;
  inviter_username: string;
  invitee_id: string;
  invitee_username: string;
  invite_code: string;
  created_at: string;
};

export async function fetchAdminFriendInviteStats(): Promise<AdminFriendInviteStats | null> {
  const { data, error } = await supabase.rpc('admin_friend_invite_stats');
  if (error || !data) return null;
  return data as AdminFriendInviteStats;
}

export async function fetchAdminFriendInviteRedemptions(
  limit = 50,
): Promise<AdminFriendInviteRedemptionRow[]> {
  const { data, error } = await supabase.rpc('admin_list_friend_invite_redemptions', { p_limit: limit });
  if (error || !data) return [];
  return data as AdminFriendInviteRedemptionRow[];
}
