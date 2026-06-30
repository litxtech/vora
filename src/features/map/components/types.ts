import type { ExplorerMarker } from '@/features/explorer/types';
import type { MapCoordinate, MapMarker, MapRouteSegment, MapStyleId, MarkerGroup } from '@/features/map/types';

export type PlatformMapProps = {
  markers: MapMarker[];
  explorerMarkers?: ExplorerMarker[];
  selectedMarkerId?: string | null;
  selectedGroupId?: string | null;
  selectedExplorerId?: string | null;
  onMarkerPress?: (marker: MapMarker) => void;
  onGroupPress?: (group: MarkerGroup) => void;
  onExplorerPress?: (marker: ExplorerMarker) => void;
  showsUserLocation?: boolean;
  focusCoordinate?: (MapCoordinate & { zoom?: number }) | null;
  fitCoordinates?: MapCoordinate[];
  routes?: MapRouteSegment[];
  mapStyle?: MapStyleId;
  /** ScrollView içindeyken harita jestlerini açık tut */
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  /** Android Mapbox kümeleme — az pinli gömülü haritalarda kapatın */
  clusterMarkers?: boolean;
  /** Gömülü haritada kullanıcı zoom yaptıktan sonra kamerayı sıfırlama */
  cameraAutoFit?: boolean;
  onMapInteractionStart?: () => void;
  onMapInteractionEnd?: () => void;
};
