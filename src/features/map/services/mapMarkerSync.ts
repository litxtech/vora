import { buildMapMarkerId } from '@/features/map/services/mapMarkerIds';
import { useMapStore } from '@/features/map/store/mapStore';
import type { MapLayerId } from '@/features/map/types';

type MapMarkerRemovalListener = (markerId: string) => void;

const listeners = new Set<MapMarkerRemovalListener>();

export function notifyMapMarkerRemoved(markerId: string): void {
  const selected = useMapStore.getState().selectedMarker;
  if (selected?.id === markerId) {
    useMapStore.getState().selectMarker(null);
  }

  for (const listener of listeners) {
    listener(markerId);
  }
}

export function notifyMapMarkerRemovedBySource(layer: MapLayerId, sourceId: string): void {
  notifyMapMarkerRemoved(buildMapMarkerId(layer, sourceId));
}

export function subscribeMapMarkerRemovals(listener: MapMarkerRemovalListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
