import * as Location from 'expo-location';
import { env } from '@/config/env';
import { regionMapBbox, regionMapCenter } from '@/features/map/constants';
import type { MapCoordinate } from '@/features/map/types';
import type { MapLocationSuggestion } from '@/features/map/types';
import type { RegionId } from '@/constants/regions';
import {
  isValidWorldCoordinate,
  pickValidCoordinate,
  type LocationGeoScope,
} from '@/features/map/utils/geoBounds';

const SEARCH_BOX_LIMIT = 10;
const NATIVE_PLACE_LIMIT = 5;
const NEARBY_LIMIT = 8;
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

type GeocodingFeature = {
  id: string;
  text?: string;
  place_name?: string;
  properties?: { category?: string };
  geometry?: { coordinates?: [number, number] };
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
    distanceMeters: typeof item.distance === 'number' ? item.distance : undefined,
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
  options: {
    regionId?: RegionId;
    proximity?: MapCoordinate;
    sessionToken?: string;
    scope?: LocationGeoScope;
  },
): Promise<MapLocationSuggestion[]> {
  const token = env.mapbox.accessToken;
  if (!token) return [];

  const scope = options.scope ?? 'region';
  const tokenSession = options.sessionToken ?? createSessionToken();
  const center =
    options.proximity ??
    (options.regionId ? regionMapCenter(options.regionId) : undefined);

  const params = new URLSearchParams({
    q: query,
    access_token: token,
    session_token: tokenSession,
    language: 'tr',
    limit: String(SEARCH_BOX_LIMIT),
    types: 'poi,address,place,street,locality,neighborhood,region,country',
  });

  if (center) {
    params.set('proximity', `${center.longitude},${center.latitude}`);
  }

  // Bölge modu: Türkiye + il bbox. Dünya modu: kısıt yok, proximity yakın sonuçları öne alır.
  if (scope === 'region') {
    params.set('country', 'TR');
    if (options.regionId) {
      params.set('bbox', regionMapBbox(options.regionId));
    }
  }

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

/** Kullanıcı konumuna yakın yer önerileri (ters geocode). */
export async function fetchNearbyPlaces(
  proximity: MapCoordinate,
): Promise<MapLocationSuggestion[]> {
  const token = env.mapbox.accessToken;
  if (!token) return [];

  const params = new URLSearchParams({
    access_token: token,
    language: 'tr',
    limit: String(NEARBY_LIMIT),
    types: 'poi,address,neighborhood,locality,place',
  });

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${proximity.longitude},${proximity.latitude}.json?${params}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];

    const json = (await res.json()) as { features?: GeocodingFeature[] };
    const features = json.features ?? [];

    return features
      .map((feature, index): MapLocationSuggestion | null => {
        const coords = feature.geometry?.coordinates;
        if (!coords) return null;
        const latitude = coords[1];
        const longitude = coords[0];
        if (!isValidWorldCoordinate(latitude, longitude)) return null;

        const label = feature.text?.trim() || feature.place_name?.split(',')[0]?.trim();
        if (!label) return null;

        return {
          id: `nearby-${feature.id || index}`,
          label,
          subtitle: ['Yakınında', feature.place_name].filter(Boolean).join(' · '),
          latitude,
          longitude,
          source: 'place',
          geocodeHint: feature.place_name,
        };
      })
      .filter((item): item is MapLocationSuggestion => item != null);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function searchNativePlaces(
  query: string,
  options: {
    regionName?: string;
    regionId?: RegionId;
    scope?: LocationGeoScope;
  },
): Promise<MapLocationSuggestion[]> {
  const scope = options.scope ?? 'region';
  const regionName = options.regionName;
  const regionId = options.regionId ?? 'trabzon';

  const queries =
    scope === 'world'
      ? [query, regionName ? `${query}, ${regionName}` : null].filter((q): q is string => Boolean(q))
      : [
          regionName ? `${query}, ${regionName}, Türkiye` : null,
          `${query}, Karadeniz, Türkiye`,
          regionName ? `${query}, ${regionName}` : null,
        ].filter((q): q is string => Boolean(q));

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
        scope,
      );
      if (!valid) continue;

      return [
        {
          id: `native-${text}`,
          label: query,
          subtitle: scope === 'world' ? 'Adres' : `Adres · ${regionName ?? regionId}`,
          latitude: valid.latitude,
          longitude: valid.longitude,
          source: 'place',
          geocodeHint: regionName,
          regionId: scope === 'region' ? regionId : undefined,
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
  options?: {
    proximity?: MapCoordinate;
    regionId?: RegionId;
    regionName?: string;
    sessionToken?: string;
    scope?: LocationGeoScope;
  },
): Promise<MapLocationSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const scope = options?.scope ?? 'region';
  const regionId = options?.regionId ?? 'trabzon';
  const [mapbox, native] = await Promise.all([
    searchMapboxSearchBox(q, {
      regionId,
      proximity: options?.proximity,
      sessionToken: options?.sessionToken,
      scope,
    }),
    searchNativePlaces(q, {
      regionName: options?.regionName,
      regionId,
      scope,
    }),
  ]);

  return dedupeSuggestions([...mapbox, ...native]).slice(0, SEARCH_BOX_LIMIT + NATIVE_PLACE_LIMIT);
}
