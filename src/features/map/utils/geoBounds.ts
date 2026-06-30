import { REGION_MAP_BBOX } from '@/features/map/constants';
import type { MapCoordinate } from '@/features/map/types';
import type { RegionId } from '@/constants/regions';

/** [minLng, minLat, maxLng, maxLat] — Karadeniz geneli */
export const KARADENIZ_BBOX: [number, number, number, number] = [31.0, 39.7, 42.6, 42.45];

export function coordInBbox(
  latitude: number,
  longitude: number,
  bbox: [number, number, number, number],
  padding = 0,
): boolean {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return (
    longitude >= minLng - padding &&
    longitude <= maxLng + padding &&
    latitude >= minLat - padding &&
    latitude <= maxLat + padding
  );
}

/** Gönderi / konum seçimi için geçerli koordinat kontrolü */
export function isValidPostCoordinate(
  latitude: number,
  longitude: number,
  regionId?: RegionId,
): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;

  if (regionId) {
    const bbox = REGION_MAP_BBOX[regionId];
    if (bbox && coordInBbox(latitude, longitude, bbox, 0.08)) return true;
  }

  return coordInBbox(latitude, longitude, KARADENIZ_BBOX);
}

export function pickValidCoordinate(
  candidates: Array<MapCoordinate | null | undefined>,
  regionId?: RegionId,
): MapCoordinate | null {
  for (const coord of candidates) {
    if (!coord) continue;
    if (isValidPostCoordinate(coord.latitude, coord.longitude, regionId)) return coord;
  }
  return null;
}
