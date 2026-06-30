import { supabase } from '@/lib/supabase/client';
import type { ListingType } from '@/features/personnel-center/types';

export type ListingOwnerStats = {
  viewCount: number;
  viewsLast7Days: number;
  applicationsTotal: number;
  applicationsPending: number;
  applicationsAccepted: number;
};

const EMPTY_STATS: ListingOwnerStats = {
  viewCount: 0,
  viewsLast7Days: 0,
  applicationsTotal: 0,
  applicationsPending: 0,
  applicationsAccepted: 0,
};

export async function fetchListingOwnerStats(
  listingType: ListingType,
  listingId: string,
): Promise<ListingOwnerStats> {
  const { data, error } = await supabase.rpc('get_personnel_listing_owner_stats', {
    p_listing_type: listingType,
    p_listing_id: listingId,
  });

  if (error || !data || typeof data !== 'object') return EMPTY_STATS;

  const row = data as Record<string, unknown>;
  if (typeof row.error === 'string') return EMPTY_STATS;

  return {
    viewCount: Number(row.view_count ?? 0),
    viewsLast7Days: Number(row.views_last_7_days ?? 0),
    applicationsTotal: Number(row.applications_total ?? 0),
    applicationsPending: Number(row.applications_pending ?? 0),
    applicationsAccepted: Number(row.applications_accepted ?? 0),
  };
}
