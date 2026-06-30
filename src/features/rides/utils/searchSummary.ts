import { rideCityName } from '@/features/rides/constants';
import type { RideFilters } from '@/features/rides/types';
import { isoToRideDateDisplay } from '@/features/rides/utils/dateFormat';

export function buildRideSearchSummary(filters: RideFilters): string | null {
  const parts: string[] = [];
  if (filters.fromCityId) parts.push(rideCityName(filters.fromCityId));
  if (filters.toCityId) parts.push(`→ ${rideCityName(filters.toCityId)}`);
  if (filters.departureDate) parts.push(isoToRideDateDisplay(filters.departureDate));
  if (filters.womenOnly) parts.push('Kadınlara özel');
  if (filters.petsAllowed) parts.push('Evcil hayvan');
  if (filters.noSmoking) parts.push('Sigara yok');
  return parts.length ? parts.join(' · ') : null;
}

export function hasActiveRideFilters(filters: RideFilters): boolean {
  return !!(
    filters.fromCityId ||
    filters.toCityId ||
    filters.departureDate ||
    filters.womenOnly ||
    filters.petsAllowed ||
    filters.noSmoking ||
    filters.maxContributionCents
  );
}

export const EMPTY_RIDE_FILTERS: RideFilters = { sort: 'departure' };
