import {
  BLOCKED_BY_USER_MESSAGE,
  BLOCKED_OTHER_USER_MESSAGE,
} from '@/features/moderation/constants/blocking';
import { supabase } from '@/lib/supabase/client';

export type DirectBlockStatus = {
  blockedByMe: boolean;
  blockedByThem: boolean;
  isRestricted: boolean;
  cannotCommunicate: boolean;
  bannerMessage: string | null;
};

export async function fetchDirectBlockStatus(
  viewerId: string,
  otherUserId: string,
): Promise<DirectBlockStatus> {
  const [myBlockRes, theirBlockRes] = await Promise.all([
    supabase
      .from('user_blocks')
      .select('is_restricted')
      .eq('blocker_id', viewerId)
      .eq('blocked_id', otherUserId)
      .maybeSingle(),
    supabase
      .from('user_blocks')
      .select('is_restricted')
      .eq('blocker_id', otherUserId)
      .eq('blocked_id', viewerId)
      .maybeSingle(),
  ]);

  const blockedByMe = !!myBlockRes.data && !myBlockRes.data.is_restricted;
  const blockedByThem = !!theirBlockRes.data && !theirBlockRes.data.is_restricted;
  const isRestricted = !!myBlockRes.data?.is_restricted;
  const cannotCommunicate = blockedByMe || blockedByThem;

  let bannerMessage: string | null = null;
  if (blockedByThem) bannerMessage = BLOCKED_BY_USER_MESSAGE;
  else if (blockedByMe) bannerMessage = BLOCKED_OTHER_USER_MESSAGE;

  return {
    blockedByMe,
    blockedByThem,
    isRestricted,
    cannotCommunicate,
    bannerMessage,
  };
}
