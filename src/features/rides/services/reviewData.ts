import { supabase } from '@/lib/supabase/client';
import { ridesSupabase } from '@/features/rides/services/ridesSupabase';
import { supabaseErrorMessage } from '@/lib/errors';

export async function submitRideReview(
  reservationId: string,
  rating: number,
  comment?: string,
  tags?: string[],
): Promise<{ error: string | null }> {
  const { error } = await ridesSupabase.rpc('submit_ride_review', {
    p_reservation_id: reservationId,
    p_rating: rating,
    p_comment: comment ?? null,
    p_tags: tags ?? [],
  });
  return { error: supabaseErrorMessage(error) };
}

export async function fetchTripReviews(tripId: string) {
  const { data, error } = await ridesSupabase
    .from('ride_reviews')
    .select('id, rating, comment, tags, role, created_at, reviewer_id')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}
