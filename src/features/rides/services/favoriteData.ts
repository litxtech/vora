import { ridesSupabase } from '@/features/rides/services/ridesSupabase';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchFavoriteIds(userId: string): Promise<string[]> {
  const { data, error } = await ridesSupabase
    .from('ride_favorites')
    .select('trip_id')
    .eq('user_id', userId);

  if (error) return [];
  return (data ?? []).map((r: { trip_id: string }) => r.trip_id);
}

export async function toggleRideFavorite(
  userId: string,
  tripId: string,
  isFavorite: boolean,
): Promise<{ error: string | null }> {
  if (isFavorite) {
    const { error } = await ridesSupabase.from('ride_favorites').delete().eq('user_id', userId).eq('trip_id', tripId);
    return { error: supabaseErrorMessage(error) };
  }
  const { error } = await ridesSupabase.from('ride_favorites').insert({ user_id: userId, trip_id: tripId });
  return { error: supabaseErrorMessage(error) };
}
