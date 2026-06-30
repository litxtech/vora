import {
  BLOCK_CALL_MESSAGE,
  BLOCK_FOLLOW_MESSAGE,
} from '@/features/moderation/constants/blocking';
import { supabase } from '@/lib/supabase/client';

export async function isUserBlocked(
  viewerId: string,
  targetId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_user_blocked', {
    p_viewer_id: viewerId,
    p_target_id: targetId,
  });
  if (error) return false;
  return !!data;
}

export async function canFollowUser(
  followerId: string,
  followingId: string,
): Promise<{ allowed: boolean; error: string | null }> {
  if (followerId === followingId) {
    return { allowed: false, error: 'Kendinizi takip edemezsiniz.' };
  }

  const blocked = await isUserBlocked(followerId, followingId);
  if (blocked) {
    return { allowed: false, error: BLOCK_FOLLOW_MESSAGE };
  }

  return { allowed: true, error: null };
}

export async function canCallUser(
  callerId: string,
  calleeId: string,
): Promise<{ allowed: boolean; error: string | null }> {
  const blocked = await isUserBlocked(callerId, calleeId);
  if (blocked) {
    return { allowed: false, error: BLOCK_CALL_MESSAGE };
  }
  return { allowed: true, error: null };
}

export async function isUserRestrictedBy(
  viewerId: string,
  targetId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('user_blocks')
    .select('blocker_id')
    .eq('blocker_id', viewerId)
    .eq('blocked_id', targetId)
    .eq('is_restricted', true)
    .maybeSingle();
  return !!data;
}
