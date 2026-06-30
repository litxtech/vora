import * as Location from 'expo-location';
import { env } from '@/config/env';
import { regionMapBbox, regionMapCenter } from '@/features/map/constants';
import type { MapCoordinate } from '@/features/map/types';
import type { MapLocationSuggestion } from '@/features/map/types';
import type { RegionId } from '@/constants/regions';
import { pickValidCoordinate } from '@/features/map/utils/geoBounds';

const SEARCH_BOX_LIMIT = 10;
const NATIVE_PLACE_LIMIT = 5;
const FETCH_TIMEOUT_MS = 12_000;

type SearchBoxSuggestion = {
  name: string;
  mapbox_id: string;
  feature_type: string;
  full_address?: string;
  place_formatted?: string;
  address?: string;
  poi_category?: string[];
  poi_category_ids?: string[];
  distance?: number;
};

const POI_CATEGORY_LABELS: Record<string, string> = {
  grocery: 'Market',
  supermarket: 'Süpermarket',
  shopping: 'Alışveriş',
  shop: 'Dükkan',
  store: 'Mağaza',
  lodging: 'Konaklama',
  hotel: 'Otel',
  motel: 'Pansiyon',
  restaurant: 'Restoran',
  cafe: 'Kafe',
  bakery: 'Fırın',
  butcher: 'Kasap',
  pharmacy: 'Eczane',
  hospital: 'Hastane',
  fuel: 'Akaryakıt',
  parking: 'Otopark',
  bank: 'Banka',
  food: 'Yeme-İçme',
  food_and_drink: 'Yeme-İçme',
  bar: 'Bar',
  beauty: 'Güzellik',
  hair_care: 'Kuaför',
};

function poiCategoryLabel(ids?: string[], labels?: string[]): string | undefined {
  if (labels?.[0]) return labels[0];
  if (!ids?.[0]) return undefined;
  return POI_CATEGORY_LABELS[ids[0]] ?? ids[0];
}

function createSessionToken(): string {
  return `ks-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function suggestionToResult(
  item: SearchBoxSuggestion,
  sessionToken: string,
): MapLocationSuggestion {
  const isPoi = item.feature_type === 'poi';
  const category = poiCategoryLabel(item.poi_category_ids, item.poi_category);
  const address = item.full_address ?? item.place_formatted ?? item.address;

  return {
    id: `place-${item.mapbox_id}`,
    label: item.name,
    subtitle: [isPoi ? 'Mekan' : 'Adres', category, address].filter(Boolean).join(' · '),
    latitude: null,
    longitude: null,
    source: 'place',
    mapboxId: item.mapbox_id,
    sessionToken,
    geocodeHint: address,
  };
}

function dedupeSuggestions(items: MapLocationSuggestion[]): MapLocationSuggestion[] {
  const seen = new Set<string>();
  const merged: MapLocationSuggestion[] = [];

  for (const item of items) {
    const key = `${item.label.toLowerCase()}|${item.subtitle ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

async function searchMapboxSearchBox(
  query: string,
  regionId: RegionId,
  proximity?: MapCoordinate,
  sessionToken?: string,
): Promise<MapLocationSuggestion[]> {
  const token = env.mapbox.accessToken;
  if (!token) return [];

  const tokenSession = sessionToken ?? createSessionToken();
  const center = proximity ?? regionMapCenter(regionId);

  const params = new URLSearchParams({
    q: query,
    access_token: token,
    session_token: tokenSession,
    language: 'tr',
    country: 'TR',
    limit: String(SEARCH_BOX_LIMIT),
    types: 'poi,address,place,street,locality,neighborhood,region',
    proximity: `${center.longitude},${center.latitude}`,
    bbox: regionMapBbox(regionId),
  });

  const url = `https://api.mapbox.com/search/searchbox/v1/suggest?${params}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];

    const json = (await res.json()) as { suggestions?: SearchBoxSuggestion[] };
    return (json.suggestions ?? []).map((item) => suggestionToResult(item, tokenSession));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function retrieveMapboxPlace(
  mapboxId: string,
  sessionToken: string,
): Promise<MapCoordinate | null> {
  const token = env.mapbox.accessToken;
  if (!token) return null;

  const params = new URLSearchParams({
    access_token: token,
    session_token: sessionToken,
  });

  const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(mapboxId)}?${params}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
    };
    const coords = json.features?.[0]?.geometry?.coordinates;
    if (!coords) return null;

    return { latitude: coords[1], longitude: coords[0] };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchNativePlaces(
  query: string,
  regionName: string,
  regionId: RegionId,
): Promise<MapLocationSuggestion[]> {
  const queries = [
    `${query}, ${regionName}, Türkiye`,
    `${query}, Karadeniz, Türkiye`,
    `${query}, ${regionName}`,
  ];

  for (const text of queries) {
    try {
      const results = await Location.geocodeAsync(text);
      const valid = pickValidCoordinate(
        results.map((r) =>
          r.latitude != null && r.longitude != null
            ? { latitude: r.latitude, longitude: r.longitude }
            : null,
        ),
        regionId,
      );
      if (!valid) continue;

      return [
        {
          id: `native-${text}`,
          label: query,
          subtitle: `Adres · ${regionName}`,
          latitude: valid.latitude,
          longitude: valid.longitude,
          source: 'place',
          geocodeHint: regionName,
          regionId,
        },
      ];
    } catch {
      // Sonraki sorguya geç
    }
  }

  return [];
}

export async function searchExternalPlaces(
  query: string,
  options?: { proximity?: MapCoordinate; regionId?: RegionId; regionName?: string; sessionToken?: string },
): Promise<MapLocationSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const regionId = options?.regionId ?? 'trabzon';
  const [mapbox, native] = await Promise.all([
    searchMapboxSearchBox(q, regionId, options?.proximity, options?.sessionToken),
    options?.regionName ? searchNativePlaces(q, options.regionName, regionId) : Promise.resolve([]),
  ]);

  return dedupeSuggestions([...mapbox, ...native]).slice(0, SEARCH_BOX_LIMIT + NATIVE_PLACE_LIMIT);
}
