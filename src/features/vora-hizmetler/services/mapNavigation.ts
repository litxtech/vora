import { router } from 'expo-router';
import { regionMapCenter } from '@/features/map/constants';
import { useMapStore } from '@/features/map/store/mapStore';
import { DEFAULT_SERVICE_MAP_RADIUS_KM } from '@/features/vora-hizmetler/constants';
import type { ServiceCategory } from '@/features/vora-hizmetler/types';
import type { RegionId } from '@/constants/regions';

type OpenHizmetlerMapOptions = {
  category?: ServiceCategory | null;
  regionId?: RegionId | null;
  radiusKm?: number;
};

/** Vora Hizmetler — yalnızca uygulama içi harita sekmesini açar (dış harita yok). */
export function openHizmetlerInAppMap(options: OpenHizmetlerMapOptions = {}) {
  const store = useMapStore.getState();
  const regionId = (options.regionId ?? 'trabzon') as RegionId;
  const center = regionMapCenter(regionId);

  store.setEnabledLayers(['vora_hizmetler']);
  store.setSearchQuery('');
  store.setHizmetlerCategoryFilter(options.category ?? null);
  store.setHizmetlerRadiusKm(options.radiusKm ?? DEFAULT_SERVICE_MAP_RADIUS_KM);

  if (!store.nearbyEnabled) {
    store.toggleNearby();
  }

  store.focusOn(center.latitude, center.longitude, 12);
  store.selectMarker(null);

  router.push('/(tabs)/map' as never);
}

/** Aktif iş konumunu haritada göster */
export function openHizmetlerJobLocation(
  latitude: number,
  longitude: number,
  regionId?: RegionId | null,
) {
  const store = useMapStore.getState();
  store.setEnabledLayers(['vora_hizmetler']);
  store.setHizmetlerRadiusKm(DEFAULT_SERVICE_MAP_RADIUS_KM);

  if (!store.nearbyEnabled) {
    store.toggleNearby();
  }

  store.focusOn(latitude, longitude, 14);
  store.selectMarker(null);

  if (regionId) {
    void regionId;
  }

  router.push('/(tabs)/map' as never);
}
