import { distanceKm } from '@/features/map/utils/geo';
import { RIDE_AUTO_COMPLETE_BUFFER_MINUTES, RIDE_FALLBACK_SPEED_KMH } from '@/features/rides/constants';
import type { RideTrip } from '@/features/rides/types';
import { parseRideDepartureAt } from '@/features/rides/utils/dateFormat';
import { routeNodesFromCityIds } from '@/features/rides/utils/rideRouteNodes';

export function estimateRideDurationMinutes(
  fromCityId: string,
  toCityId: string,
  stopCityIds: string[] = [],
): number {
  const nodes = routeNodesFromCityIds(fromCityId, toCityId, stopCityIds);
  if (nodes.length < 2) return 60;

  let totalKm = 0;
  for (let i = 1; i < nodes.length; i += 1) {
    totalKm += distanceKm(nodes[i - 1], nodes[i]);
  }
  if (totalKm <= 0) return 60;
  return Math.max(15, Math.round((totalKm / RIDE_FALLBACK_SPEED_KMH) * 60));
}

export function effectiveRideDurationMinutes(trip: Pick<RideTrip, 'estimatedDurationMinutes' | 'fromCityId' | 'toCityId' | 'stops'>): number {
  if (trip.estimatedDurationMinutes != null && trip.estimatedDurationMinutes > 0) {
    return trip.estimatedDurationMinutes;
  }
  const stopCityIds = [...(trip.stops ?? [])]
    .sort((a, b) => a.stopOrder - b.stopOrder)
    .map((s) => s.cityId);
  return estimateRideDurationMinutes(trip.fromCityId, trip.toCityId, stopCityIds);
}

export function computeRideAutoCompleteAt(
  trip: Pick<RideTrip, 'departureDate' | 'departureTime' | 'estimatedDurationMinutes' | 'fromCityId' | 'toCityId' | 'stops'>,
): Date {
  const departure = parseRideDepartureAt(trip.departureDate, trip.departureTime);
  const durationMin = effectiveRideDurationMinutes(trip);
  return new Date(departure.getTime() + (durationMin + RIDE_AUTO_COMPLETE_BUFFER_MINUTES) * 60_000);
}

export function formatRideAutoCompleteLabel(
  trip: Pick<RideTrip, 'departureDate' | 'departureTime' | 'estimatedDurationMinutes' | 'fromCityId' | 'toCityId' | 'stops'>,
): string {
  const at = computeRideAutoCompleteAt(trip);
  const durationMin = effectiveRideDurationMinutes(trip);
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  const durationLabel = hours > 0 ? `${hours} sa ${mins > 0 ? `${mins} dk` : ''}`.trim() : `${durationMin} dk`;
  const timeLabel = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  return `~${durationLabel} + ${RIDE_AUTO_COMPLETE_BUFFER_MINUTES} dk tampon · otomatik bitiş ${timeLabel}`;
}
