import type { HiddenAuthors } from '@/features/moderation/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchHiddenAuthors(userId: string | null): Promise<HiddenAuthors> {
  const empty = { blocked: new Set<string>(), muted: new Set<string>(), restricted: new Set<string>() };
  if (!userId) return empty;

  const [blocksRes, mutesRes, blockedByRes] = await Promise.all([
    supabase.from('user_blocks').select('blocked_id, is_restricted').eq('blocker_id', userId),
    supabase.from('user_mutes').select('muted_id').eq('muter_id', userId),
    supabase.from('user_blocks').select('blocker_id').eq('blocked_id', userId).eq('is_restricted', false),
  ]);

  const blocked = new Set<string>();
  const restricted = new Set<string>();

  for (const row of blocksRes.data ?? []) {
    if (row.is_restricted) restricted.add(row.blocked_id);
    else blocked.add(row.blocked_id);
  }
  for (const row of blockedByRes.data ?? []) blocked.add(row.blocker_id);

  const muted = new Set((mutesRes.data ?? []).map((r) => r.muted_id));

  return { blocked, muted, restricted };
}

export function shouldHideAuthor(authorId: string, hidden: HiddenAuthors): boolean {
  return hidden.blocked.has(authorId) || hidden.muted.has(authorId);
}

export async function muteUser(
  muterId: string,
  mutedId: string,
): Promise<{ error: string | null }> {
  if (mutedId.startsWith('demo-')) return { error: null };

  const { error } = await supabase.from('user_mutes').upsert(
    { muter_id: muterId, muted_id: mutedId },
    { onConflict: 'muter_id,muted_id' },
  );

  return { error: supabaseErrorMessage(error) };
}

export async function unmuteUser(
  muterId: string,
  mutedId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_mutes')
    .delete()
    .eq('muter_id', muterId)
    .eq('muted_id', mutedId);
  return { error: supabaseErrorMessage(error) };
}

export async function fetchRestrictedUserIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId)
    .eq('is_restricted', true);

  return new Set((data ?? []).map((r) => r.blocked_id));
}

export async function fetchBlockMuteStatus(
  viewerId: string,
  targetId: string,
): Promise<{ isBlocked: boolean; isRestricted: boolean; isMuted: boolean }> {
  const [blockRes, muteRes] = await Promise.all([
    supabase
      .from('user_blocks')
      .select('is_restricted')
      .eq('blocker_id', viewerId)
      .eq('blocked_id', targetId)
      .maybeSingle(),
    supabase
      .from('user_mutes')
      .select('muter_id')
      .eq('muter_id', viewerId)
      .eq('muted_id', targetId)
      .maybeSingle(),
  ]);

  return {
    isBlocked: !!blockRes.data && !blockRes.data.is_restricted,
    isRestricted: !!blockRes.data?.is_restricted,
    isMuted: !!muteRes.data,
  };
}
