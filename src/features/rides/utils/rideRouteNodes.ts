import { RIDE_CITIES, rideCityName } from '@/features/rides/constants';
import type { RideTrip } from '@/features/rides/types';
import type { MapCoordinate } from '@/features/map/types';

export function cityIdToCoordinate(cityId: string): MapCoordinate | null {
  const city = RIDE_CITIES.find((c) => c.id === cityId);
  if (!city) return null;
  return { latitude: city.lat, longitude: city.lng };
}

export function routeNodesFromCityIds(
  fromCityId: string,
  toCityId: string,
  stopCityIds: string[] = [],
): MapCoordinate[] {
  const stops = stopCityIds.filter((id) => id && id !== fromCityId && id !== toCityId);
  const nodes: MapCoordinate[] = [];

  const from = cityIdToCoordinate(fromCityId);
  if (from) nodes.push(from);

  for (const cityId of stops) {
    const coord = cityIdToCoordinate(cityId);
    if (coord) nodes.push(coord);
  }

  const to = cityIdToCoordinate(toCityId);
  if (to) nodes.push(to);

  return nodes;
}

export function routeNodesFromTrip(trip: RideTrip): MapCoordinate[] {
  const stops = [...(trip.stops ?? [])].sort((a, b) => a.stopOrder - b.stopOrder);
  const stopCityIds = stops.map((s) => s.cityId);
  const nodes = routeNodesFromCityIds(trip.fromCityId, trip.toCityId, stopCityIds);

  if (nodes.length >= 2) return nodes;

  const fallback: MapCoordinate[] = [];
  const from =
    trip.fromLat != null && trip.fromLng != null
      ? { latitude: trip.fromLat, longitude: trip.fromLng }
      : cityIdToCoordinate(trip.fromCityId);
  if (from) fallback.push(from);

  for (const stop of stops) {
    const coord =
      stop.latitude != null && stop.longitude != null
        ? { latitude: stop.latitude, longitude: stop.longitude }
        : cityIdToCoordinate(stop.cityId);
    if (coord) fallback.push(coord);
  }

  const to =
    trip.toLat != null && trip.toLng != null
      ? { latitude: trip.toLat, longitude: trip.toLng }
      : cityIdToCoordinate(trip.toCityId);
  if (to) fallback.push(to);

  return fallback;
}

export function routeLabelFromCityIds(
  fromCityId: string,
  toCityId: string,
  stopCityIds: string[] = [],
): string {
  const stops = stopCityIds.filter((id) => id && id !== fromCityId && id !== toCityId);
  return [fromCityId, ...stops, toCityId].map((id) => rideCityName(id)).join(' → ');
}