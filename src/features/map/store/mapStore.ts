import { create } from 'zustand';
import { DEFAULT_ENABLED_LAYERS, MAP_STYLE_OPTIONS } from '@/features/map/constants';
import type { MapLayerId, MapMarker, MapStyleId } from '@/features/map/types';

type MapStore = {
  searchQuery: string;
  enabledLayers: MapLayerId[];
  selectedMarker: MapMarker | null;
  focusCoordinate: { latitude: number; longitude: number; zoom?: number } | null;
  mapStyle: MapStyleId;
  nearbyEnabled: boolean;
  setSearchQuery: (query: string) => void;
  toggleLayer: (layer: MapLayerId) => void;
  setEnabledLayers: (layers: MapLayerId[]) => void;
  selectMarker: (marker: MapMarker | null) => void;
  focusOn: (latitude: number, longitude: number, zoom?: number) => void;
  clearFocus: () => void;
  setMapStyle: (style: MapStyleId) => void;
  cycleMapStyle: () => void;
  toggleNearby: () => void;
};

export const useMapStore = create<MapStore>((set) => ({
  searchQuery: '',
  enabledLayers: DEFAULT_ENABLED_LAYERS,
  selectedMarker: null,
  focusCoordinate: null,
  mapStyle: 'dark',
  nearbyEnabled: false,
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleLayer: (layer) =>
    set((state) => ({
      enabledLayers: state.enabledLayers.includes(layer)
        ? state.enabledLayers.filter((id) => id !== layer)
        : [...state.enabledLayers, layer],
    })),
  setEnabledLayers: (layers) => set({ enabledLayers: layers }),
  selectMarker: (marker) => set({ selectedMarker: marker }),
  focusOn: (latitude, longitude, zoom) =>
    set({ focusCoordinate: { latitude, longitude, zoom } }),
  clearFocus: () => set({ focusCoordinate: null }),
  setMapStyle: (style) => set({ mapStyle: style }),
  cycleMapStyle: () =>
    set((state) => {
      const index = MAP_STYLE_OPTIONS.findIndex((option) => option.id === state.mapStyle);
      const next = MAP_STYLE_OPTIONS[(index + 1) % MAP_STYLE_OPTIONS.length];
      return { mapStyle: next.id };
    }),
  toggleNearby: () => set((state) => ({ nearbyEnabled: !state.nearbyEnabled })),
}));
