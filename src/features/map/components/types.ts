import type { MapCoordinate, MapMarker, MapStyleId } from '@/features/map/types';

export type PlatformMapProps = {
  markers: MapMarker[];
  selectedMarkerId?: string | null;
  onMarkerPress?: (marker: MapMarker) => void;
  showsUserLocation?: boolean;
  focusCoordinate?: (MapCoordinate & { zoom?: number }) | null;
  mapStyle?: MapStyleId;
};
