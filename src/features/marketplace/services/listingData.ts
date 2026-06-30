import {
  MARKETPLACE_MAX_DESCRIPTION_LENGTH,
  MARKETPLACE_MAX_TITLE_LENGTH,
  MARKETPLACE_MIN_DESCRIPTION_LENGTH,
  MARKETPLACE_MIN_TITLE_LENGTH,
  MARKETPLACE_PAGE_SIZE,
  mapMarketplaceListingError,
} from '@/features/marketplace/constants';
import { fetchFavoriteIds } from '@/features/marketplace/services/favoriteData';
import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import type {
  CreateListingInput,
  MarketplaceDescriptionBlock,
  MarketplaceFilters,
  MarketplaceListing,
  MarketplaceTab,
} from '@/features/marketplace/types';
import { parseDescriptionBlocks, descriptionPlainText } from '@/features/marketplace/services/descriptionBlocks';
import { resolveMarketplaceRegionId } from '@/constants/regions';
import { supabaseErrorMessage } from '@/lib/errors';
import { notifyMapMarkerRemovedBySource } from '@/features/map/services/mapMarkerSync';

type ListingRow = {
  id: string;
  author_id: string;
  business_id: string | null;
  region_id: string;
  district: string;
  category: string;
  subcategory: string;
  title: string;
  description: string;
  description_blocks?: unknown;
  price: number | null;
  currency: string;
  listing_type: string;
  condition: string;
  status: string;
  delivery_mode: string;
  shipping_note: string | null;
  media_urls: string[];
  cover_url: string | null;
  tags: string[];
  show_phone: boolean;
  contact_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  view_count: number;
  favorite_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  sold_at?: string | null;
  variant_group_id?: string | null;
  source_listing_id?: string | null;
  profiles?: { full_name: string | null; username: string | null; is_verified: boolean; avatar_url: string | null } | { full_name: string | null; username: string | null; is_verified: boolean; avatar_url: string | null }[];
};

function mapListing(row: ListingRow, extras?: Partial<MarketplaceListing>): MarketplaceListing {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    authorId: row.author_id,
    businessId: row.business_id,
    regionId: row.region_id,
    district: row.district,
    category: row.category as MarketplaceListing['category'],
    subcategory: row.subcategory,
    title: row.title,
    description: row.description,
    descriptionBlocks: parseDescriptionBlocks(row.description_blocks),
    price: row.price,
    currency: row.currency,
    listingType: row.listing_type as MarketplaceListing['listingType'],
    condition: row.condition as MarketplaceListing['condition'],
    status: row.status as MarketplaceListing['status'],
    deliveryMode: row.delivery_mode as MarketplaceListing['deliveryMode'],
    shippingNote: row.shipping_note,
    mediaUrls: row.media_urls ?? [],
    coverUrl: row.cover_url,
    tags: row.tags ?? [],
    showPhone: row.show_phone,
    contactPhone: row.contact_phone,
    latitude: row.latitude,
    longitude: row.longitude,
    viewCount: row.view_count,
    favoriteCount: row.favorite_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    soldAt: row.sold_at ?? null,
    authorName: profile?.full_name ?? null,
    authorUsername: profile?.username ?? null,
    authorAvatarUrl: profile?.avatar_url ?? null,
    authorVerified: profile?.is_verified ?? false,
    variantGroupId: row.variant_group_id ?? null,
    sourceListingId: row.source_listing_id ?? null,
    ...extras,
  };
}

const LISTING_SELECT_BASE = `
  id, author_id, business_id, region_id, district, category, subcategory,
  title, description, description_blocks, price, currency, listing_type, condition, status,
  delivery_mode, shipping_note, media_urls, cover_url, tags, show_phone,
  contact_phone, latitude, longitude, view_count, favorite_count, comment_count,
  sold_at, variant_group_id, source_listing_id,
  created_at, updated_at
`;

const LISTING_SELECT = `${LISTING_SELECT_BASE},
  profiles!marketplace_listings_author_id_fkey (full_name, username, is_verified, avatar_url)
`;

type SellerLabelRow = {
  listing_id: string;
  seller_name: string | null;
  seller_username: string | null;
  seller_verified: boolean;
  seller_avatar_url: string | null;
};

async function enrichListingsWithSellerLabels(listings: MarketplaceListing[]): Promise<MarketplaceListing[]> {
  if (!listings.length) return listings;

  const { data } = await mpSupabase.rpc('marketplace_listing_seller_labels', {
    p_listing_ids: listings.map((l) => l.id),
  });

  const labels = new Map(
    ((data ?? []) as SellerLabelRow[]).map((row) => [
      row.listing_id,
      {
        authorName: row.seller_name,
        authorUsername: row.seller_username,
        authorVerified: row.seller_verified,
        authorAvatarUrl: row.seller_avatar_url,
      },
    ]),
  );

  return listings.map((listing) => {
    const label = labels.get(listing.id);
    if (!label) return listing;
    return {
      ...listing,
      authorName: label.authorName ?? listing.authorName,
      authorUsername: label.authorUsername ?? listing.authorUsername,
      authorVerified: label.authorVerified ?? listing.authorVerified,
      authorAvatarUrl: label.authorAvatarUrl ?? listing.authorAvatarUrl,
    };
  });
}

function dedupeMarketplaceListings(listings: MarketplaceListing[]): MarketplaceListing[] {
  const seen = new Set<string>();
  const result: MarketplaceListing[] = [];

  for (const listing of listings) {
    const imageKey = listing.coverUrl ?? listing.mediaUrls[0] ?? '';
    const key = `${listing.authorId}:${listing.title.trim().toLocaleLowerCase('tr-TR')}:${imageKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(listing);
  }

  return result;
}

function tabFilters(tab: MarketplaceTab): Partial<MarketplaceFilters> {
  switch (tab) {
    case 'free':
      return { listingType: 'free' };
    case 'trade':
      return { listingType: 'trade' };
    default:
      return {};
  }
}

export async function fetchMarketplaceListings(
  tab: MarketplaceTab,
  regionId: string | null,
  userId: string | null,
  filters: MarketplaceFilters = {},
  coords?: { lat: number; lng: number } | null,
  offset = 0,
  limit = MARKETPLACE_PAGE_SIZE,
): Promise<MarketplaceListing[]> {
  if (!regionId && tab !== 'mine' && tab !== 'favorites') {
    regionId = resolveMarketplaceRegionId(null);
  }

  if (tab === 'favorites') {
    if (!userId) return [];
    return fetchFavoriteListings(userId);
  }

  if (tab === 'mine') {
    if (!userId) return [];
    const { data } = await mpSupabase
      .from('marketplace_listings')
      .select(LISTING_SELECT_BASE)
      .eq('author_id', userId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(50);
    return enrichListingsWithSellerLabels(
      (data as ListingRow[] | null)?.map((row) => mapListing(row)) ?? [],
    );
  }

  const effectiveRegionId = resolveMarketplaceRegionId(regionId);

  const merged = { ...tabFilters(tab), ...filters };
  const sort = merged.sort ?? (tab === 'nearby' ? 'nearest' : 'favorites');

  const { data, error } = await mpSupabase.rpc('search_marketplace_listings', {
    p_region_id: effectiveRegionId,
    p_category: merged.category ?? undefined,
    p_listing_type: merged.listingType ?? undefined,
    p_condition: merged.condition ?? undefined,
    p_min_price: merged.minPrice ?? undefined,
    p_max_price: merged.maxPrice ?? undefined,
    p_lat: tab === 'nearby' || sort === 'nearest' ? coords?.lat ?? undefined : undefined,
    p_lng: tab === 'nearby' || sort === 'nearest' ? coords?.lng ?? undefined : undefined,
    p_radius_km: tab === 'nearby' ? merged.radiusKm ?? 15 : merged.radiusKm ?? undefined,
    p_sort: sort,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.warn('search_marketplace_listings', error.message);
    let query = mpSupabase
      .from('marketplace_listings')
      .select(LISTING_SELECT_BASE)
      .eq('region_id', effectiveRegionId)
      .eq('content_status', 'published')
      .in('status', ['active', 'reserved'])
      .order('favorite_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (merged.category) query = query.eq('category', merged.category);
    if (merged.listingType) query = query.eq('listing_type', merged.listingType);

    const { data: fallback } = await query;
    const mapped = (fallback as ListingRow[] | null)?.map((row) => mapListing(row)) ?? [];
    return enrichListingsWithSellerLabels(dedupeMarketplaceListings(mapped));
  }

  const rows = (data as ListingRow[] | null) ?? [];
  const listings = rows.map((row) => {
    let distanceKm: number | null = null;
    if (coords?.lat != null && coords?.lng != null && row.latitude != null && row.longitude != null) {
      const R = 6371;
      const dLat = ((row.latitude - coords.lat) * Math.PI) / 180;
      const dLng = ((row.longitude - coords.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((coords.lat * Math.PI) / 180) *
          Math.cos((row.latitude * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    return mapListing(row, { distanceKm });
  });

  if (userId && listings.length > 0) {
    const favIds = await fetchFavoriteIds(userId);
    return enrichListingsWithSellerLabels(
      dedupeMarketplaceListings(listings.map((l) => ({ ...l, isFavorite: favIds.has(l.id) }))),
    );
  }

  return enrichListingsWithSellerLabels(dedupeMarketplaceListings(listings));
}

export async function searchMarketplaceListings(
  regionId: string,
  query: string,
  filters: MarketplaceFilters = {},
  coords?: { lat: number; lng: number } | null,
): Promise<MarketplaceListing[]> {
  const effectiveRegionId = resolveMarketplaceRegionId(regionId);
  const sort = filters.sort ?? 'favorites';
  const { data, error } = await mpSupabase.rpc('search_marketplace_listings', {
    p_region_id: effectiveRegionId,
    p_query: query.trim() || undefined,
    p_category: filters.category ?? undefined,
    p_listing_type: filters.listingType ?? undefined,
    p_condition: filters.condition ?? undefined,
    p_min_price: filters.minPrice ?? undefined,
    p_max_price: filters.maxPrice ?? undefined,
    p_lat: sort === 'nearest' ? coords?.lat ?? undefined : undefined,
    p_lng: sort === 'nearest' ? coords?.lng ?? undefined : undefined,
    p_radius_km: filters.radiusKm ?? undefined,
    p_sort: sort,
    p_limit: 50,
    p_offset: 0,
  });

  if (error) return [];
  const listings = ((data as ListingRow[] | null) ?? []).map((row) => mapListing(row));
  return enrichListingsWithSellerLabels(dedupeMarketplaceListings(listings));
}

export async function fetchMarketplaceListing(id: string): Promise<MarketplaceListing | null> {
  const { data } = await mpSupabase
    .from('marketplace_listings')
    .select(LISTING_SELECT_BASE)
    .eq('id', id)
    .maybeSingle();

  if (!data) return null;
  await mpSupabase.rpc('increment_marketplace_view', { p_listing_id: id });
  const [listing] = await enrichListingsWithSellerLabels([mapListing(data as ListingRow)]);
  return listing ?? null;
}

export async function fetchSimilarListings(
  listing: MarketplaceListing,
  limit = 4,
): Promise<MarketplaceListing[]> {
  const { data } = await mpSupabase
    .from('marketplace_listings')
    .select(LISTING_SELECT_BASE)
    .eq('region_id', listing.regionId)
    .eq('category', listing.category)
    .eq('content_status', 'published')
    .in('status', ['active', 'reserved'])
    .neq('id', listing.id)
    .order('favorite_count', { ascending: false })
    .limit(limit);

  const mapped = ((data as ListingRow[] | null) ?? []).map((row) => mapListing(row));
  return enrichListingsWithSellerLabels(mapped);
}

export async function fetchListingVariants(
  listing: MarketplaceListing,
  limit = 8,
): Promise<MarketplaceListing[]> {
  const groupId = listing.variantGroupId ?? listing.id;
  const { data, error } = await mpSupabase
    .from('marketplace_listings')
    .select(LISTING_SELECT_BASE)
    .or(`variant_group_id.eq.${groupId},id.eq.${groupId}`)
    .in('status', ['active', 'reserved'])
    .eq('content_status', 'published')
    .neq('id', listing.id)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return [];

  const mapped = ((data as ListingRow[] | null) ?? []).map((row) => mapListing(row));
  return enrichListingsWithSellerLabels(mapped);
}

function validateListingText(
  title: string,
  description: string,
  descriptionBlocks?: MarketplaceDescriptionBlock[],
): string | null {
  const trimmedTitle = title.trim();
  const plain = descriptionPlainText(description, descriptionBlocks);

  if (trimmedTitle.length < MARKETPLACE_MIN_TITLE_LENGTH || trimmedTitle.length > MARKETPLACE_MAX_TITLE_LENGTH) {
    return `Başlık ${MARKETPLACE_MIN_TITLE_LENGTH}–${MARKETPLACE_MAX_TITLE_LENGTH} karakter arasında olmalıdır.`;
  }
  if (plain.length < MARKETPLACE_MIN_DESCRIPTION_LENGTH || plain.length > MARKETPLACE_MAX_DESCRIPTION_LENGTH) {
    return `Açıklama ${MARKETPLACE_MIN_DESCRIPTION_LENGTH}–${MARKETPLACE_MAX_DESCRIPTION_LENGTH} karakter arasında olmalıdır.`;
  }
  return null;
}

export async function createMarketplaceListing(
  input: CreateListingInput,
): Promise<{ id: string | null; error: string | null }> {
  const validationError = validateListingText(input.title, input.description, input.descriptionBlocks);
  if (validationError) return { id: null, error: validationError };

  const blocks = input.descriptionBlocks ?? [];
  const plainDescription = descriptionPlainText(input.description, blocks);

  const coverUrl = input.mediaUrls[0] ?? null;
  const { data, error } = await mpSupabase
    .from('marketplace_listings')
    .insert({
      author_id: input.authorId,
      business_id: input.businessId ?? null,
      region_id: input.regionId,
      district: input.district,
      category: input.category,
      subcategory: input.subcategory,
      title: input.title.trim(),
      description: plainDescription,
      description_blocks: blocks,
      price: input.listingType === 'free' ? 0 : input.price,
      listing_type: input.listingType,
      condition: input.condition,
      delivery_mode: input.deliveryMode,
      shipping_note: input.shippingNote ?? null,
      media_urls: input.mediaUrls,
      cover_url: coverUrl,
      tags: input.tags,
      show_phone: input.showPhone,
      contact_phone: input.contactPhone ?? null,
      status: 'active',
      content_status: 'published',
      source_listing_id: input.sourceListingId ?? null,
      variant_group_id: input.variantGroupId ?? null,
    })
    .select('id')
    .single();

  if (error) return { id: null, error: mapMarketplaceListingError(error.message) };
  if (!data?.id) return { id: null, error: 'İlan oluşturulamadı.' };

  const newId = data.id as string;

  if (input.sourceListingId && input.variantGroupId) {
    await mpSupabase
      .from('marketplace_listings')
      .update({ variant_group_id: input.variantGroupId })
      .eq('id', input.sourceListingId)
      .is('variant_group_id', null);
  }

  if (input.latitude != null && input.longitude != null) {
    await mpSupabase.rpc('set_marketplace_location', {
      p_listing_id: newId,
      lng: input.longitude,
      lat: input.latitude,
    });
  }

  return { id: newId, error: null };
}

export async function updateListingStatus(
  listingId: string,
  authorId: string,
  status: 'active' | 'reserved' | 'sold' | 'removed',
): Promise<{ error: string | null }> {
  const payload: {
    status: typeof status;
    updated_at: string;
    sold_at?: string | null;
  } = { status, updated_at: new Date().toISOString() };
  if (status === 'sold') payload.sold_at = new Date().toISOString();
  if (status === 'active') payload.sold_at = null;

  const { error } = await mpSupabase
    .from('marketplace_listings')
    .update(payload)
    .eq('id', listingId)
    .eq('author_id', authorId);

  return { error: supabaseErrorMessage(error) };
}

export async function setOwnerListingStatus(
  listingId: string,
  status: MarketplaceListing['status'],
): Promise<{ error: string | null }> {
  const { data, error } = await mpSupabase.rpc('marketplace_owner_set_listing_status', {
    p_listing_id: listingId,
    p_status: status,
  });
  if (error) return { error: supabaseErrorMessage(error)! };
  const result = data as { error?: string } | null;
  const resolvedError = result?.error ?? null;
  if (!resolvedError && status !== 'active') {
    notifyMapMarkerRemovedBySource('marketplace', listingId);
  }
  return { error: resolvedError };
}

export type UpdateListingInput = {
  district?: string;
  category?: CreateListingInput['category'];
  subcategory?: string;
  title?: string;
  description?: string;
  descriptionBlocks?: MarketplaceDescriptionBlock[];
  price?: number | null;
  listingType?: CreateListingInput['listingType'];
  condition?: CreateListingInput['condition'];
  deliveryMode?: CreateListingInput['deliveryMode'];
  shippingNote?: string | null;
  mediaUrls?: string[];
  tags?: string[];
  showPhone?: boolean;
  contactPhone?: string | null;
  latitude?: number;
  longitude?: number;
};

export async function updateMarketplaceListing(
  listingId: string,
  authorId: string,
  input: UpdateListingInput,
): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.district != null) payload.district = input.district;
  if (input.category != null) payload.category = input.category;
  if (input.subcategory != null) payload.subcategory = input.subcategory;
  if (input.title != null) payload.title = input.title.trim();
  if (input.description != null || input.descriptionBlocks != null) {
    const blocks = input.descriptionBlocks ?? [];
    const plain = descriptionPlainText(input.description ?? '', blocks);
    payload.description = plain;
    payload.description_blocks = blocks;
  }
  if (input.price !== undefined) payload.price = input.price;
  if (input.listingType != null) payload.listing_type = input.listingType;
  if (input.condition != null) payload.condition = input.condition;
  if (input.deliveryMode != null) payload.delivery_mode = input.deliveryMode;
  if (input.shippingNote !== undefined) payload.shipping_note = input.shippingNote;
  if (input.mediaUrls != null) {
    payload.media_urls = input.mediaUrls;
    payload.cover_url = input.mediaUrls[0] ?? null;
  }
  if (input.tags != null) payload.tags = input.tags;
  if (input.showPhone != null) payload.show_phone = input.showPhone;
  if (input.contactPhone !== undefined) payload.contact_phone = input.contactPhone;

  const { error } = await mpSupabase
    .from('marketplace_listings')
    .update(payload)
    .eq('id', listingId)
    .eq('author_id', authorId)
    .in('status', ['active', 'reserved', 'sold']);

  if (error) return { error: mapMarketplaceListingError(error.message) };

  if (input.latitude != null && input.longitude != null) {
    await mpSupabase.rpc('set_marketplace_location', {
      p_listing_id: listingId,
      lng: input.longitude,
      lat: input.latitude,
    });
  }

  return { error: null };
}

async function fetchFavoriteListings(userId: string): Promise<MarketplaceListing[]> {
  const { data: favorites } = await mpSupabase
    .from('marketplace_favorites')
    .select('listing_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!favorites?.length) return [];

  const ids = (favorites as { listing_id: string }[]).map((f) => f.listing_id);
  const { data } = await mpSupabase
    .from('marketplace_listings')
    .select(LISTING_SELECT_BASE)
    .in('id', ids)
    .eq('content_status', 'published')
    .in('status', ['active', 'reserved']);

  const order = new Map((favorites as { listing_id: string }[]).map((f, i) => [f.listing_id, i]));
  const mapped = ((data as ListingRow[] | null) ?? [])
    .map((row) => mapListing(row, { isFavorite: true }))
    .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  return enrichListingsWithSellerLabels(mapped);
}
