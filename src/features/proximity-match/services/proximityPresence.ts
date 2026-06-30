import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type ProximityPresenceResult = {
  ok: boolean;
  reason?: 'inactive_account';
  error?: string;
};

export async function upsertProximityPresence(
  regionId: string,
  latitude: number,
  longitude: number,
): Promise<ProximityPresenceResult> {
  const { data, error } = await supabase.rpc('upsert_proximity_match_presence', {
    p_region_id: regionId,
    p_latitude: latitude,
    p_longitude: longitude,
  });

  if (error) {
    return { ok: false, error: supabaseErrorMessage(error)! };
  }

  const payload = data as { ok?: boolean; reason?: 'inactive_account' } | null;
  if (payload?.ok === false) {
    return { ok: false, reason: payload.reason };
  }

  return { ok: true };
}

export async function clearProximityPresence(): Promise<void> {
  await supabase.rpc('clear_proximity_match_presence');
}
