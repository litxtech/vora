import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type PinDurationOption = {
  id: 'unlimited' | 'days_1' | 'days_7' | 'days_30';
  label: string;
  days: number | null;
};

export const PIN_DURATION_OPTIONS: PinDurationOption[] = [
  { id: 'unlimited', label: 'Süresiz', days: null },
  { id: 'days_1', label: '1 Gün', days: 1 },
  { id: 'days_7', label: '7 Gün', days: 7 },
  { id: 'days_30', label: '30 Gün', days: 30 },
];

export function isPinActive(pinnedUntil: string | null | undefined): boolean {
  if (!pinnedUntil) return true;
  return new Date(pinnedUntil) > new Date();
}

export async function pinPost(postId: string, days: number | null, priority = 0) {
  const { error } = await supabase.rpc('admin_pin_post', {
    p_post_id: postId,
    p_days: days,
    p_priority: priority,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function unpinPost(postId: string) {
  const { error } = await supabase.rpc('admin_unpin_post', { p_post_id: postId });
  return { error: supabaseErrorMessage(error) };
}

export async function updatePostPin(postId: string, days: number | null, priority?: number) {
  const { error } = await supabase.rpc('admin_update_post_pin', {
    p_post_id: postId,
    p_days: days,
    p_priority: priority ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export type PinnedPostRow = {
  post_id: string;
  title: string | null;
  content: string;
  author_id: string;
  author_username: string;
  region_id: string;
  pinned_at: string;
  pinned_until: string | null;
  pin_priority: number;
  pinned_by: string | null;
  pinned_by_username: string | null;
  view_count: number;
  like_count: number;
};

export async function listPinnedPosts(limit = 50): Promise<PinnedPostRow[]> {
  const { data, error } = await supabase.rpc('admin_list_pinned_posts', { p_limit: limit });
  if (error) return [];
  return (data ?? []) as PinnedPostRow[];
}

export function formatPinExpiry(pinnedUntil: string | null): string {
  if (!pinnedUntil) return 'Süresiz';
  const date = new Date(pinnedUntil);
  if (date <= new Date()) return 'Süresi doldu';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
