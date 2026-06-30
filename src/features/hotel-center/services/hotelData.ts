import { distanceKm } from '@/features/map/utils/geo';
import type {
  CreateHotelInput,
  HotelCenterStats,
  HotelFeedTab,
  HotelListing,
  HotelListingDetail,
  UpdateHotelInput,
} from '@/features/hotel-center/types';
import type { RegionId } from '@/constants/regions';
import { resolveMarketplaceRegionId } from '@/constants/regions';
import { ensureCurrentUserProfile } from '@/features/profile/services/ensureProfile';
import { notifyMapMarkerRemovedBySource } from '@/features/map/services/mapMarkerSync';
import { appendBusinessShopShowcaseItem } from '@/features/business-center/services/businessShopShowcase';
import { validateHotelListingFields } from '@/features/hotel-center/constants';
import { fetchHotelRoomTypes } from '@/features/hotel-center/services/hotelRoomTypes';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type HotelRow = {
  id: string;
  owner_id: string;
  region_id: string;
  district: string | null;
  name: string;
  description: string;
  price_per_night: number;
  list_price_per_night: number | null;
  student_discount_pct: number;
  student_discount_note: string | null;
  cover_url: string | null;
  media_urls: string[];
  video_urls: string[];
  total_rooms: number;
  occupied_rooms: number;
  amenities: string[];
  phone: string | null;
  whatsapp: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  avg_rating: number;
  review_count: number;
  view_count: number;
  is_featured: boolean;
  created_at: string;
};

type HotelDetailRow = HotelRow & {
  business_id: string | null;
  profiles:
    | { username: string | null; avatar_url: string | null; account_type: 'personal' | 'business' | null }
    | { username: string | null; avatar_url: string | null; account_type: 'personal' | 'business' | null }[]
    | null;
  businesses:
    | { id: string; name: string; logo_url: string | null }
    | { id: string; name: string; logo_url: string | null }[]
    | null;
};

function mapRow(row: HotelRow, center?: { latitude: number; longitude: number }): HotelListing {
  const listing: HotelListing = {
    id: row.id,
    ownerId: row.owner_id,
    regionId: row.region_id as RegionId,
    district: row.district,
    name: row.name,
    description: row.description,
    pricePerNight: row.price_per_night,
    listPricePerNight: row.list_price_per_night,
    studentDiscountPct: row.student_discount_pct,
    studentDiscountNote: row.student_discount_note,
    coverUrl: row.cover_url,
    mediaUrls: row.media_urls ?? [],
    videoUrls: row.video_urls ?? [],
    totalRooms: row.total_rooms ?? 1,
    occupiedRooms: row.occupied_rooms ?? 0,
    amenities: row.amenities ?? [],
    phone: row.phone,
    whatsapp: row.whatsapp,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status as HotelListing['status'],
    avgRating: Number(row.avg_rating) || 0,
    reviewCount: row.review_count,
    viewCount: row.view_count,
    isFeatured: row.is_featured,
    createdAt: row.created_at,
  };

  if (center && row.latitude != null && row.longitude != null) {
    listing.distanceKm = distanceKm(center, { latitude: row.latitude, longitude: row.longitude });
  }

  return listing;
}

function mapHotelCreateError(error: { message?: string; code?: string | null }): string {
  const raw = error.message?.toLowerCase() ?? '';
  if (raw.includes('kullanıcı bulunamadı') || raw.includes('profile not found')) {
    return 'Profil kaydınız bulunamadı. Çıkış yapıp tekrar giriş yapın.';
  }
  if (error.code === '23503') {
    if (raw.includes('owner_id') || raw.includes('profiles')) {
      return 'Profil kaydınız bulunamadı. Çıkış yapıp tekrar giriş yapın.';
    }
    if (raw.includes('region_id')) {
      return 'Geçersiz bölge seçimi. İşletme bilgilerinden bölgenizi kontrol edin.';
    }
    if (raw.includes('business_id')) {
      return 'İşletme kaydı bulunamadı. Önce işletme panelinden mağaza kurulumunu tamamlayın.';
    }
  }
  if (error.code === '42501' || raw.includes('row-level security')) {
    return 'Otel ekleme yetkiniz yok. İşletme hesabınızla giriş yaptığınızdan emin olun.';
  }
  return supabaseErrorMessage(error) ?? 'Otel kaydedilemedi.';
}

const HOTEL_SELECT = `
  id, owner_id, region_id, district, name, description,
  price_per_night, list_price_per_night, student_discount_pct, student_discount_note,
  cover_url, media_urls, video_urls, total_rooms, occupied_rooms, amenities, phone, whatsapp,
  latitude, longitude, status, avg_rating, review_count, view_count,
  is_featured, created_at
`;

export async function fetchHotelListings(
  tab: HotelFeedTab,
  regionId: string | null,
  userId: string | null,
  coords?: { lat: number; lng: number } | null,
): Promise<HotelListing[]> {
  let query = supabase.from('hotel_listings').select(HOTEL_SELECT);

  if (tab === 'mine') {
    if (!userId) return [];
    query = query.eq('owner_id', userId);
  } else {
    query = query.eq('status', 'published');
    if (regionId) query = query.eq('region_id', regionId);
  }

  if (tab === 'student_deals') {
    query = query.gt('student_discount_pct', 0).order('student_discount_pct', { ascending: false });
  } else if (tab === 'top_rated') {
    query = query.gt('review_count', 0).order('avg_rating', { ascending: false });
  } else if (tab === 'nearby') {
    query = query.not('latitude', 'is', null).not('longitude', 'is', null);
  } else {
    query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  }

  const { data, error } = await query.limit(50);
  if (error || !data) return [];

  const center = coords ? { latitude: coords.lat, longitude: coords.lng } : undefined;
  let listings = (data as unknown as HotelRow[]).map((row) => mapRow(row, center));

  if (userId && listings.length > 0) {
    const favIds = await fetchFavoriteHotelIds(userId);
    listings = listings.map((l) => ({ ...l, isFavorited: favIds.has(l.id) }));
  }

  if (coords && (tab === 'nearby' || tab === 'explore' || tab === 'student_deals')) {
    listings.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  if (tab === 'nearby' && coords) {
    listings = listings.filter((l) => l.distanceKm != null && l.distanceKm <= 25);
  }

  return listings;
}

export async function fetchHotelDetail(
  hotelId: string,
  viewerId: string | null,
): Promise<HotelListingDetail | null> {
  const { data, error } = await supabase
    .from('hotel_listings')
    .select(
      `${HOTEL_SELECT}, business_id, profiles:owner_id (username, avatar_url, account_type), businesses:business_id (id, name, logo_url)`,
    )
    .eq('id', hotelId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as HotelDetailRow;
  if (row.status !== 'published' && row.owner_id !== viewerId) return null;

  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  const listing = mapRow(row);

  let myReview = null;
  if (viewerId) {
    const { data: reviewData } = await supabase
      .from('hotel_reviews')
      .select('id, hotel_id, reviewer_id, guest_type, rating, comment, created_at')
      .eq('hotel_id', hotelId)
      .eq('reviewer_id', viewerId)
      .maybeSingle();

    if (reviewData) {
      myReview = {
        id: reviewData.id,
        hotelId: reviewData.hotel_id,
        reviewerId: reviewData.reviewer_id,
        guestType: reviewData.guest_type,
        rating: reviewData.rating,
        comment: reviewData.comment,
        createdAt: reviewData.created_at,
        reviewerUsername: null,
        reviewerAvatarUrl: null,
      };
    }
  }

  return {
    ...listing,
    businessId: row.business_id ?? business?.id ?? null,
    businessName: business?.name ?? null,
    businessLogoUrl: business?.logo_url ?? null,
    ownerUsername: profile?.username ?? null,
    ownerAvatarUrl: profile?.avatar_url ?? null,
    ownerAccountType: profile?.account_type ?? null,
    myReview,
    roomTypes: await fetchHotelRoomTypes(hotelId),
  };
}

export async function fetchHotelForEdit(hotelId: string, ownerId: string): Promise<HotelListing | null> {
  const { data, error } = await supabase
    .from('hotel_listings')
    .select(HOTEL_SELECT)
    .eq('id', hotelId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as unknown as HotelRow);
}

export async function createHotelListing(
  ownerId: string,
  regionId: string,
  input: CreateHotelInput,
): Promise<{ id: string | null; error: string | null }> {
  const validationError = validateHotelListingFields({
    name: input.name,
    description: input.description,
    pricePerNight: input.pricePerNight,
    totalRooms: input.totalRooms,
    occupiedRooms: input.occupiedRooms,
    studentDiscountPct: input.studentDiscountPct,
  });
  if (validationError) return { id: null, error: validationError };

  const { error: profileEnsureError } = await ensureCurrentUserProfile();
  if (profileEnsureError) return { id: null, error: profileEnsureError };

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !authUser?.id) {
    return { id: null, error: 'Oturumunuz doğrulanamadı. Çıkış yapıp tekrar giriş yapın.' };
  }
  if (authUser.id !== ownerId) {
    return { id: null, error: 'Oturum kullanıcısı eşleşmiyor. Çıkış yapıp tekrar giriş yapın.' };
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', ownerId)
    .maybeSingle();
  if (!profileRow) {
    return {
      id: null,
      error: 'Profil kaydınız bulunamadı. Uygulamayı kapatıp tekrar açın veya yeniden giriş yapın.',
    };
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, region_id, commerce_mode')
    .eq('owner_id', ownerId)
    .eq('registration_status', 'approved')
    .maybeSingle();

  const resolvedRegionId = resolveMarketplaceRegionId(business?.region_id ?? regionId);
  const commerceMode = business?.commerce_mode ?? null;
  const businessId =
    !businessError &&
    business &&
    (commerceMode === 'hotel' || commerceMode === 'both')
      ? business.id
      : null;

  const { data, error } = await supabase
    .from('hotel_listings')
    .insert({
      owner_id: ownerId,
      business_id: businessId,
      region_id: resolvedRegionId,
      district: input.district || null,
      name: input.name.trim(),
      description: input.description.trim(),
      price_per_night: input.pricePerNight,
      list_price_per_night: input.listPricePerNight ?? null,
      student_discount_pct: input.studentDiscountPct,
      student_discount_note: input.studentDiscountNote?.trim() || null,
      amenities: input.amenities,
      phone: input.phone?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      media_urls: input.mediaUrls,
      video_urls: input.videoUrls ?? [],
      total_rooms: input.totalRooms ?? 1,
      occupied_rooms: input.occupiedRooms ?? 0,
      status: input.status,
    })
    .select('id')
    .single();

  if (error) return { id: null, error: mapHotelCreateError(error) };
  if (!data?.id) return { id: null, error: 'Otel oluşturulamadı.' };

  if (businessId && input.status === 'published') {
    const { error: showcaseError } = await appendBusinessShopShowcaseItem(
      businessId,
      'hotel',
      data.id,
    );
    if (showcaseError) {
      return {
        id: data.id,
        error: `Otel oluşturuldu ancak mağaza vitrinine eklenemedi: ${showcaseError}`,
      };
    }
  }

  if (input.latitude != null && input.longitude != null) {
    await supabase.rpc('set_hotel_listing_location', {
      p_hotel_id: data.id,
      p_lng: input.longitude,
      p_lat: input.latitude,
    });
  }

  return { id: data.id, error: null };
}

export async function updateHotelListing(
  hotelId: string,
  ownerId: string,
  input: UpdateHotelInput,
): Promise<{ error: string | null }> {
  if (
    input.name != null ||
    input.description != null ||
    input.pricePerNight != null ||
    input.totalRooms != null ||
    input.occupiedRooms != null ||
    input.studentDiscountPct != null
  ) {
    const { data: current } = await supabase
      .from('hotel_listings')
      .select('name, description, price_per_night, total_rooms, occupied_rooms, student_discount_pct')
      .eq('id', hotelId)
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (current) {
      const validationError = validateHotelListingFields({
        name: input.name ?? current.name,
        description: input.description ?? current.description,
        pricePerNight: input.pricePerNight ?? current.price_per_night,
        totalRooms: input.totalRooms ?? current.total_rooms,
        occupiedRooms: input.occupiedRooms ?? current.occupied_rooms,
        studentDiscountPct: input.studentDiscountPct ?? current.student_discount_pct,
      });
      if (validationError) return { error: validationError };
    }
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name != null) patch.name = input.name.trim();
  if (input.description != null) patch.description = input.description.trim();
  if (input.district != null) patch.district = input.district || null;
  if (input.pricePerNight != null) patch.price_per_night = input.pricePerNight;
  if (input.listPricePerNight !== undefined) patch.list_price_per_night = input.listPricePerNight;
  if (input.studentDiscountPct != null) patch.student_discount_pct = input.studentDiscountPct;
  if (input.studentDiscountNote !== undefined) patch.student_discount_note = input.studentDiscountNote?.trim() || null;
  if (input.amenities != null) patch.amenities = input.amenities;
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
  if (input.whatsapp !== undefined) patch.whatsapp = input.whatsapp?.trim() || null;
  if (input.mediaUrls != null) patch.media_urls = input.mediaUrls;
  if (input.videoUrls != null) patch.video_urls = input.videoUrls;
  if (input.totalRooms != null) patch.total_rooms = input.totalRooms;
  if (input.occupiedRooms != null) patch.occupied_rooms = input.occupiedRooms;
  if (input.status != null) patch.status = input.status;

  const { error } = await supabase
    .from('hotel_listings')
    .update(patch)
    .eq('id', hotelId)
    .eq('owner_id', ownerId);

  if (error) return { error: supabaseErrorMessage(error) };

  if (input.latitude != null && input.longitude != null) {
    await supabase.rpc('set_hotel_listing_location', {
      p_hotel_id: hotelId,
      p_lng: input.longitude,
      p_lat: input.latitude,
    });
  }

  return { error: null };
}

export async function removeHotelListing(hotelId: string, ownerId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('hotel_listings')
    .delete()
    .eq('id', hotelId)
    .eq('owner_id', ownerId);

  if (!error) notifyMapMarkerRemovedBySource('hotels', hotelId);
  return { error: supabaseErrorMessage(error) };
}

export async function incrementHotelView(hotelId: string): Promise<void> {
  await supabase.rpc('increment_hotel_view_count', { p_hotel_id: hotelId });
}

export async function fetchHotelCenterStats(regionId: string | null): Promise<HotelCenterStats> {
  const { data, error } = await supabase.rpc('fetch_hotel_center_stats', {
    p_region_id: regionId,
  });

  if (error || !data) {
    return { activeHotels: 0, activeDiscounts: 0, reviews24h: 0 };
  }

  const stats = data as { active_hotels: number; active_discounts: number; reviews_24h: number };
  return {
    activeHotels: stats.active_hotels ?? 0,
    activeDiscounts: stats.active_discounts ?? 0,
    reviews24h: stats.reviews_24h ?? 0,
  };
}

export async function fetchFavoriteHotelIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('hotel_favorites').select('hotel_id').eq('user_id', userId);
  return new Set((data ?? []).map((r) => r.hotel_id as string));
}

export async function toggleHotelFavorite(
  userId: string,
  hotelId: string,
  isFavorited: boolean,
): Promise<{ error: string | null }> {
  if (isFavorited) {
    const { error } = await supabase.from('hotel_favorites').delete().eq('user_id', userId).eq('hotel_id', hotelId);
    return { error: supabaseErrorMessage(error) };
  }
  const { error } = await supabase.from('hotel_favorites').insert({ user_id: userId, hotel_id: hotelId });
  return { error: supabaseErrorMessage(error) };
}

export async function fetchTrendHotels(
  regionIds: string[],
  offset: number,
  limit: number,
): Promise<HotelListing[]> {
  const { data, error } = await supabase
    .from('hotel_listings')
    .select(HOTEL_SELECT)
    .eq('status', 'published')
    .in('region_id', regionIds)
    .order('is_featured', { ascending: false })
    .order('avg_rating', { ascending: false })
    .order('review_count', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return [];
  return (data as unknown as HotelRow[]).map((row) => mapRow(row));
}
