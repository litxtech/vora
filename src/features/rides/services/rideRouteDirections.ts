import { env } from '@/config/env';
import { distanceKm } from '@/features/map/utils/geo';
import type { MapCoordinate } from '@/features/map/types';

export type RideRouteGeometry = {
  coordinates: MapCoordinate[];
  distanceKm: number;
  durationMinutes: number;
};

const MAX_DISPLAY_POINTS = 512;
const FETCH_TIMEOUT_MS = 15000;

function densifyStraightLine(nodes: MapCoordinate[], pointsPerLeg = 24): MapCoordinate[] {
  if (nodes.length < 2) return nodes;

  const result: MapCoordinate[] = [nodes[0]];
  for (let i = 1; i < nodes.length; i += 1) {
    const from = nodes[i - 1];
    const to = nodes[i];
    for (let step = 1; step <= pointsPerLeg; step += 1) {
      const t = step / pointsPerLeg;
      result.push({
        latitude: from.latitude + (to.latitude - from.latitude) * t,
        longitude: from.longitude + (to.longitude - from.longitude) * t,
      });
    }
  }
  return result;
}

export function simplifyRouteCoordinates(
  coordinates: MapCoordinate[],
  maxPoints = MAX_DISPLAY_POINTS,
): MapCoordinate[] {
  if (coordinates.length <= maxPoints) return coordinates;

  const step = Math.ceil(coordinates.length / maxPoints);
  const simplified: MapCoordinate[] = [];
  for (let i = 0; i < coordinates.length; i += step) {
    simplified.push(coordinates[i]);
  }

  const last = coordinates[coordinates.length - 1];
  const tail = simplified[simplified.length - 1];
  if (tail.latitude !== last.latitude || tail.longitude !== last.longitude) {
    simplified.push(last);
  }

  return simplified;
}

function estimateFallback(nodes: MapCoordinate[]): RideRouteGeometry {
  if (nodes.length < 2) {
    return { coordinates: nodes, distanceKm: 0, durationMinutes: 0 };
  }

  let totalKm = 0;
  for (let i = 1; i < nodes.length; i += 1) {
    totalKm += distanceKm(nodes[i - 1], nodes[i]);
  }

  return {
    coordinates: densifyStraightLine(nodes),
    distanceKm: totalKm,
    durationMinutes: Math.max(1, Math.round((totalKm / 75) * 60)),
  };
}

export async function fetchRideRouteGeometry(nodes: MapCoordinate[]): Promise<RideRouteGeometry> {
  if (nodes.length < 2) return estimateFallback(nodes);

  const token = env.mapbox.accessToken;
  if (!token) return estimateFallback(nodes);

  const coordPath = nodes.map((n) => `${n.longitude},${n.latitude}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordPath}?geometries=geojson&overview=simplified&access_token=${encodeURIComponent(token)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return estimateFallback(nodes);

    const json = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
      }>;
    };

    if (json.code && json.code !== 'Ok') return estimateFallback(nodes);

    const route = json.routes?.[0];
    const raw = route?.geometry?.coordinates;
    if (!raw?.length) return estimateFallback(nodes);

    const coordinates = simplifyRouteCoordinates(
      raw.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
    );
    return {
      coordinates,
      distanceKm: (route.distance ?? 0) / 1000,
      durationMinutes: Math.max(1, Math.round((route.duration ?? 0) / 60)),
    };
  } catch {
    return estimateFallback(nodes);
  } finally {
    clearTimeout(timeout);
  }
}

export function formatRouteDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} sa ${m} dk` : `${h} sa`;
}

export function formatRouteDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
