import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Mapbox, { type CircleLayerStyle } from '@rnmapbox/maps';
import { Text } from '@/components/ui/Text';
import { MapClusterPin } from '@/features/map/components/MapClusterPin';
import { MapMarkerPin } from '@/features/map/components/MapMarkerPin';
import {
  KARADENIZ_INITIAL_REGION,
  KARADENIZ_MAP_CENTER,
  MAP_IOS_MAX_VISIBLE_MARKERS,
  MAPBOX_DARK_STYLE,
  MAPBOX_LIGHT_STYLE,
  MAPBOX_SATELLITE_STYLE,
  MAPBOX_STANDARD_STYLE,
} from '@/features/map/constants';
import type { PlatformMapProps } from '@/features/map/components/types';
import type { MapStyleId } from '@/features/map/types';
import { explorersToFeatureCollection } from '@/features/map/utils/markerGeoJson';
import {
  cullGroupsToViewport,
  groupMarkersByCell,
  precisionForZoom,
} from '@/features/map/utils/groupMarkers';
import { ensureMapboxInitialized } from '@/lib/mapbox/init';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

function resolveMapboxStyle(style: MapStyleId): string {
  switch (style) {
    case 'light':
      return MAPBOX_LIGHT_STYLE;
    case 'standard':
      return MAPBOX_STANDARD_STYLE;
    case 'satellite':
      return MAPBOX_SATELLITE_STYLE;
    default:
      return MAPBOX_DARK_STYLE;
  }
}

const EXPLORER_LAYER_STYLE: CircleLayerStyle = {
  circleRadius: 9,
  circleColor: ['get', 'color'],
  circleStrokeWidth: 2,
  circleStrokeColor: '#ffffff',
  circleOpacity: 0.9,
};

const EXPLORER_SELECTED_LAYER_STYLE: CircleLayerStyle = {
  circleRadius: 13,
  circleColor: ['get', 'color'],
  circleStrokeWidth: 3,
  circleStrokeColor: '#ffffff',
  circleOpacity: 1,
};

function regionFromZoomCenter(
  latitude: number,
  longitude: number,
  zoom: number,
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } {
  const delta = 360 / 2 ** Math.max(8, zoom);
  return {
    latitude,
    longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
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
  cameraAutoFit = true,
  onMapInteractionStart,
  onMapInteractionEnd,
}: PlatformMapProps) {
  const { colors } = useTheme();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [ready, setReady] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [mapZoom, setMapZoom] = useState(10);
  const [mapCenter, setMapCenter] = useState({
    latitude: KARADENIZ_INITIAL_REGION.latitude,
    longitude: KARADENIZ_INITIAL_REGION.longitude,
  });
  const userAdjustedCamera = useRef(false);
  const lastFitKey = useRef('');
  const initialFitDone = useRef(false);
  const styleURL = useMemo(() => resolveMapboxStyle(mapStyle), [mapStyle]);

  const markersRef = useRef(markers);
  markersRef.current = markers;
  const explorersRef = useRef(explorerMarkers);
  explorersRef.current = explorerMarkers;
  const onMarkerPressRef = useRef(onMarkerPress);
  onMarkerPressRef.current = onMarkerPress;
  const onGroupPressRef = useRef(onGroupPress);
  onGroupPressRef.current = onGroupPress;
  const onExplorerPressRef = useRef(onExplorerPress);
  onExplorerPressRef.current = onExplorerPress;

  const visibleRegion = useMemo(
    () => regionFromZoomCenter(mapCenter.latitude, mapCenter.longitude, mapZoom),
    [mapCenter.latitude, mapCenter.longitude, mapZoom],
  );

  const visibleGroups = useMemo(() => {
    const precision = precisionForZoom(mapZoom);
    const grouped = groupMarkersByCell(markers, precision, selectedMarkerId);
    return cullGroupsToViewport(grouped, visibleRegion, selectedGroupId, MAP_IOS_MAX_VISIBLE_MARKERS);
  }, [markers, mapZoom, visibleRegion, selectedMarkerId, selectedGroupId]);

  const explorerShape = useMemo(() => explorersToFeatureCollection(explorerMarkers), [explorerMarkers]);

  const explorerSelectedFilter = useMemo(
    () => ['==', ['get', 'explorerId'], selectedExplorerId ?? ''] as const,
    [selectedExplorerId],
  );

  const fitKey = useMemo(
    () =>
      fitCoordinates?.length
        ? fitCoordinates.map((c) => `${c.latitude.toFixed(4)},${c.longitude.toFixed(4)}`).join('|')
        : focusCoordinate
          ? `${focusCoordinate.latitude.toFixed(4)},${focusCoordinate.longitude.toFixed(4)}`
          : '',
    [fitCoordinates, focusCoordinate],
  );

  useEffect(() => {
    setReady(ensureMapboxInitialized());
  }, []);

  useEffect(() => {
    if (!cameraRef.current || !styleLoaded) return;
    if (!cameraAutoFit) return;
    if (userAdjustedCamera.current && lastFitKey.current === fitKey) return;
    if (lastFitKey.current !== fitKey) {
      userAdjustedCamera.current = false;
    }

    if (fitCoordinates?.length) {
      const lngs = fitCoordinates.map((c) => c.longitude);
      const lats = fitCoordinates.map((c) => c.latitude);
      cameraRef.current.fitBounds(
        [Math.max(...lngs), Math.max(...lats)],
        [Math.min(...lngs), Math.min(...lats)],
        [120, 48, 240, 48],
        450,
      );
      lastFitKey.current = fitKey;
      initialFitDone.current = true;
      return;
    }

    if (!focusCoordinate) return;

    cameraRef.current.setCamera({
      centerCoordinate: [focusCoordinate.longitude, focusCoordinate.latitude],
      zoomLevel: focusCoordinate.zoom ?? 13,
      animationDuration: 450,
    });
    lastFitKey.current = fitKey;
    initialFitDone.current = true;
  }, [cameraAutoFit, fitKey, fitCoordinates, focusCoordinate, styleLoaded, routes.length]);

  const routeFeatures = useMemo(
    () =>
      routes.map((route) => ({
        id: route.id,
        shape: {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: route.coordinates.map((c) => [c.longitude, c.latitude]),
          },
        },
        color: route.color ?? '#2196F3',
        width: route.width ?? 6,
      })),
    [routes],
  );

  const handleExplorerLayerPress = useCallback((event: { features: GeoJSON.Feature[] }) => {
    const explorerId = event.features[0]?.properties?.explorerId;
    if (typeof explorerId !== 'string') return;

    const explorer = explorersRef.current.find((item) => item.id === explorerId);
    if (explorer) onExplorerPressRef.current?.(explorer);
  }, []);

  const handleCameraChanged = useCallback(
    (state: { properties?: { zoom?: number; center?: [number, number] } }) => {
      const zoom = state.properties?.zoom;
      const center = state.properties?.center;
      if (typeof zoom === 'number') setMapZoom(zoom);
      if (center?.length === 2) {
        setMapCenter({ latitude: center[1], longitude: center[0] });
      }
    },
    [],
  );

  if (!ready) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.surface }]}>
        <Text variant="h3">Mapbox yapılandırılmadı</Text>
        <Text secondary style={styles.fallbackText}>
          EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN değerini .env dosyasına ekleyin ve uygulamayı yeniden derleyin.
        </Text>
      </View>
    );
  }

  return (
    <Mapbox.MapView
      style={styles.map}
      styleURL={styleURL}
      compassEnabled={false}
      logoEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
      onDidFinishLoadingStyle={() => setStyleLoaded(true)}
      onCameraChanged={handleCameraChanged}
      onRegionIsChanging={(feature) => {
        if (!initialFitDone.current) return;
        if (feature?.properties?.isUserInteraction) {
          userAdjustedCamera.current = true;
          onMapInteractionStart?.();
        }
      }}
      onRegionDidChange={(feature) => {
        if (feature?.properties?.isUserInteraction) {
          onMapInteractionEnd?.();
        }
      }}
    >
      <Mapbox.Camera
        ref={cameraRef}
        zoomLevel={10}
        centerCoordinate={[KARADENIZ_MAP_CENTER.longitude, KARADENIZ_MAP_CENTER.latitude]}
        animationMode="flyTo"
        animationDuration={0}
      />
      {showsUserLocation ? <Mapbox.UserLocation visible /> : null}

      {routeFeatures.map((route) => (
        <Mapbox.ShapeSource key={`${route.id}-source`} id={`route-${route.id}`} shape={route.shape}>
          <Mapbox.LineLayer
            id={`route-${route.id}-outline`}
            style={{
              lineColor: '#ffffff',
              lineWidth: route.width + 3,
              lineCap: 'round',
              lineJoin: 'round',
              lineOpacity: 0.95,
            }}
          />
          <Mapbox.LineLayer
            id={`route-${route.id}-line`}
            aboveLayerID={`route-${route.id}-outline`}
            style={{
              lineColor: route.color,
              lineWidth: route.width,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </Mapbox.ShapeSource>
      ))}

      {visibleGroups.map((group) => {
        const selected = selectedGroupId === group.id || selectedMarkerId === group.representative.id;

        if (group.count <= 1) {
          const marker = group.representative;
          return (
            <Mapbox.MarkerView
              key={group.id}
              id={group.id}
              coordinate={[group.longitude, group.latitude]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <Pressable collapsable={false} onPress={() => onMarkerPressRef.current?.(marker)}>
                <MapMarkerPin marker={marker} selected={selected} />
              </Pressable>
            </Mapbox.MarkerView>
          );
        }

        return (
          <Mapbox.MarkerView
            key={group.id}
            id={group.id}
            coordinate={[group.longitude, group.latitude]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View collapsable={false}>
              <MapClusterPin
                group={group}
                selected={selected}
                onPress={() => onGroupPressRef.current?.(group)}
              />
            </View>
          </Mapbox.MarkerView>
        );
      })}

      <Mapbox.ShapeSource
        id="map-explorers"
        shape={explorerShape}
        hitbox={{ width: 32, height: 32 }}
        onPress={handleExplorerLayerPress}
      >
        <Mapbox.CircleLayer id="map-explorer-circles" style={EXPLORER_LAYER_STYLE} />
        <Mapbox.CircleLayer
          id="map-explorer-selected"
          filter={explorerSelectedFilter}
          style={EXPLORER_SELECTED_LAYER_STYLE}
        />
      </Mapbox.ShapeSource>
    </Mapbox.MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  fallbackText: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
