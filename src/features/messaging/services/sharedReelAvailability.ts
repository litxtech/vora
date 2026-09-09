import { supabase } from '@/lib/supabase/client';

type ReelAvailability = 'available' | 'removed';

const availabilityCache = new Map<string, ReelAvailability>();

export async function fetchSharedReelAvailability(reelId: string): Promise<boolean> {
  const cached = availabilityCache.get(reelId);
  if (cached === 'available') return true;
  if (cached === 'removed') return false;

  const { data, error } = await supabase
    .from('reels')
    .select('id')
    .eq('id', reelId)
    .eq('status', 'published')
    .maybeSingle();

  const available = !error && Boolean(data);
  availabilityCache.set(reelId, available ? 'available' : 'removed');
  return available;
}

export function markSharedReelRemoved(reelId: string): void {
  availabilityCache.set(reelId, 'removed');
}
