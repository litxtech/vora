import type {
  BusinessAccountRecord,
  BusinessCommerceMode,
  BusinessRegistrationStatus,
  BusinessShopBrowseItem,
  BusinessShopHotel,
  BusinessShopProduct,
  BusinessShopSnapshot,
} from '@/features/business-center/types';
import { fetchHotelListings } from '@/features/hotel-center/services/hotelData';
import { fetchMarketplaceListings } from '@/features/marketplace/services/listingData';
import {
  applyShowcaseOrdering,
  ensureBusinessShopShowcaseSynced,
  fetchBusinessShopShowcase,
} from '@/features/business-center/services/businessShopShowcase';
import { resolveMarketplaceRegionId } from '@/constants/regions';
import { supabase } from '@/lib/supabase/client';

type BusinessRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  district: string | null;
  logo_url: string | null;
  cover_url: string | null;
  is_verified: boolean;
  region_id: string;
  owner_id: string;
  registration_status: string;
  registration_approved_at: string | null;
  owner: { is_premium: boolean } | { is_premium: boolean }[] | null;
  commerce_mode: string;
  shop_tagline: string | null;
  shop_accent: string | null;
  shop_published: boolean;
  shop_show_on_personal: boolean;
  view_count: number | null;
  latitude: number | null;
  longitude: number | null;
};

function mapBusinessRow(row: BusinessRow): BusinessAccountRecord {
  const ownerRaw = row.owner;
  const owner = Array.isArray(ownerRaw) ? ownerRaw[0] : ownerRaw;

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    phone: row.phone,
    website: row.website,
    address: row.address,
    district: row.district,
    logoUrl: row.logo_url,
    coverUrl: row.cover_url,
    isVerified: row.is_verified,
    regionId: row.region_id,
    ownerId: row.owner_id,
    registrationStatus: row.registration_status as BusinessRegistrationStatus,
    registrationApprovedAt: row.registration_approved_at,
    ownerIsPremium: owner?.is_premium ?? false,
    commerceMode: (row.commerce_mode ?? 'none') as BusinessCommerceMode,
    shopTagline: row.shop_tagline,
    shopAccent: row.shop_accent,
    shopPublished: row.shop_published ?? false,
    shopShowOnPersonal: row.shop_show_on_personal ?? false,
    viewCount: row.view_count ?? 0,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

const BUSINESS_SELECT = `
  id, name, category, description, phone, website, address, district,
  logo_url, cover_url, is_verified, region_id, owner_id,
  registration_status, registration_approved_at, commerce_mode, shop_tagline, shop_accent, shop_published, shop_show_on_personal, view_count,
  latitude, longitude,
  owner:profiles!businesses_owner_id_fkey (is_premium)
`;

export async function fetchBusinessAccountByOwner(ownerId: string): Promise<BusinessAccountRecord | null> {
  const { data } = await supabase
    .from('businesses')
    .select(BUSINESS_SELECT)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (!data) return null;
  return mapBusinessRow(data as BusinessRow);
}

export async function fetchBusinessAccountById(businessId: string): Promise<BusinessAccountRecord | null> {
  const { data } = await supabase
    .from('businesses')
    .select(BUSINESS_SELECT)
    .eq('id', businessId)
    .maybeSingle();

  if (!data) return null;
  return mapBusinessRow(data as BusinessRow);
}

export async function fetchBusinessShopProducts(
  businessId: string,
  regionId: string,
): Promise<BusinessShopProduct[]> {
  const { mpSupabase } = await import('@/features/marketplace/services/mpSupabase');
  const { data } = await mpSupabase
    .from('marketplace_listings')
    .select(
      `id, author_id, business_id, region_id, district, category, subcategory, title, description,
       price, currency, listing_type, condition, status, delivery_mode, shipping_note,
       media_urls, cover_url, tags, show_phone, contact_phone, latitude, longitude,
       view_count, favorite_count, comment_count, created_at, updated_at, variant_group_id, source_listing_id,
       profiles:author_id (full_name, username, is_verified, avatar_url)`,
    )
    .eq('business_id', businessId)
    .in('status', ['active', 'reserved'])
    .eq('content_status', 'published')
    .order('created_at', { ascending: false })
    .limit(48);

  if (!data?.length) return [];

  const { parseDescriptionBlocks } = await import('@/features/marketplace/services/descriptionBlocks');

  return data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      authorId: row.author_id,
      businessId: row.business_id,
      regionId: row.region_id,
      district: row.district,
      category: row.category,
      subcategory: row.subcategory,
      title: row.title,
      description: row.description,
      descriptionBlocks: parseDescriptionBlocks(row.description_blocks),
      price: row.price,
      currency: row.currency,
      listingType: row.listing_type,
      condition: row.condition,
      status: row.status,
      deliveryMode: row.delivery_mode,
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
      authorName: profile?.full_name ?? null,
      authorUsername: profile?.username ?? null,
      authorAvatarUrl: profile?.avatar_url ?? null,
      authorVerified: profile?.is_verified ?? false,
      variantGroupId: row.variant_group_id ?? null,
      sourceListingId: row.source_listing_id ?? null,
    } as BusinessShopProduct;
  });
}

export async function fetchBusinessShopHotels(
  business: BusinessAccountRecord,
): Promise<BusinessShopHotel[]> {
  const { data: byBusiness } = await supabase
    .from('hotel_listings')
    .select(
      'id, name, district, price_per_night, cover_url, student_discount_pct, avg_rating, review_count, status',
    )
    .eq('business_id', business.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(12);

  if (byBusiness?.length) {
    return byBusiness.map((row) => ({
      id: row.id,
      name: row.name,
      district: row.district,
      pricePerNight: row.price_per_night,
      currency: 'TRY',
      coverUrl: row.cover_url,
      studentDiscountPct: row.student_discount_pct ?? 0,
      ratingAvg: Number(row.avg_rating) || 0,
      reviewCount: row.review_count ?? 0,
    }));
  }

  const hotels = await fetchHotelListings('mine', business.regionId, business.ownerId);
  return hotels
    .filter((h) => h.status === 'published')
    .map((h) => ({
      id: h.id,
      name: h.name,
      district: h.district,
      pricePerNight: h.pricePerNight,
      currency: h.currency,
      coverUrl: h.coverUrl,
      studentDiscountPct: h.studentDiscountPct,
      ratingAvg: h.ratingAvg,
      reviewCount: h.reviewCount,
    }));
}

export async function fetchBusinessShopSnapshot(
  businessId: string,
  options: { includeHiddenShowcase?: boolean } = {},
): Promise<BusinessShopSnapshot | null> {
  const business = await fetchBusinessAccountById(businessId);
  if (!business || business.registrationStatus !== 'approved') return null;

  const regionId = resolveMarketplaceRegionId(business.regionId);
  const [rawProducts, rawHotels] = await Promise.all([
    fetchBusinessShopProducts(businessId, regionId),
    fetchBusinessShopHotels(business),
  ]);

  const showcase = options.includeHiddenShowcase
    ? await ensureBusinessShopShowcaseSynced(businessId, rawProducts, rawHotels)
    : await fetchBusinessShopShowcase(businessId);

  const products = applyShowcaseOrdering(rawProducts, showcase, 'product', {
    visibleOnly: !options.includeHiddenShowcase,
  });
  const hotels = applyShowcaseOrdering(rawHotels, showcase, 'hotel', {
    visibleOnly: !options.includeHiddenShowcase,
  });

  const hasItems = products.length > 0 || hotels.length > 0;
  const isShowcase = business.commerceMode === 'showcase';
  if (!business.shopPublished && business.commerceMode === 'none' && !hasItems) return null;
  if (!business.shopPublished && isShowcase && !hasItems) return null;

  return { business, products, hotels };
}

export async function fetchPublishedBusinessShops(limit = 24): Promise<BusinessShopBrowseItem[]> {
  const { data } = await supabase
    .from('businesses')
    .select(BUSINESS_SELECT)
    .eq('registration_status', 'approved')
    .eq('shop_published', true)
    .neq('commerce_mode', 'none')
    .order('view_count', { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  const businessIds = data.map((b) => b.id);
  const ownerIds = data.map((b) => b.owner_id);

  const [{ data: productCounts }, { data: hotelByBusiness }, { data: hotelByOwner }] = await Promise.all([
    import('@/features/marketplace/services/mpSupabase').then(({ mpSupabase }) =>
      mpSupabase
        .from('marketplace_listings')
        .select('business_id')
        .in('business_id', businessIds)
        .in('status', ['active', 'reserved'])
        .eq('content_status', 'published'),
    ),
    supabase.from('hotel_listings').select('business_id').in('business_id', businessIds).eq('status', 'published'),
    supabase.from('hotel_listings').select('owner_id').in('owner_id', ownerIds).eq('status', 'published'),
  ]);

  const productMap = new Map<string, number>();
  for (const row of productCounts ?? []) {
    if (!row.business_id) continue;
    productMap.set(row.business_id, (productMap.get(row.business_id) ?? 0) + 1);
  }

  const hotelMap = new Map<string, number>();
  for (const row of hotelByBusiness ?? []) {
    if (!row.business_id) continue;
    hotelMap.set(row.business_id, (hotelMap.get(row.business_id) ?? 0) + 1);
  }
  for (const row of hotelByOwner ?? []) {
    const biz = data.find((b) => b.owner_id === row.owner_id);
    if (biz) hotelMap.set(biz.id, (hotelMap.get(biz.id) ?? 0) + 1);
  }

  return data.map((row) => {
    const mapped = mapBusinessRow(row as BusinessRow);
    return {
      id: mapped.id,
      name: mapped.name,
      category: mapped.category,
      logoUrl: mapped.logoUrl,
      coverUrl: mapped.coverUrl,
      shopTagline: mapped.shopTagline,
      shopAccent: mapped.shopAccent,
      commerceMode: mapped.commerceMode,
      isVerified: mapped.isVerified,
      district: mapped.district,
      productCount: productMap.get(mapped.id) ?? 0,
      hotelCount: hotelMap.get(mapped.id) ?? 0,
    };
  });
}

export async function fetchOwnerListingsForHub(ownerId: string, regionId: string) {
  return fetchMarketplaceListings('mine', regionId, ownerId);
}
