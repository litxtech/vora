import type { ListingApplicationStats, ListingType, PersonnelListing } from '@/features/personnel-center/types';
import { supabase } from '@/lib/supabase/client';

export const EMPTY_LISTING_APPLICATION_STATS: ListingApplicationStats = {
  total: 0,
  pending: 0,
  accepted: 0,
};

function statsKey(listingType: ListingType, listingId: string): string {
  return `${listingType}:${listingId}`;
}

export async function fetchListingsApplicationStats(
  items: Array<{ type: ListingType; id: string }>,
): Promise<Map<string, ListingApplicationStats>> {
  const result = new Map<string, ListingApplicationStats>();
  if (!items.length) return result;

  const payload = items
    .filter((item) => item.id && !item.id.startsWith('demo-'))
    .map((item) => ({ listing_type: item.type, listing_id: item.id }));

  if (!payload.length) return result;

  const { data, error } = await supabase.rpc('get_personnel_listings_application_stats', {
    p_items: payload,
  });

  if (error || !data) return result;

  for (const row of data as Array<{
    listing_type: string;
    listing_id: string;
    applications_total: number;
    applications_pending: number;
    applications_accepted: number;
  }>) {
    result.set(statsKey(row.listing_type as ListingType, row.listing_id), {
      total: Number(row.applications_total ?? 0),
      pending: Number(row.applications_pending ?? 0),
      accepted: Number(row.applications_accepted ?? 0),
    });
  }

  return result;
}

export async function fetchListingApplicationStats(
  listingType: ListingType,
  listingId: string,
): Promise<ListingApplicationStats> {
  if (listingId.startsWith('demo-')) return EMPTY_LISTING_APPLICATION_STATS;
  const map = await fetchListingsApplicationStats([{ type: listingType, id: listingId }]);
  return map.get(statsKey(listingType, listingId)) ?? EMPTY_LISTING_APPLICATION_STATS;
}

export async function enrichListingsWithApplicationStats(listings: PersonnelListing[]): Promise<void> {
  if (!listings.length) return;

  const statsMap = await fetchListingsApplicationStats(
    listings.map((listing) => ({ type: listing.type, id: listing.id })),
  );

  for (const listing of listings) {
    listing.applicationStats =
      statsMap.get(statsKey(listing.type, listing.id)) ?? EMPTY_LISTING_APPLICATION_STATS;
  }
}
