import type { MapMarker, MarkerGroup } from '@/features/map/types';
import { MAP_IOS_MAX_VISIBLE_MARKERS } from '@/features/map/constants';
import { isLiveMarker } from '@/features/map/utils/geo';

type RegionLike = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

function cellKey(latitude: number, longitude: number, precision: number): string {
  const latCell = Math.round(latitude / precision);
  const lngCell = Math.round(longitude / precision);
  return `${latCell}:${lngCell}`;
}

function markerTimestamp(marker: MapMarker): number {
  if (!marker.createdAt) return 0;
  const ts = Date.parse(marker.createdAt);
  return Number.isFinite(ts) ? ts : 0;
}

/** Zoom seviyesine göre hücre hassasiyeti (derece) */
export function precisionForZoom(zoom: number): number {
  const clamped = Math.max(8, Math.min(18, zoom));
  return 360 / (256 * 2 ** clamped * 4);
}

/** Görünür bölgeye göre hücre hassasiyeti */
export function precisionForRegion(region: RegionLike): number {
  const avgDelta = (region.latitudeDelta + region.longitudeDelta) / 2;
  return Math.max(0.00008, avgDelta / 80);
}

export function groupMarkersByCell(
  markers: MapMarker[],
  precision: number,
  selectedMarkerId?: string | null,
): MarkerGroup[] {
  if (markers.length === 0) return [];

  const buckets = new Map<string, MapMarker[]>();
  const selectedSingles: MapMarker[] = [];

  for (const marker of markers) {
    if (selectedMarkerId && marker.id === selectedMarkerId) {
      selectedSingles.push(marker);
      continue;
    }

    const key = cellKey(marker.latitude, marker.longitude, precision);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(marker);
    else buckets.set(key, [marker]);
  }

  const groups: MarkerGroup[] = [];

  for (const members of buckets.values()) {
    const sorted = [...members].sort((a, b) => markerTimestamp(b) - markerTimestamp(a));
    const representative = sorted[0]!;
    groups.push({
      id: `group-${cellKey(representative.latitude, representative.longitude, precision)}`,
      latitude: representative.latitude,
      longitude: representative.longitude,
      members: sorted,
      representative,
      count: sorted.length,
    });
  }

  for (const marker of selectedSingles) {
    groups.push({
      id: `group-single-${marker.id}`,
      latitude: marker.latitude,
      longitude: marker.longitude,
      members: [marker],
      representative: marker,
      count: 1,
    });
  }

  return groups;
}

export function cullGroupsToViewport(
  groups: MarkerGroup[],
  region: RegionLike | null,
  selectedGroupId: string | null | undefined,
  max = MAP_IOS_MAX_VISIBLE_MARKERS,
): MarkerGroup[] {
  if (groups.length <= max && !region) return groups;

  const inView = region
    ? groups.filter((group) => {
        const latMargin = (region.latitudeDelta / 2) * 1.5;
        const lngMargin = (region.longitudeDelta / 2) * 1.5;
        return (
          group.id === selectedGroupId ||
          (Math.abs(group.latitude - region.latitude) <= latMargin &&
            Math.abs(group.longitude - region.longitude) <= lngMargin)
        );
      })
    : groups;

  if (inView.length <= max) return inView;

  const centerLat = region?.latitude ?? 0;
  const centerLng = region?.longitude ?? 0;
  const score = (group: MarkerGroup) =>
    (group.id === selectedGroupId ? -1e9 : 0) +
    (group.members.some(isLiveMarker) ? -1e6 : 0) +
    (group.latitude - centerLat) ** 2 +
    (group.longitude - centerLng) ** 2;

  return [...inView].sort((a, b) => score(a) - score(b)).slice(0, max);
}

/** Küme temsilcisi için görsel URL (avatar veya ilk medya) */
export function resolveGroupAvatarUrl(group: MarkerGroup): string | null {
  const rep = group.representative;
  if (rep.avatarUrl) return rep.avatarUrl;
  if (rep.mediaUrls?.[0]) return rep.mediaUrls[0];
  return null;
}
