import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import type { MarketplaceListingType, MarketplaceOffer, MarketplaceOfferStatus } from '@/features/marketplace/types';
import { supabaseErrorMessage } from '@/lib/errors';

type OfferRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  amount_cents: number | null;
  currency: string;
  message: string | null;
  status: MarketplaceOfferStatus;
  responded_at: string | null;
  created_at: string;
  profiles?: { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[];
  marketplace_listings?:
    | { title: string; cover_url: string | null; listing_type: string }
    | { title: string; cover_url: string | null; listing_type: string }[];
};

function mapOffer(row: OfferRow): MarketplaceOffer {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const listing = Array.isArray(row.marketplace_listings)
    ? row.marketplace_listings[0]
    : row.marketplace_listings;
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    buyerName: profile?.full_name ?? profile?.username ?? null,
    amountCents: row.amount_cents,
    currency: row.currency,
    message: row.message,
    status: row.status,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    listingTitle: listing?.title ?? null,
    listingCoverUrl: listing?.cover_url ?? null,
    listingType: listing?.listing_type as MarketplaceOffer['listingType'],
  };
}

const OFFER_SELECT = `
  id, listing_id, buyer_id, amount_cents, currency, message, status, responded_at, created_at,
  profiles!marketplace_offers_buyer_id_fkey (full_name, username)
`;

const OFFER_WITH_LISTING_SELECT = `
  id, listing_id, buyer_id, amount_cents, currency, message, status, responded_at, created_at,
  profiles!marketplace_offers_buyer_id_fkey (full_name, username),
  marketplace_listings (title, cover_url, listing_type)
`;

async function fetchSellerListingIds(sellerId: string): Promise<string[]> {
  const { data } = await mpSupabase.from('marketplace_listings').select('id').eq('author_id', sellerId);
  return ((data as { id: string }[] | null) ?? []).map((r) => r.id);
}

export async function fetchReceivedOffers(
  sellerId: string,
  limit = 50,
): Promise<MarketplaceOffer[]> {
  const listingIds = await fetchSellerListingIds(sellerId);
  if (!listingIds.length) return [];

  const { data, error } = await mpSupabase
    .from('marketplace_offers')
    .select(OFFER_WITH_LISTING_SELECT)
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('fetchReceivedOffers', error.message);
    return [];
  }

  return ((data ?? []) as OfferRow[]).map(mapOffer);
}

export async function fetchSentOffers(buyerId: string, limit = 50): Promise<MarketplaceOffer[]> {
  const { data, error } = await mpSupabase
    .from('marketplace_offers')
    .select(OFFER_WITH_LISTING_SELECT)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('fetchSentOffers', error.message);
    return [];
  }

  return ((data ?? []) as OfferRow[]).map(mapOffer);
}

export async function countPendingOffers(
  userId: string,
): Promise<{ receivedPending: number; sentPending: number }> {
  const listingIds = await fetchSellerListingIds(userId);

  const [receivedRes, sentRes] = await Promise.all([
    listingIds.length
      ? mpSupabase
          .from('marketplace_offers')
          .select('id', { count: 'exact', head: true })
          .in('listing_id', listingIds)
          .eq('status', 'pending')
      : Promise.resolve({ count: 0 }),
    mpSupabase
      .from('marketplace_offers')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', userId)
      .eq('status', 'pending'),
  ]);

  return {
    receivedPending: receivedRes.count ?? 0,
    sentPending: sentRes.count ?? 0,
  };
}

export async function fetchListingOffers(listingId: string): Promise<MarketplaceOffer[]> {
  const { data, error } = await mpSupabase
    .from('marketplace_offers')
    .select(OFFER_SELECT)
    .eq('listing_id', listingId)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.warn('fetchListingOffers', error.message);
    return [];
  }

  return ((data ?? []) as OfferRow[]).map(mapOffer);
}

export async function fetchMyOfferForListing(
  listingId: string,
  buyerId: string,
): Promise<MarketplaceOffer | null> {
  const { data } = await mpSupabase
    .from('marketplace_offers')
    .select(OFFER_SELECT)
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return mapOffer(data as OfferRow);
}

export async function submitMarketplaceOffer(input: {
  listingId: string;
  amountCents?: number | null;
  message?: string | null;
  listingType: MarketplaceListingType;
}): Promise<{ error: string | null; offerId?: string }> {
  const { data, error } = await mpSupabase.rpc('marketplace_submit_offer', {
    p_listing_id: input.listingId,
    p_amount_cents: input.amountCents ?? undefined,
    p_message: input.message?.trim() || undefined,
  });

  if (error) return { error: supabaseErrorMessage(error)! };

  const result = data as { error?: string; ok?: boolean; offer_id?: string } | null;
  if (result?.error) return { error: result.error };
  return { error: null, offerId: result?.offer_id };
}

export async function respondToMarketplaceOffer(
  offerId: string,
  action: 'accept' | 'reject',
): Promise<{ error: string | null }> {
  const { data, error } = await mpSupabase.rpc('marketplace_respond_to_offer', {
    p_offer_id: offerId,
    p_action: action,
  });

  if (error) return { error: supabaseErrorMessage(error)! };

  const result = data as { error?: string; ok?: boolean } | null;
  return { error: result?.error ?? null };
}

export async function withdrawMarketplaceOffer(offerId: string): Promise<{ error: string | null }> {
  const { data, error } = await mpSupabase.rpc('marketplace_withdraw_offer', {
    p_offer_id: offerId,
  });

  if (error) return { error: supabaseErrorMessage(error)! };

  const result = data as { error?: string; ok?: boolean } | null;
  return { error: result?.error ?? null };
}
