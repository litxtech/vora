import type { HotelGuestType, HotelReview } from '@/features/hotel-center/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type ReviewRow = {
  id: string;
  hotel_id: string;
  reviewer_id: string;
  guest_type: HotelGuestType;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { username: string | null; avatar_url: string | null } | { username: string | null; avatar_url: string | null }[] | null;
};

function mapReview(row: ReviewRow): HotelReview {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    hotelId: row.hotel_id,
    reviewerId: row.reviewer_id,
    guestType: row.guest_type,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    reviewerUsername: profile?.username ?? null,
    reviewerAvatarUrl: profile?.avatar_url ?? null,
  };
}

export async function fetchHotelReviews(hotelId: string): Promise<HotelReview[]> {
  const { data, error } = await supabase
    .from('hotel_reviews')
    .select('id, hotel_id, reviewer_id, guest_type, rating, comment, created_at, profiles:reviewer_id (username, avatar_url)')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return (data as unknown as ReviewRow[]).map(mapReview);
}

export async function submitHotelReview(
  hotelId: string,
  reviewerId: string,
  rating: number,
  guestType: HotelGuestType,
  comment?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('hotel_reviews').upsert(
    {
      hotel_id: hotelId,
      reviewer_id: reviewerId,
      guest_type: guestType,
      rating,
      comment: comment?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'hotel_id,reviewer_id' },
  );

  return { error: supabaseErrorMessage(error) };
}

export async function deleteHotelReview(reviewId: string, reviewerId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('hotel_reviews').delete().eq('id', reviewId).eq('reviewer_id', reviewerId);
  return { error: supabaseErrorMessage(error) };
}
