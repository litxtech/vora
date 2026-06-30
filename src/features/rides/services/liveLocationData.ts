import { supabase } from '@/lib/supabase/client';
import { ridesSupabase } from '@/features/rides/services/ridesSupabase';
import type { RideLiveLocation } from '@/features/rides/types';
import { supabaseErrorMessage } from '@/lib/errors';

export async function upsertLiveLocation(
  tripId: string,
  latitude: number,
  longitude: number,
  heading?: number,
  currentCityId?: string,
  etaMinutes?: number,
): Promise<{ error: string | null }> {
  const { error } = await ridesSupabase.rpc('upsert_ride_live_location', {
    p_trip_id: tripId,
    p_latitude: latitude,
    p_longitude: longitude,
    p_heading: heading ?? null,
    p_current_city_id: currentCityId ?? null,
    p_eta_minutes: etaMinutes ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function fetchLiveLocation(tripId: string): Promise<RideLiveLocation | null> {
  const { data, error } = await ridesSupabase
    .from('ride_live_locations')
    .select('*')
    .eq('trip_id', tripId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    tripId: row.trip_id as string,
    driverId: row.driver_id as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    heading: row.heading as number | null,
    currentCityId: row.current_city_id as string | null,
    etaMinutes: row.eta_minutes as number | null,
    updatedAt: row.updated_at as string,
  };
}

export function subscribeLiveLocation(
  tripId: string,
  onUpdate: (location: RideLiveLocation) => void,
): () => void {
  const sub = supabase
    .channel(`ride-live-${tripId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ride_live_locations', filter: `trip_id=eq.${tripId}` },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (!row?.trip_id) return;
        onUpdate({
          tripId: row.trip_id as string,
          driverId: row.driver_id as string,
          latitude: row.latitude as number,
          longitude: row.longitude as number,
          heading: row.heading as number | null,
          currentCityId: row.current_city_id as string | null,
          etaMinutes: row.eta_minutes as number | null,
          updatedAt: row.updated_at as string,
        });
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(sub);
  };
}
