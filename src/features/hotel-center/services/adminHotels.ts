import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminHotelListingRow = {
  id: string;
  name: string;
  owner_id: string;
  owner_username: string;
  region_id: string;
  district: string | null;
  price_per_night: number;
  status: string;
  avg_rating: number;
  review_count: number;
  view_count: number;
  is_featured: boolean;
  created_at: string;
};

export type AdminHotelReviewRow = {
  id: string;
  hotel_id: string;
  hotel_name: string;
  reviewer_id: string;
  reviewer_username: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type HotelModerationAction = 'pause' | 'publish' | 'feature' | 'unfeature';

export async function fetchAdminHotelListings(
  status = 'all',
  limit = 50,
): Promise<AdminHotelListingRow[]> {
  const { data, error } = await supabase.rpc('admin_list_hotel_listings', {
    p_status: status,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as AdminHotelListingRow[];
}

export async function fetchAdminHotelReviews(limit = 50): Promise<AdminHotelReviewRow[]> {
  const { data, error } = await supabase.rpc('admin_list_hotel_reviews', { p_limit: limit });
  if (error || !data) return [];
  return data as AdminHotelReviewRow[];
}

export async function adminModerateHotelListing(
  hotelId: string,
  action: HotelModerationAction,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_moderate_hotel_listing', {
    p_hotel_id: hotelId,
    p_action: action,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function adminDeleteHotelReview(reviewId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_delete_hotel_review', { p_review_id: reviewId });
  return { error: supabaseErrorMessage(error) };
}
