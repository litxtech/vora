import { excludeCommunityEvents, excludeCommunityPosts } from '@/features/communities/services/publicScope';
import {
  EVENT_MAP_CATEGORY_COLORS,
  eventMapStartsCutoffIso,
  isEventActiveOnMap,
} from '@/features/events/constants';
import { LOST_CATEGORY_COLORS } from '@/features/lost-found/constants';
import { categoryColor, formatMarketplacePrice } from '@/features/marketplace/constants';
import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import { emptyLayerCounts, JOB_TYPE_LABELS, LAYER_BY_ID, MAP_LAYER_FETCH_LIMIT, MAP_SMALL_LAYER_FETCH_LIMIT } from '@/features/map/constants';
import { HOTEL_ACCENT, formatHotelPrice } from '@/features/hotel-center/constants';
import { voraNeedCategoryColor, voraNeedCategoryLabel } from '@/features/vora-needs/constants';
import { serviceCategoryColor, serviceCategoryLabel } from '@/features/vora-hizmetler/constants';
import { TOURISM_CATEGORIES } from '@/features/tourism/constants';
import { TRAFFIC_TYPES } from '@/features/traffic/constants';
import type { MapCoordinate, MapLayerId, MapMarker } from '@/features/map/types';
import { filterByRadius } from '@/features/map/utils/geo';
import { supabase } from '@/lib/supabase/client';

type CoordsRow = {
  latitude: number | null;
  longitude: number | null;
};

type BusinessCoords = { latitude: number | null; longitude: number | null; name?: string | null };

function withCoords<T extends CoordsRow>(rows: T[]): (T & { latitude: number; longitude: number })[] {
  return rows.filter(
    (row): row is T & { latitude: number; longitude: number } =>
      row.latitude != null && row.longitude != null,
  );
}

function resolveCoords(
  row: CoordsRow & { businesses?: BusinessCoords | BusinessCoords[] | null },
): { latitude: number; longitude: number } | null {
  if (row.latitude != null && row.longitude != null) {
    return { latitude: row.latitude, longitude: row.longitude };
  }

  const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  if (business?.latitude != null && business?.longitude != null) {
    return { latitude: business.latitude, longitude: business.longitude };
  }

  return null;
}

export async function fetchMapMarkers(): Promise<MapMarker[]> {
  const nowIso = new Date().toISOString();
  const eventStartsCutoff = eventMapStartsCutoffIso();

  const [incidents, posts, businesses, events, lostItems, marketplaceListings, voraNeeds, serviceRequests, serviceProviders, jobs, staff, seekers, traffic, tourism, hotels] =
    await Promise.all([
      supabase
        .from('incident_reports')
        .select('id, title, description, severity, latitude, longitude, created_at')
        .in('status', ['open', 'verified'])
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(MAP_LAYER_FETCH_LIMIT),
      excludeCommunityPosts(
        supabase
        .from('posts')
        .select(
          `id, title, content, latitude, longitude, created_at, media_urls,
           profiles!posts_author_id_fkey (username, full_name, avatar_url)`,
        )
        .eq('status', 'published')
      )
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(MAP_LAYER_FETCH_LIMIT),
      supabase
        .from('businesses')
        .select('id, name, category, description, address, is_verified, logo_url, latitude, longitude, created_at')
        .eq('registration_status', 'approved')
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(MAP_LAYER_FETCH_LIMIT),
      excludeCommunityEvents(
        supabase
        .from('events')
        .select('id, title, description, location_name, starts_at, ends_at, cover_url, latitude, longitude, created_at, map_category, is_featured, is_sponsored')
        .eq('status', 'published')
        .or(`ends_at.gt.${nowIso},and(ends_at.is.null,starts_at.gt.${eventStartsCutoff})`)
      )
        .not('latitude', 'is', null)
        .order('starts_at', { ascending: true })
        .limit(MAP_LAYER_FETCH_LIMIT),
      supabase
        .from('lost_items')
        .select('id, title, description, item_type, category, is_urgent, latitude, longitude, created_at')
        .eq('status', 'open')
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(MAP_LAYER_FETCH_LIMIT),
      mpSupabase
        .from('marketplace_listings')
        .select('id, title, description, category, listing_type, price, currency, district, cover_url, media_urls, latitude, longitude, created_at')
        .eq('status', 'active')
        .eq('content_status', 'published')
        .not('latitude', 'is', null)
        .order('favorite_count', { ascending: false })
        .limit(MAP_LAYER_FETCH_LIMIT),
      supabase
        .from('vora_needs')
        .select('id, title, description, category, urgency, visibility, city, image_url, latitude, longitude, created_at')
        .eq('status', 'active')
        .eq('content_status', 'published')
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(MAP_LAYER_FETCH_LIMIT),
      supabase
        .from('vora_service_requests')
        .select('id, title, description, category, urgency, city, is_emergency, latitude, longitude, created_at')
        .eq('status', 'pending_offers')
        .not('latitude', 'is', null)
        .order('is_emergency', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(MAP_LAYER_FETCH_LIMIT),
      supabase
        .from('vora_service_providers')
        .select('id, display_name, profession, categories, avatar_url, is_premium, is_sponsored, latitude, longitude, created_at')
        .eq('is_active', true)
        .not('latitude', 'is', null)
        .order('is_sponsored', { ascending: false })
        .order('is_premium', { ascending: false })
        .order('rating', { ascending: false })
        .limit(MAP_LAYER_FETCH_LIMIT),
      supabase
        .from('job_listings')
        .select(
          `id, title, description, job_type, salary_range, housing_provided, location_label,
           latitude, longitude, created_at, business_id,
           businesses (name, latitude, longitude)`,
        )
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(MAP_LAYER_FETCH_LIMIT),
      supabase
        .from('staff_requests')
        .select(
          `id, title, description, positions, salary_range, location_label,
           latitude, longitude, created_at, business_id,
           businesses (name, latitude, longitude)`,
        )
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(MAP_LAYER_FETCH_LIMIT),
      supabase
        .from('job_seekers')
        .select('id, title, occupation, experience_years, description, district, latitude, longitude, created_at')
        .eq('status', 'published')
        .eq('is_visible_on_map', true)
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(MAP_LAYER_FETCH_LIMIT),
      supabase
        .from('traffic_reports')
        .select('id, report_type, title, description, district, confirm_count, expires_at, latitude, longitude, created_at')
        .eq('is_active', true)
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(MAP_SMALL_LAYER_FETCH_LIMIT),
      supabase
        .from('tourism_places')
        .select('id, category, name, description, address, rating, is_featured, latitude, longitude, created_at')
        .not('latitude', 'is', null)
        .order('is_featured', { ascending: false })
        .limit(MAP_SMALL_LAYER_FETCH_LIMIT),
      supabase
        .from('hotel_listings')
        .select(
          `id, name, description, price_per_night, list_price_per_night, student_discount_pct, student_discount_note,
           cover_url, media_urls, district, avg_rating, review_count, latitude, longitude, created_at`,
        )
        .eq('status', 'published')
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(MAP_LAYER_FETCH_LIMIT),
    ]);

  const markers: MapMarker[] = [];

  for (const row of withCoords(incidents.data ?? [])) {
    markers.push({
      id: `incident-${row.id}`,
      sourceId: row.id,
      layer: 'incidents',
      title: row.title,
      subtitle: String(row.severity),
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      meta: { severity: row.severity },
    });
  }

  for (const row of withCoords(posts.data ?? [])) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const authorLabel = profile?.username
      ? `@${profile.username}`
      : (profile?.full_name ?? 'Paylaşım');
    markers.push({
      id: `post-${row.id}`,
      sourceId: row.id,
      layer: 'posts',
      title: row.title ?? 'Paylaşım',
      subtitle: authorLabel,
      description: row.content,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      avatarUrl: profile?.avatar_url ?? null,
      mediaUrls: (row as { media_urls?: string[] }).media_urls?.length
        ? (row as { media_urls: string[] }).media_urls
        : undefined,
    });
  }

  for (const row of withCoords(businesses.data ?? [])) {
    markers.push({
      id: `business-${row.id}`,
      sourceId: row.id,
      layer: 'businesses',
      title: row.name,
      subtitle: row.category,
      description: row.description ?? row.address ?? undefined,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      avatarUrl: (row as { logo_url?: string | null }).logo_url ?? null,
      meta: { verified: row.is_verified },
    });
  }

  for (const row of withCoords(events.data ?? []).filter((eventRow) =>
    isEventActiveOnMap(eventRow.starts_at, (eventRow as { ends_at?: string | null }).ends_at),
  )) {
    const mapCategory = (row as { map_category?: string }).map_category ?? 'entertainment';
    const mapColor = EVENT_MAP_CATEGORY_COLORS[mapCategory as keyof typeof EVENT_MAP_CATEGORY_COLORS] ?? '#9C27B0';
    markers.push({
      id: `event-${row.id}`,
      sourceId: row.id,
      layer: 'events',
      title: row.title,
      subtitle: row.location_name ?? 'Etkinlik',
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      avatarUrl: (row as { cover_url?: string | null }).cover_url ?? null,
      meta: {
        startsAt: row.starts_at,
        mapCategory,
        mapColor,
        featured: (row as { is_featured?: boolean }).is_featured,
        sponsored: (row as { is_sponsored?: boolean }).is_sponsored,
      },
    });
  }

  for (const row of withCoords(lostItems.data ?? [])) {
    const category = (row as { category?: string }).category ?? 'other';
    const mapColor = LOST_CATEGORY_COLORS[category as keyof typeof LOST_CATEGORY_COLORS] ?? '#AB47BC';
    markers.push({
      id: `lost-${row.id}`,
      sourceId: row.id,
      layer: 'lost_found',
      title: row.title,
      subtitle: row.item_type === 'lost' ? 'Kayıp' : 'Buluntu',
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      meta: {
        itemType: row.item_type,
        category,
        mapColor,
        urgent: (row as { is_urgent?: boolean }).is_urgent,
      },
    });
  }

  for (const row of withCoords(marketplaceListings.data ?? [])) {
    const listingType = (row as { listing_type?: string }).listing_type ?? 'sale';
    const category = (row as { category?: string }).category ?? 'other';
    const mapColor = categoryColor(category);
    const coverUrl = (row as { cover_url?: string | null }).cover_url ?? null;
    const mediaUrls = (row as { media_urls?: string[] }).media_urls ?? [];
    markers.push({
      id: `marketplace-${row.id}`,
      sourceId: row.id,
      layer: 'marketplace',
      title: row.title,
      subtitle: formatMarketplacePrice(
        (row as { price?: number | null }).price ?? null,
        listingType as never,
        (row as { currency?: string }).currency ?? 'try',
      ),
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      avatarUrl: coverUrl ?? mediaUrls[0] ?? null,
      mediaUrls: mediaUrls.length ? mediaUrls : coverUrl ? [coverUrl] : undefined,
      meta: {
        category,
        mapColor,
        listingType,
        district: (row as { district?: string }).district,
      },
    });
  }

  for (const row of withCoords(voraNeeds.data ?? [])) {
    const category = (row as { category?: string }).category ?? 'help';
    const mapColor = voraNeedCategoryColor(category);
    markers.push({
      id: `vora-need-${row.id}`,
      sourceId: row.id,
      layer: 'vora_needs',
      title: row.title,
      subtitle: voraNeedCategoryLabel(category),
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      avatarUrl: (row as { image_url?: string | null }).image_url ?? null,
      meta: {
        category,
        mapColor,
        urgent: (row as { urgency?: string }).urgency === 'urgent',
        visibility: (row as { visibility?: string }).visibility,
        city: (row as { city?: string }).city,
      },
    });
  }

  for (const row of withCoords(serviceRequests.data ?? [])) {
    const category = (row as { category?: string }).category ?? 'diger';
    const mapColor = serviceCategoryColor(category);
    markers.push({
      id: `vora-hizmet-req-${row.id}`,
      sourceId: row.id,
      layer: 'vora_hizmetler',
      title: row.title,
      subtitle: serviceCategoryLabel(category),
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      meta: {
        kind: 'request',
        category,
        mapColor,
        urgent: (row as { is_emergency?: boolean }).is_emergency === true,
        city: (row as { city?: string }).city,
      },
    });
  }

  for (const row of withCoords(serviceProviders.data ?? [])) {
    const categories = (row as { categories?: string[] }).categories ?? [];
    const category = categories[0] ?? 'diger';
    const mapColor = serviceCategoryColor(category);
    markers.push({
      id: `vora-hizmet-pro-${row.id}`,
      sourceId: row.id,
      layer: 'vora_hizmetler',
      title: (row as { display_name: string }).display_name,
      subtitle: (row as { profession: string }).profession,
      description: serviceCategoryLabel(category),
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      avatarUrl: (row as { avatar_url?: string | null }).avatar_url ?? null,
      meta: {
        kind: 'provider',
        category,
        mapColor,
        premium: (row as { is_premium?: boolean }).is_premium === true,
        sponsored: (row as { is_sponsored?: boolean }).is_sponsored === true,
      },
    });
  }

  type JobMapRow = {
    id: string;
    title: string;
    description: string;
    job_type: string;
    salary_range: string | null;
    housing_provided: boolean;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    businesses: BusinessCoords | BusinessCoords[] | null;
  };

  type StaffMapRow = {
    id: string;
    title: string;
    description: string;
    positions: string[];
    salary_range: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    businesses: BusinessCoords | BusinessCoords[] | null;
  };

  for (const row of (jobs.data ?? []) as unknown as JobMapRow[]) {
    const coords = resolveCoords(row);
    if (!coords) continue;
    const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
    markers.push({
      id: `job-${row.id}`,
      sourceId: row.id,
      layer: 'jobs',
      title: row.title,
      subtitle: [business?.name, row.salary_range].filter(Boolean).join(' · ') || 'İş ilanı',
      description: row.description,
      latitude: coords.latitude,
      longitude: coords.longitude,
      createdAt: row.created_at,
      meta: {
        jobType: row.job_type,
        salaryRange: row.salary_range,
        housingProvided: row.housing_provided,
      },
    });
  }

  for (const row of (staff.data ?? []) as unknown as StaffMapRow[]) {
    const coords = resolveCoords(row);
    if (!coords) continue;
    markers.push({
      id: `staff-${row.id}`,
      sourceId: row.id,
      layer: 'staff',
      title: row.title,
      subtitle: `${row.positions?.length ?? 0} pozisyon`,
      description: row.description,
      latitude: coords.latitude,
      longitude: coords.longitude,
      createdAt: row.created_at,
      meta: {
        positions: row.positions?.join(', '),
        salaryRange: row.salary_range,
      },
    });
  }

  for (const row of withCoords(seekers.data ?? [])) {
    markers.push({
      id: `seeker-${row.id}`,
      sourceId: row.id,
      layer: 'job_seekers',
      title: row.title,
      subtitle: [row.occupation, row.district].filter(Boolean).join(' · '),
      description: row.description ?? undefined,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      meta: { experienceYears: row.experience_years },
    });
  }

  type TrafficMapRow = {
    id: string;
    report_type: keyof typeof TRAFFIC_TYPES;
    title: string;
    description: string | null;
    district: string | null;
    confirm_count: number;
    expires_at: string;
    latitude: number;
    longitude: number;
    created_at: string;
  };

  for (const row of withCoords((traffic.data ?? []) as TrafficMapRow[])) {
    const typeInfo = TRAFFIC_TYPES[row.report_type];
    markers.push({
      id: `traffic-${row.id}`,
      sourceId: row.id,
      layer: 'traffic',
      title: row.title,
      subtitle: [typeInfo?.label, row.district].filter(Boolean).join(' · ') || 'Trafik',
      description: row.description ?? undefined,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      meta: {
        reportType: row.report_type,
        mapColor: typeInfo?.color,
        confirmCount: row.confirm_count,
        expiresAt: row.expires_at,
      },
    });
  }

  type TourismMapRow = {
    id: string;
    category: keyof typeof TOURISM_CATEGORIES;
    name: string;
    description: string | null;
    address: string | null;
    rating: number | null;
    is_featured: boolean;
    latitude: number;
    longitude: number;
    created_at: string;
  };

  for (const row of withCoords((tourism.data ?? []) as TourismMapRow[])) {
    const categoryInfo = TOURISM_CATEGORIES[row.category];
    markers.push({
      id: `tourism-${row.id}`,
      sourceId: row.id,
      layer: 'tourism',
      title: row.name,
      subtitle: [categoryInfo?.label, row.rating != null ? `${row.rating}★` : null].filter(Boolean).join(' · '),
      description: row.description ?? row.address ?? undefined,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      meta: {
        category: row.category,
        mapColor: categoryInfo?.color,
        rating: row.rating,
        featured: row.is_featured,
      },
    });
  }

  type HotelMapRow = {
    id: string;
    name: string;
    description: string;
    price_per_night: number;
    list_price_per_night: number | null;
    student_discount_pct: number;
    student_discount_note: string | null;
    cover_url: string | null;
    media_urls: string[];
    district: string | null;
    avg_rating: number;
    review_count: number;
    latitude: number;
    longitude: number;
    created_at: string;
  };

  for (const row of withCoords((hotels.data ?? []) as HotelMapRow[])) {
    const priceLabel = `Vora özel ${formatHotelPrice(row.price_per_night)}/gece`;
    const ratingLabel = row.review_count > 0 ? `⭐ ${Number(row.avg_rating).toFixed(1)}` : null;
    const discountLabel = row.student_discount_pct > 0 ? `🎓 -%${row.student_discount_pct}` : null;
    markers.push({
      id: `hotel-${row.id}`,
      sourceId: row.id,
      layer: 'hotels',
      title: row.name,
      subtitle: [ratingLabel, discountLabel, priceLabel].filter(Boolean).join(' · '),
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      mediaUrls: row.media_urls?.length ? row.media_urls : row.cover_url ? [row.cover_url] : [],
      avatarUrl: row.cover_url ?? row.media_urls?.[0] ?? null,
      meta: {
        mapColor: HOTEL_ACCENT,
        pricePerNight: row.price_per_night,
        studentDiscountPct: row.student_discount_pct,
        avgRating: Number(row.avg_rating),
        reviewCount: row.review_count,
        district: row.district,
      },
    });
  }

  return markers.filter((marker) => !marker.isDemo && !marker.sourceId.startsWith('demo-'));
}

export function filterMapMarkers(
  markers: MapMarker[],
  enabledLayers: MapLayerId[],
  searchQuery: string,
  nearby?: { center: MapCoordinate; radiusKm?: number } | null,
): MapMarker[] {
  const query = searchQuery.trim().toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);
  let scoped = markers;

  if (nearby) {
    scoped = filterByRadius(markers, nearby.center, nearby.radiusKm ?? 15);
  }

  return scoped.filter((marker) => {
    if (!enabledLayers.includes(marker.layer)) return false;
    if (!tokens.length) return true;

    const layerLabel = LAYER_BY_ID[marker.layer]?.label ?? '';
    const haystack = [marker.title, marker.subtitle, marker.description, layerLabel]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return tokens.every((token) => haystack.includes(token));
  });
}

export function countByLayer(markers: MapMarker[]): Record<MapLayerId, number> {
  return markers.reduce((acc, marker) => {
    acc[marker.layer] = (acc[marker.layer] ?? 0) + 1;
    return acc;
  }, emptyLayerCounts());
}

export function jobTypeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return JOB_TYPE_LABELS[value] ?? value;
}
