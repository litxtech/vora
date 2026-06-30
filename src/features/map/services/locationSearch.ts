import { DISTRICTS } from '@/constants/districts';
import { REGIONS, regionNameById, type RegionId } from '@/constants/regions';
import {
  LOCATION_SEARCH_BUSINESS_LIMIT,
  LOCATION_SEARCH_MAX_RESULTS,
  LOCATION_SEARCH_MIN_CHARS,
  LOCATION_SEARCH_PER_SOURCE_LIMIT,
  regionMapCenter,
} from '@/features/map/constants';
import { searchExternalPlaces } from '@/features/map/services/searchExternalPlaces';
import type { MapCoordinate, MapLocationSource, MapLocationSuggestion } from '@/features/map/types';
import { isValidPostCoordinate } from '@/features/map/utils/geoBounds';
import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import { CATEGORY_DEFS } from '@/features/marketplace/constants';
import { TOURISM_CATEGORIES } from '@/features/tourism/constants';
import { excludeCommunityPosts } from '@/features/communities/services/publicScope';
import { supabase } from '@/lib/supabase/client';

const KARADENIZ_REGION_IDS = REGIONS.map((r) => r.id);

const SOURCE_LABELS: Record<MapLocationSource, string> = {
  business: 'Esnaf / İşletme',
  event: 'Etkinlik',
  tourism: 'Turizm',
  marketplace: 'Pazar',
  district: 'İlçe',
  post_label: 'Popüler',
  place: 'Harita',
  gps: 'Konumum',
};

const SOURCE_RANK: Record<MapLocationSource, number> = {
  business: 0,
  tourism: 1,
  marketplace: 2,
  event: 3,
  post_label: 4,
  place: 5,
  district: 6,
  gps: 7,
};

function sanitizeQuery(query: string): string {
  return query.trim().replace(/[%_]/g, '');
}

function ilikePattern(query: string): string {
  return `%${sanitizeQuery(query)}%`;
}

function ilikeOrFilter(columns: string[], pattern: string): string {
  return columns.map((col) => `${col}.ilike.${pattern}`).join(',');
}

function enumEqOrFilters(
  query: string,
  defs: Record<string, { label: string }>,
  column: string,
): string[] {
  const normalized = sanitizeQuery(query).toLocaleLowerCase('tr-TR');
  if (!normalized) return [];

  return Object.entries(defs)
    .filter(([, def]) => {
      const label = def.label.toLocaleLowerCase('tr-TR');
      return label.includes(normalized) || normalized.includes(label);
    })
    .map(([id]) => `${column}.eq.${id}`);
}

function searchOrFilter(textColumns: string[], pattern: string, enumEqParts: string[] = []): string {
  return [...textColumns.map((col) => `${col}.ilike.${pattern}`), ...enumEqParts].join(',');
}

function resolveStoredCoords(
  latitude: number | null,
  longitude: number | null,
  regionId: RegionId,
): { latitude: number | null; longitude: number | null } {
  if (latitude == null || longitude == null) {
    return { latitude: null, longitude: null };
  }
  if (!isValidPostCoordinate(latitude, longitude, regionId)) {
    return { latitude: null, longitude: null };
  }
  return { latitude, longitude };
}

function pushSuggestion(
  results: MapLocationSuggestion[],
  seen: Set<string>,
  suggestion: MapLocationSuggestion,
) {
  const key = `${suggestion.source}|${suggestion.label.toLowerCase()}|${suggestion.latitude ?? ''}|${suggestion.longitude ?? ''}`;
  if (seen.has(key)) return;
  seen.add(key);
  results.push(suggestion);
}

function businessGeocodeHint(
  row: { address?: string | null; district?: string | null },
  regionName: string,
): string | undefined {
  const hint = [row.address, row.district, regionName].filter(Boolean).join(', ');
  return hint || undefined;
}

export function locationSourceLabel(source: MapLocationSource): string {
  return SOURCE_LABELS[source];
}

export async function searchMapLocations(
  query: string,
  regionId: RegionId,
  options?: { proximity?: MapCoordinate; sessionToken?: string },
): Promise<MapLocationSuggestion[]> {
  const q = sanitizeQuery(query);
  if (q.length < LOCATION_SEARCH_MIN_CHARS) return [];

  const pattern = ilikePattern(query);
  const orFilter = ilikeOrFilter;
  const results: MapLocationSuggestion[] = [];
  const seen = new Set<string>();
  const regionName = regionNameById(regionId);
  const proximity = options?.proximity ?? regionMapCenter(regionId);

  const [businesses, events, tourism, marketplace, postLabels, external] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, name, category, description, address, district, region_id, latitude, longitude')
      .in('region_id', KARADENIZ_REGION_IDS)
      .eq('registration_status', 'approved')
      .or(orFilter(['name', 'address', 'category', 'district', 'description'], pattern))
      .order('is_verified', { ascending: false })
      .order('name')
      .limit(LOCATION_SEARCH_BUSINESS_LIMIT),
    supabase
      .from('events')
      .select('id, title, location_name, region_id, latitude, longitude')
      .in('region_id', KARADENIZ_REGION_IDS)
      .eq('status', 'published')
      .or(orFilter(['title', 'location_name', 'description'], pattern))
      .order('starts_at', { ascending: true })
      .limit(LOCATION_SEARCH_PER_SOURCE_LIMIT),
    supabase
      .from('tourism_places')
      .select('id, name, category, address, region_id, latitude, longitude')
      .in('region_id', KARADENIZ_REGION_IDS)
      .or(
        searchOrFilter(
          ['name', 'address', 'description'],
          pattern,
          enumEqOrFilters(q, TOURISM_CATEGORIES, 'category'),
        ),
      )
      .order('is_featured', { ascending: false })
      .limit(LOCATION_SEARCH_PER_SOURCE_LIMIT),
    mpSupabase
      .from('marketplace_listings')
      .select('id, title, category, district, region_id, latitude, longitude')
      .in('region_id', KARADENIZ_REGION_IDS)
      .eq('content_status', 'published')
      .or(
        searchOrFilter(
          ['title', 'district', 'description'],
          pattern,
          enumEqOrFilters(q, CATEGORY_DEFS, 'category'),
        ),
      )
      .order('created_at', { ascending: false })
      .limit(LOCATION_SEARCH_PER_SOURCE_LIMIT),
    excludeCommunityPosts(
      supabase
      .from('posts')
      .select('location_label, latitude, longitude, region_id')
    )
      .in('region_id', KARADENIZ_REGION_IDS)
      .eq('status', 'published')
      .not('location_label', 'is', null)
      .ilike('location_label', pattern)
      .order('created_at', { ascending: false })
      .limit(LOCATION_SEARCH_PER_SOURCE_LIMIT * 2),
    searchExternalPlaces(q, {
      proximity,
      regionId,
      regionName,
      sessionToken: options?.sessionToken,
    }),
  ]);

  type BusinessRow = {
    id: string;
    name: string;
    category: string;
    description: string | null;
    address: string | null;
    district: string | null;
    region_id: RegionId;
    latitude: number | null;
    longitude: number | null;
  };

  for (const row of (businesses.data ?? []) as BusinessRow[]) {
    const rowRegionName = regionNameById(row.region_id) ?? row.region_id;
    const geocodeHint = businessGeocodeHint(row, rowRegionName);
    const coords = resolveStoredCoords(row.latitude, row.longitude, row.region_id);

    pushSuggestion(results, seen, {
      id: `business-${row.id}`,
      label: row.name,
      subtitle: [SOURCE_LABELS.business, row.category, row.district, row.address]
        .filter(Boolean)
        .join(' · '),
      latitude: coords.latitude,
      longitude: coords.longitude,
      source: 'business',
      regionId: row.region_id,
      geocodeHint,
    });
  }

  type TourismRow = {
    id: string;
    name: string;
    category: string;
    address: string | null;
    region_id: RegionId;
    latitude: number | null;
    longitude: number | null;
  };

  for (const row of (tourism.data ?? []) as TourismRow[]) {
    const rowRegionName = regionNameById(row.region_id) ?? row.region_id;
    const coords = resolveStoredCoords(row.latitude, row.longitude, row.region_id);

    pushSuggestion(results, seen, {
      id: `tourism-${row.id}`,
      label: row.name,
      subtitle: [SOURCE_LABELS.tourism, row.category, row.address].filter(Boolean).join(' · '),
      latitude: coords.latitude,
      longitude: coords.longitude,
      source: 'tourism',
      regionId: row.region_id,
      geocodeHint: businessGeocodeHint(row, rowRegionName),
    });
  }

  type MarketplaceRow = {
    id: string;
    title: string;
    category: string;
    district: string;
    region_id: RegionId;
    latitude: number | null;
    longitude: number | null;
  };

  for (const row of (marketplace.data ?? []) as MarketplaceRow[]) {
    const coords = resolveStoredCoords(row.latitude, row.longitude, row.region_id);
    pushSuggestion(results, seen, {
      id: `marketplace-${row.id}`,
      label: row.title,
      subtitle: [SOURCE_LABELS.marketplace, row.category, row.district].filter(Boolean).join(' · '),
      latitude: coords.latitude,
      longitude: coords.longitude,
      source: 'marketplace',
      regionId: row.region_id,
    });
  }

  type EventRow = {
    id: string;
    title: string;
    location_name: string | null;
    region_id: RegionId;
    latitude: number | null;
    longitude: number | null;
  };

  for (const row of (events.data ?? []) as EventRow[]) {
    const coords = resolveStoredCoords(row.latitude, row.longitude, row.region_id);
    pushSuggestion(results, seen, {
      id: `event-${row.id}`,
      label: row.location_name ?? row.title,
      subtitle: [SOURCE_LABELS.event, row.title, regionNameById(row.region_id)].filter(Boolean).join(' · '),
      latitude: coords.latitude,
      longitude: coords.longitude,
      source: 'event',
      regionId: row.region_id,
    });
  }

  const labelCounts = new Map<string, { count: number; latitude: number | null; longitude: number | null; regionId?: RegionId }>();
  for (const row of postLabels.data ?? []) {
    const label = row.location_label?.trim();
    if (!label) continue;
    const prev = labelCounts.get(label);
    const count = (prev?.count ?? 0) + 1;
    const latitude = prev?.latitude ?? row.latitude ?? null;
    const longitude = prev?.longitude ?? row.longitude ?? null;
    labelCounts.set(label, { count, latitude, longitude, regionId: row.region_id as RegionId });
  }

  for (const [label, meta] of [...labelCounts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, LOCATION_SEARCH_PER_SOURCE_LIMIT)) {
    const coords = meta.regionId
      ? resolveStoredCoords(meta.latitude, meta.longitude, meta.regionId)
      : { latitude: meta.latitude, longitude: meta.longitude };

    pushSuggestion(results, seen, {
      id: `label-${label}`,
      label,
      subtitle: SOURCE_LABELS.post_label,
      latitude: coords.latitude,
      longitude: coords.longitude,
      source: 'post_label',
      regionId: meta.regionId,
    });
  }

  for (const suggestion of external) {
    pushSuggestion(results, seen, suggestion);
  }

  const qLower = q.toLowerCase();
  for (const district of DISTRICTS[regionId] ?? []) {
    if (!district.toLowerCase().includes(qLower)) continue;
    pushSuggestion(results, seen, {
      id: `district-${district}`,
      label: district,
      subtitle: `${SOURCE_LABELS.district} · ${regionName ?? regionId}`,
      latitude: null,
      longitude: null,
      source: 'district',
      regionId,
      geocodeHint: `${district}, ${regionName ?? regionId}`,
    });
  }

  const ranked = results.sort((a, b) => {
    const aExact = a.label.toLowerCase() === qLower ? 0 : 1;
    const bExact = b.label.toLowerCase() === qLower ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;

    const aStarts = a.label.toLowerCase().startsWith(qLower) ? 0 : 1;
    const bStarts = b.label.toLowerCase().startsWith(qLower) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;

    const aRegion = a.regionId === regionId ? 0 : 1;
    const bRegion = b.regionId === regionId ? 0 : 1;
    if (aRegion !== bRegion) return aRegion - bRegion;

    const aRank = SOURCE_RANK[a.source];
    const bRank = SOURCE_RANK[b.source];
    if (aRank !== bRank) return aRank - bRank;

    const aHasCoords = a.latitude != null ? 0 : 1;
    const bHasCoords = b.latitude != null ? 0 : 1;
    if (aHasCoords !== bHasCoords) return aHasCoords - bHasCoords;

    return a.label.localeCompare(b.label, 'tr');
  });

  return ranked.slice(0, LOCATION_SEARCH_MAX_RESULTS);
}
