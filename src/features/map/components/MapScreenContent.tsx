import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Text } from '@/components/ui/Text';
import { MapControls } from '@/features/map/components/MapControls';
import { MapEmptyState } from '@/features/map/components/MapEmptyState';
import { MapDetailSheet } from '@/features/map/components/MapDetailSheet';
import { MapLayerChips } from '@/features/map/components/MapLayerChips';
import { MapSearchBar } from '@/features/map/components/MapSearchBar';
import { PlatformMap } from '@/features/map/components/PlatformMap';
import { KARADENIZ_MAP_CENTER, NEARBY_RADIUS_KM } from '@/features/map/constants';
import { useMapLocation } from '@/features/map/hooks/useMapLocation';
import { useMapMarkers } from '@/features/map/hooks/useMapMarkers';
import { navigateToMapDetail } from '@/features/map/services/mapNavigation';
import { countByLayer, filterMapMarkers } from '@/features/map/services/mapData';
import { useMapStore } from '@/features/map/store/mapStore';
import type { MapLayerId, MapMarker } from '@/features/map/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const ALL_LAYERS: MapLayerId[] = ['incidents', 'posts', 'businesses', 'events', 'lost_found'];

export function MapScreenContent() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { granted, coords } = useMapLocation();
  const { markers, loading, error, refresh } = useMapMarkers();

  const searchQuery = useMapStore((s) => s.searchQuery);
  const enabledLayers = useMapStore((s) => s.enabledLayers);
  const selectedMarker = useMapStore((s) => s.selectedMarker);
  const focusCoordinate = useMapStore((s) => s.focusCoordinate);
  const mapStyle = useMapStore((s) => s.mapStyle);
  const nearbyEnabled = useMapStore((s) => s.nearbyEnabled);
  const setSearchQuery = useMapStore((s) => s.setSearchQuery);
  const toggleLayer = useMapStore((s) => s.toggleLayer);
  const selectMarker = useMapStore((s) => s.selectMarker);
  const focusOn = useMapStore((s) => s.focusOn);
  const cycleMapStyle = useMapStore((s) => s.cycleMapStyle);
  const toggleNearby = useMapStore((s) => s.toggleNearby);

  const nearbyFilter = useMemo(() => {
    if (!nearbyEnabled || !coords) return null;
    return { center: coords, radiusKm: NEARBY_RADIUS_KM };
  }, [nearbyEnabled, coords]);

  const scopedMarkers = useMemo(
    () => filterMapMarkers(markers, enabledLayers, searchQuery, nearbyFilter),
    [markers, enabledLayers, searchQuery, nearbyFilter],
  );

  const layerCounts = useMemo(() => {
    const base = nearbyFilter
      ? filterMapMarkers(markers, ALL_LAYERS, '', nearbyFilter)
      : markers;
    return countByLayer(base);
  }, [markers, nearbyFilter]);

  const providerLabel = Platform.OS === 'ios' ? 'Apple Maps' : 'Mapbox';
  const bottomInset = selectedMarker ? insets.bottom + 240 : insets.bottom + spacing.md;

  const handleRecenter = async () => {
    if (coords) {
      focusOn(coords.latitude, coords.longitude, 14);
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      focusOn(KARADENIZ_MAP_CENTER.latitude, KARADENIZ_MAP_CENTER.longitude, 10);
      return;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    focusOn(position.coords.latitude, position.coords.longitude, 14);
  };

  const handleToggleNearby = async () => {
    if (!nearbyEnabled && !coords) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      focusOn(position.coords.latitude, position.coords.longitude, 13);
    } else if (!nearbyEnabled && coords) {
      focusOn(coords.latitude, coords.longitude, 13);
    }
    toggleNearby();
  };

  const handleMarkerPress = (marker: MapMarker) => {
    selectMarker(marker);
    focusOn(marker.latitude, marker.longitude, 15);
  };

  const handleFocus = (marker: MapMarker) => {
    focusOn(marker.latitude, marker.longitude, 16);
  };

  const handleOpenDetail = (marker: MapMarker) => {
    navigateToMapDetail(marker);
  };

  return (
    <View style={styles.container}>
      <PlatformMap
        markers={scopedMarkers}
        selectedMarkerId={selectedMarker?.id}
        onMarkerPress={handleMarkerPress}
        showsUserLocation={granted}
        focusCoordinate={focusCoordinate}
        mapStyle={mapStyle}
      />

      <View style={[styles.topOverlay, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <MapSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          resultCount={scopedMarkers.length}
          loading={loading}
          nearbyEnabled={nearbyEnabled}
        />
        <MapLayerChips enabledLayers={enabledLayers} counts={layerCounts} onToggle={toggleLayer} />
        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.danger }]}>
            <Text variant="caption" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}
      </View>

      {!loading && scopedMarkers.length === 0 ? <MapEmptyState nearbyEnabled={nearbyEnabled} /> : null}

      <View style={[styles.sideOverlay, { bottom: bottomInset }]} pointerEvents="box-none">
        <MapControls
          onRecenter={handleRecenter}
          onRefresh={refresh}
          onToggleNearby={handleToggleNearby}
          onCycleMapStyle={cycleMapStyle}
          refreshing={loading}
          nearbyEnabled={nearbyEnabled}
          mapStyle={mapStyle}
          providerLabel={providerLabel}
        />
      </View>

      <MapDetailSheet
        marker={selectedMarker}
        userCoords={coords}
        onClose={() => selectMarker(null)}
        onFocus={handleFocus}
        onOpenDetail={handleOpenDetail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
  },
  sideOverlay: {
    position: 'absolute',
    right: spacing.md,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
