import { router } from 'expo-router';
import type { MapLayerId } from '@/features/map/types';

export type MapDirectionsInput = {
  latitude: number;
  longitude: number;
  label: string;
  subtitle?: string;
  layer?: MapLayerId;
  sourceId?: string;
};

export function openMapDirections(input: MapDirectionsInput) {
  router.push({
    pathname: '/map/directions',
    params: {
      latitude: String(input.latitude),
      longitude: String(input.longitude),
      label: input.label,
      subtitle: input.subtitle ?? '',
      layer: input.layer ?? 'businesses',
      sourceId: input.sourceId ?? '',
    },
  } as never);
}
