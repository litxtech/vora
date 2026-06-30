import * as Location from 'expo-location';
import { regionNameById, type RegionId } from '@/constants/regions';
import { retrieveMapboxPlace, searchExternalPlaces } from '@/features/map/services/searchExternalPlaces';
import type { MapCoordinate, MapLocationSource } from '@/features/map/types';
import { isValidPostCoordinate, pickValidCoordinate } from '@/features/map/utils/geoBounds';
import { supabase } from '@/lib/supabase/client';

export type ResolvePlaceInput = {
  label: string;
  regionId: RegionId;
  suggestionRegionId?: RegionId;
  latitude?: number | null;
  longitude?: number | null;
  geocodeHint?: string | null;
  mapboxId?: string | null;
  sessionToken?: string | null;
  source?: MapLocationSource;
  proximity?: MapCoordinate;
};

function validationRegion(input: ResolvePlaceInput): RegionId {
  return input.suggestionRegionId ?? input.regionId;
}

async function geocodeWithValidation(
  queries: string[],
  regionId: RegionId,
): Promise<MapCoordinate | null> {
  for (const query of queries) {
    try {
      const results = await Location.geocodeAsync(query);
      const valid = pickValidCoordinate(
        results.map((r) =>
          r.latitude != null && r.longitude != null
            ? { latitude: r.latitude, longitude: r.longitude }
            : null,
        ),
        regionId,
      );
      if (valid) return valid;
    } catch {
      // Sonraki sorgu
    }
  }
  return null;
}

async function mapboxWithValidation(
  mapboxId: string,
  sessionToken: string,
  regionId: RegionId,
): Promise<MapCoordinate | null> {
  const coords = await retrieveMapboxPlace(mapboxId, sessionToken);
  if (!coords) return null;
  return isValidPostCoordinate(coords.latitude, coords.longitude, regionId) ? coords : null;
}

export async function resolvePlaceCoordinates(input: ResolvePlaceInput): Promise<MapCoordinate | null> {
  const label = input.label.trim();
  if (!label) return null;

  const regionId = validationRegion(input);
  const regionName = regionNameById(regionId) ?? regionId;

  if (input.latitude != null && input.longitude != null) {
    if (isValidPostCoordinate(input.latitude, input.longitude, regionId)) {
      return { latitude: input.latitude, longitude: input.longitude };
    }
  }

  if (input.mapboxId && input.sessionToken) {
    const mapbox = await mapboxWithValidation(input.mapboxId, input.sessionToken, regionId);
    if (mapbox) return mapbox;
  }

  const { data: existing } = await supabase
    .from('posts')
    .select('latitude, longitude')
    .eq('region_id', regionId)
    .eq('location_label', label)
    .not('latitude', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    existing?.latitude != null &&
    existing?.longitude != null &&
    isValidPostCoordinate(existing.latitude, existing.longitude, regionId)
  ) {
    return { latitude: existing.latitude, longitude: existing.longitude };
  }

  const hint = input.geocodeHint?.trim();
  const geocodeQueries = [
    hint ? `${label}, ${hint}, Türkiye` : null,
    input.source === 'district'
      ? [`${label}, ${regionName}, Türkiye`, `${label} ilçesi, ${regionName}, Türkiye`]
      : null,
    `${label}, ${regionName}, Türkiye`,
    hint ? `${label}, ${hint}` : null,
  ]
    .flat()
    .filter((q): q is string => Boolean(q));

  const geocoded = await geocodeWithValidation(geocodeQueries, regionId);
  if (geocoded) return geocoded;

  const mapboxQuery = hint ? `${label}, ${hint}, Türkiye` : `${label}, ${regionName}, Türkiye`;
  try {
    const external = await searchExternalPlaces(mapboxQuery, {
      regionId,
      regionName,
      proximity: input.proximity,
      sessionToken: input.sessionToken ?? undefined,
    });

    for (const item of external) {
      if (!item.mapboxId || !item.sessionToken) continue;
      const coords = await mapboxWithValidation(item.mapboxId, item.sessionToken, regionId);
      if (coords) return coords;
    }
  } catch {
    // Harita dışı koordinat atanmaz
  }

  return null;
}
