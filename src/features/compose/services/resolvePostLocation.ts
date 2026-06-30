import type { RegionId } from '@/constants/regions';
import { resolvePlaceCoordinates } from '@/features/map/services/resolvePlaceCoordinates';
import type { MapCoordinate, MapLocationSource } from '@/features/map/types';

type ResolvePostLocationInput = {
  label: string;
  regionId: RegionId;
  suggestionRegionId?: RegionId;
  latitude?: number | null;
  longitude?: number | null;
  source?: MapLocationSource;
  geocodeHint?: string | null;
  mapboxId?: string | null;
  sessionToken?: string | null;
};

export async function resolvePostLocationCoords(
  input: ResolvePostLocationInput,
): Promise<MapCoordinate | null> {
  return resolvePlaceCoordinates({
    label: input.label,
    regionId: input.regionId,
    suggestionRegionId: input.suggestionRegionId,
    latitude: input.latitude,
    longitude: input.longitude,
    geocodeHint: input.geocodeHint,
    mapboxId: input.mapboxId,
    sessionToken: input.sessionToken,
    source: input.source,
  });
}
