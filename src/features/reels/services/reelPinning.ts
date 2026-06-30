import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type PinDurationOption = {
  id: 'unlimited' | 'days_1' | 'days_7' | 'days_30';
  label: string;
  days: number | null;
};

export const REEL_PIN_DURATION_OPTIONS: PinDurationOption[] = [
  { id: 'unlimited', label: 'Süresiz', days: null },
  { id: 'days_1', label: '1 Gün', days: 1 },
  { id: 'days_7', label: '7 Gün', days: 7 },
  { id: 'days_30', label: '30 Gün', days: 30 },
];

export function isReelPinActive(pinnedUntil: string | null | undefined): boolean {
  if (!pinnedUntil) return true;
  return new Date(pinnedUntil) > new Date();
}

export async function pinReel(reelId: string, days: number | null, priority = 0) {
  const { error } = await supabase.rpc('admin_pin_reel', {
    p_reel_id: reelId,
    p_days: days,
    p_priority: priority,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function unpinReel(reelId: string) {
  const { error } = await supabase.rpc('admin_unpin_reel', { p_reel_id: reelId });
  return { error: supabaseErrorMessage(error) };
}

export async function updateReelPin(reelId: string, days: number | null, priority?: number) {
  const { error } = await supabase.rpc('admin_update_reel_pin', {
    p_reel_id: reelId,
    p_days: days,
    p_priority: priority ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export type PinnedReelRow = {
  reel_id: string;
  caption: string | null;
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

export async function listPinnedReels(limit = 50): Promise<PinnedReelRow[]> {
  const { data, error } = await supabase.rpc('admin_list_pinned_reels', { p_limit: limit });
  if (error) return [];
  return (data ?? []) as PinnedReelRow[];
}

export function formatReelPinExpiry(pinnedUntil: string | null): string {
  if (!pinnedUntil) return 'Süresiz';
  const date = new Date(pinnedUntil);
  if (date <= new Date()) return 'Süresi doldu';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

type ReelSortItem = {
  isPinned?: boolean;
  pinPriority?: number;
  pinnedAt?: string | null;
  createdAt: string;
};

export function sortReelsWithPins<T extends ReelSortItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aPin = a.isPinned ? 1 : 0;
    const bPin = b.isPinned ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;

    if (aPin && bPin) {
      const priorityDiff = (b.pinPriority ?? 0) - (a.pinPriority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      const pinnedDiff =
        new Date(b.pinnedAt ?? 0).getTime() - new Date(a.pinnedAt ?? 0).getTime();
      if (pinnedDiff !== 0) return pinnedDiff;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
