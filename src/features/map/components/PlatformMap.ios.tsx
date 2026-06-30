import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT, type MapType, type Region } from 'react-native-maps';
import { ExplorerSilhouettePin } from '@/features/explorer/components/ExplorerSilhouettePin';
import { IosCustomMapMarker } from '@/features/map/components/IosCustomMapMarker';
import { MapClusterPin } from '@/features/map/components/MapClusterPin';
import { MapMarkerPin } from '@/features/map/components/MapMarkerPin';
import { KARADENIZ_INITIAL_REGION, MAP_IOS_MAX_VISIBLE_MARKERS } from '@/features/map/constants';
import { isLiveMarker } from '@/features/map/utils/geo';
import {
  cullGroupsToViewport,
  groupMarkersByCell,
  precisionForRegion,
} from '@/features/map/utils/groupMarkers';
import type { PlatformMapProps } from '@/features/map/components/types';
import type { MapStyleId } from '@/features/map/types';

function resolveIosMapType(style: MapStyleId): MapType {
  if (style === 'satellite') return 'satellite';
  if (style === 'standard') return 'standard';
  return 'mutedStandard';
}

function resolveIosUiStyle(style: MapStyleId): 'light' | 'dark' {
  if (style === 'light' || style === 'standard') return 'light';
  return 'dark';
}

type GeoItem = { id: string; latitude: number; longitude: number };

/**
 * Görünür bölge (+ kenar payı) içindeki marker'ları seçer, sayıyı sınırlar.
 * Seçili ve öncelikli (canlı) pin'ler her zaman korunur; sınır aşılırsa kalanlar
 * ekran merkezine yakınlığa göre seçilir. Ekran dışındaki pin'ler zaten görünmez.
 */
function cullMarkersToViewport<T extends GeoItem>(
  items: T[],
  region: Region | null,
  selectedId: string | null | undefined,
  max: number,
  isPriority: (item: T) => boolean,
): T[] {
  if (items.length <= max && !region) return items;

  const inView = region
    ? items.filter((item) => {
        const latMargin = (region.latitudeDelta / 2) * 1.5;
        const lngMargin = (region.longitudeDelta / 2) * 1.5;
        return (
          item.id === selectedId ||
          (Math.abs(item.latitude - region.latitude) <= latMargin &&
            Math.abs(item.longitude - region.longitude) <= lngMargin)
        );
      })
    : items;

  if (inView.length <= max) return inView;

  const centerLat = region?.latitude ?? 0;
  const centerLng = region?.longitude ?? 0;
  const score = (item: T) =>
    (item.id === selectedId ? -1e9 : 0) +
    (isPriority(item) ? -1e6 : 0) +
    (item.latitude - centerLat) ** 2 +
    (item.longitude - centerLng) ** 2;

  return [...inView].sort((a, b) => score(a) - score(b)).slice(0, max);
}

export function PlatformMap({
  markers,
  explorerMarkers = [],
  selectedMarkerId,
  selectedGroupId,
  selectedExplorerId,
  onMarkerPress,
  onGroupPress,
  onExplorerPress,
  showsUserLocation = true,
  focusCoordinate,
  fitCoordinates,
  routes = [],
  mapStyle = 'dark',
  scrollEnabled = true,
  zoomEnabled = true,
  onMapInteractionStart,
  onMapInteractionEnd,
}: PlatformMapProps) {
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [visibleRegion, setVisibleRegion] = useState<Region>(KARADENIZ_INITIAL_REGION);
  const userGestureActive = useRef(false);

  const visibleGroups = useMemo(() => {
    const precision = precisionForRegion(visibleRegion);
    const grouped = groupMarkersByCell(markers, precision, selectedMarkerId);
    return cullGroupsToViewport(grouped, visibleRegion, selectedGroupId, MAP_IOS_MAX_VISIBLE_MARKERS);
  }, [markers, visibleRegion, selectedMarkerId, selectedGroupId]);

  const visibleExplorerMarkers = useMemo(
    () =>
      cullMarkersToViewport(
        explorerMarkers,
        visibleRegion,
        selectedExplorerId,
        MAP_IOS_MAX_VISIBLE_MARKERS,
        () => false,
      ),
    [explorerMarkers, visibleRegion, selectedExplorerId],
  );

  const fitCamera = useCallback(() => {
    if (!mapRef.current || !mapReady) return;

    if (fitCoordinates?.length) {
      mapRef.current.fitToCoordinates(fitCoordinates, {
        edgePadding: { top: 120, right: 40, bottom: 240, left: 40 },
        animated: true,
      });
      return;
    }

    if (!focusCoordinate) return;

    const region: Region = {
      latitude: focusCoordinate.latitude,
      longitude: focusCoordinate.longitude,
      latitudeDelta: focusCoordinate.zoom ? 1 / focusCoordinate.zoom : 0.08,
      longitudeDelta: focusCoordinate.zoom ? 1 / focusCoordinate.zoom : 0.08,
    };

    mapRef.current.animateToRegion(region, 450);
  }, [fitCoordinates, focusCoordinate, mapReady]);

  useEffect(() => {
    fitCamera();
  }, [fitCamera, routes.length]);

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      initialRegion={KARADENIZ_INITIAL_REGION}
      onMapReady={() => setMapReady(true)}
      showsUserLocation={showsUserLocation}
      showsCompass={false}
      showsScale={false}
      showsMyLocationButton={false}
      mapType={resolveIosMapType(mapStyle)}
      userInterfaceStyle={resolveIosUiStyle(mapStyle)}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
      rotateEnabled
      pitchEnabled
      onPanDrag={() => {
        if (!userGestureActive.current) {
          userGestureActive.current = true;
          onMapInteractionStart?.();
        }
      }}
      onRegionChangeComplete={(region) => {
        setVisibleRegion(region);
        if (userGestureActive.current) {
          userGestureActive.current = false;
          onMapInteractionEnd?.();
        }
      }}
    >
      {routes.map((route) => (
        <Polyline
          key={`${route.id}-outline`}
          coordinates={route.coordinates}
          strokeColor={route.outlineColor ?? '#ffffff'}
          strokeWidth={(route.width ?? 6) + 3}
          lineCap="round"
          lineJoin="round"
        />
      ))}
      {routes.map((route) => (
        <Polyline
          key={route.id}
          coordinates={route.coordinates}
          strokeColor={route.color ?? '#2196F3'}
          strokeWidth={route.width ?? 6}
          lineCap="round"
          lineJoin="round"
        />
      ))}
      {visibleGroups.map((group) => {
        const selected = selectedGroupId === group.id || selectedMarkerId === group.representative.id;
        const live = group.members.some(isLiveMarker);

        if (group.count <= 1) {
          const marker = group.representative;
          return (
            <IosCustomMapMarker
              key={group.id}
              identifier={group.id}
              coordinate={{ latitude: group.latitude, longitude: group.longitude }}
              onPress={() => onMarkerPress?.(marker)}
              animated={live || selected}
            >
              <MapMarkerPin marker={marker} selected={selected} />
            </IosCustomMapMarker>
          );
        }

        return (
          <IosCustomMapMarker
            key={group.id}
            identifier={group.id}
            coordinate={{ latitude: group.latitude, longitude: group.longitude }}
            onPress={() => onGroupPress?.(group)}
            animated={selected}
          >
            <MapClusterPin group={group} selected={selected} />
          </IosCustomMapMarker>
        );
      })}
      {visibleExplorerMarkers.map((explorer) => {
        const selected = selectedExplorerId === explorer.id;
        return (
          <IosCustomMapMarker
            key={explorer.id}
            identifier={explorer.id}
            coordinate={{ latitude: explorer.latitude, longitude: explorer.longitude }}
            onPress={() => onExplorerPress?.(explorer)}
            animated={selected}
            anchor={{ x: 0.5, y: 0.95 }}
            centerOffset={{ x: 0, y: -8 }}
          >
            <ExplorerSilhouettePin marker={explorer} selected={selected} />
          </IosCustomMapMarker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
  },
});
