import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type HizmetLiveLocation = {
  requestId: string;
  providerId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  etaMinutes: number | null;
  updatedAt: string;
};

export async function upsertHizmetLiveLocation(
  requestId: string,
  latitude: number,
  longitude: number,
  heading?: number,
  etaMinutes?: number,
): Promise<{ error?: string }> {
  const { data, error } = await supabase.rpc('upsert_vora_service_live_location', {
    p_request_id: requestId,
    p_latitude: latitude,
    p_longitude: longitude,
    p_heading: heading ?? null,
    p_eta_minutes: etaMinutes ?? null,
  });

  if (error) return { error: supabaseErrorMessage(error) };
  const result = data as { ok?: boolean; error?: string } | null;
  if (result?.error) return { error: result.error };
  return {};
}

export async function fetchHizmetLiveLocation(
  requestId: string,
): Promise<HizmetLiveLocation | null> {
  const { data } = await supabase
    .from('vora_service_live_locations')
    .select('*')
    .eq('request_id', requestId)
    .maybeSingle();

  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    requestId: row.request_id as string,
    providerId: row.provider_id as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    heading: (row.heading as number | null) ?? null,
    etaMinutes: (row.eta_minutes as number | null) ?? null,
    updatedAt: row.updated_at as string,
  };
}

export function subscribeHizmetLiveLocation(
  requestId: string,
  onUpdate: (location: HizmetLiveLocation) => void,
): () => void {
  const channel = supabase
    .channel(`vora-live-${requestId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'vora_service_live_locations',
        filter: `request_id=eq.${requestId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (!row?.request_id) return;
        onUpdate({
          requestId: row.request_id as string,
          providerId: row.provider_id as string,
          latitude: row.latitude as number,
          longitude: row.longitude as number,
          heading: (row.heading as number | null) ?? null,
          etaMinutes: (row.eta_minutes as number | null) ?? null,
          updatedAt: row.updated_at as string,
        });
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
