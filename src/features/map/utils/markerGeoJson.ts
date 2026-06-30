import { EXPLORER_ACCENT_COLOR } from '@/features/explorer/constants';
import type { ExplorerMarker } from '@/features/explorer/types';
import { LAYER_BY_ID } from '@/features/map/constants';
import type { MapMarker } from '@/features/map/types';

const EMPTY_COLLECTION: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export function resolveMarkerPinColor(marker: MapMarker): string {
  if (marker.meta?.mapColor) return String(marker.meta.mapColor);
  return LAYER_BY_ID[marker.layer].color;
}

export function markersToFeatureCollection(markers: MapMarker[]): GeoJSON.FeatureCollection {
  if (markers.length === 0) return EMPTY_COLLECTION;

  return {
    type: 'FeatureCollection',
    features: markers.map((marker) => ({
      type: 'Feature',
      id: marker.id,
      geometry: {
        type: 'Point',
        coordinates: [marker.longitude, marker.latitude],
      },
      properties: {
        markerId: marker.id,
        color: resolveMarkerPinColor(marker),
      },
    })),
  };
}

export function explorersToFeatureCollection(explorers: ExplorerMarker[]): GeoJSON.FeatureCollection {
  if (explorers.length === 0) return EMPTY_COLLECTION;

  return {
    type: 'FeatureCollection',
    features: explorers.map((explorer) => ({
      type: 'Feature',
      id: explorer.id,
      geometry: {
        type: 'Point',
        coordinates: [explorer.longitude, explorer.latitude],
      },
      properties: {
        explorerId: explorer.id,
        color: EXPLORER_ACCENT_COLOR,
      },
    })),
  };
}
