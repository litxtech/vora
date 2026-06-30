import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Text } from '@/components/ui/Text';
import { ExplorerDetailSheet } from '@/features/explorer/components/ExplorerDetailSheet';
import { EXPLORER_ACCENT_COLOR } from '@/features/explorer/constants';
import { useExplorerMarkers } from '@/features/explorer/hooks/useExplorerMarkers';
import { useExplorerMode } from '@/features/explorer/hooks/useExplorerMode';
import type { ExplorerMarker } from '@/features/explorer/types';
import { fetchFeedPostById } from '@/features/feed/services/feedData';
import { FeedPostViewer } from '@/features/feed/components/FeedPostViewer';
import type { FeedItem } from '@/features/feed/types';
import { MapControls } from '@/features/map/components/MapControls';
import { MapEmptyState } from '@/features/map/components/MapEmptyState';
import { MapDetailSheet } from '@/features/map/components/MapDetailSheet';
import { MapClusterSheet } from '@/features/map/components/MapClusterSheet';
import { MapLayerChips } from '@/features/map/components/MapLayerChips';
import { MapSearchBar } from '@/features/map/components/MapSearchBar';
import { MapSearchResults } from '@/features/map/components/MapSearchResults';
import { PlatformMap } from '@/features/map/components/PlatformMap';
import { getFloatingTabBarReserve } from '@/constants/tabBar';
import {
  DEFAULT_ENABLED_LAYERS,
  KARADENIZ_MAP_CENTER,
  MAP_LAYERS,
  MAP_SHEET_EXTRA_BOTTOM,
  NEARBY_RADIUS_KM,
} from '@/features/map/constants';
import { useMapLocation } from '@/features/map/hooks/useMapLocation';
import { useMapMarkers } from '@/features/map/hooks/useMapMarkers';
import { useMapSearch } from '@/features/map/hooks/useMapSearch';
import { navigateToMapDetail } from '@/features/map/services/mapNavigation';
import { countByLayer, filterMapMarkers } from '@/features/map/services/mapData';
import { findMarkerForSuggestion, type MapSearchHit } from '@/features/map/services/mapSearch';
import { resolvePlaceCoordinates } from '@/features/map/services/resolvePlaceCoordinates';
import { useMapStore } from '@/features/map/store/mapStore';
import type { MapLayerId, MapMarker, MarkerGroup } from '@/features/map/types';
import { filterByRadius } from '@/features/map/utils/geo';
import { useHideMapTabBar } from '@/features/map/hooks/useHideMapTabBar';
import { useStableTabBarInset } from '@/hooks/useStableTabBarInset';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useVoraAiMapSheetProps } from '@/features/vora-ai/hooks/useVoraAiMapOverlay';
import { VoraAiMapSheetHost } from '@/features/vora-ai/components/VoraAiMapSheet';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { INCIDENT_GRAPH_SLOGAN } from '@/features/incidents/constants';
import { serviceCategoryLabel, VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';

const MAP_CLUSTER_SHEET_HEIGHT = 320;
const MAP_POST_SHEET_HEIGHT = 240;
const MAP_POST_MEDIA_SHEET_HEIGHT = 340;
const MAP_HOTEL_SHEET_HEIGHT = 400;
const MAP_DEFAULT_SHEET_HEIGHT = 260;
const MAP_CONTROLS_GAP = spacing.md;

const ALL_LAYERS: MapLayerId[] = MAP_LAYERS.map((layer) => layer.id);

export function MapScreenContent() {
  useHideMapTabBar();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = useStableTabBarInset();
  const tabBarReserve = getFloatingTabBarReserve(tabBarBottomInset) + spacing.sm;
  const sheetBottomInset = Math.max(insets.bottom + spacing.md + MAP_SHEET_EXTRA_BOTTOM, tabBarReserve);
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const regionId = profile?.region_id ?? 'trabzon';
  const { granted, coords } = useMapLocation(isFocused);
  const { canOpen: voraAiCanOpen } = useVoraAiMapSheetProps(coords?.latitude, coords?.longitude);
  const [voraAiOpen, setVoraAiOpen] = useState(false);
  const incidentGraphVisible = useFeatureVisible('incident-graph');
  const openIncidentGraph = () => router.push('/incidents' as never);
  const { markers, loading, error, refresh } = useMapMarkers(isFocused);
  const { modeEnabled: explorerEnabled, toggleExplorerMode } = useExplorerMode();
  const { markers: explorerMarkers } = useExplorerMarkers(explorerEnabled && isFocused);

  const [postViewer, setPostViewer] = useState<FeedItem | null>(null);
  const [selectedExplorer, setSelectedExplorer] = useState<ExplorerMarker | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<MarkerGroup | null>(null);

  const searchQuery = useMapStore((s) => s.searchQuery);
  const enabledLayers = useMapStore((s) => s.enabledLayers);
  const selectedMarker = useMapStore((s) => s.selectedMarker);
  const focusCoordinate = useMapStore((s) => s.focusCoordinate);
  const mapStyle = useMapStore((s) => s.mapStyle);
  const nearbyEnabled = useMapStore((s) => s.nearbyEnabled);
  const hizmetlerCategoryFilter = useMapStore((s) => s.hizmetlerCategoryFilter);
  const hizmetlerRadiusKm = useMapStore((s) => s.hizmetlerRadiusKm);
  const setSearchQuery = useMapStore((s) => s.setSearchQuery);
  const setEnabledLayers = useMapStore((s) => s.setEnabledLayers);
  const clearHizmetlerMapPreset = useMapStore((s) => s.clearHizmetlerMapPreset);
  const toggleLayer = useMapStore((s) => s.toggleLayer);
  const selectMarker = useMapStore((s) => s.selectMarker);
  const focusOn = useMapStore((s) => s.focusOn);
  const cycleMapStyle = useMapStore((s) => s.cycleMapStyle);
  const toggleNearby = useMapStore((s) => s.toggleNearby);

  const nearbyFilter = useMemo(() => {
    if (!nearbyEnabled || !coords) return null;
    return {
      center: coords,
      radiusKm: hizmetlerRadiusKm ?? NEARBY_RADIUS_KM,
    };
  }, [nearbyEnabled, coords, hizmetlerRadiusKm]);

  const scopedMarkers = useMemo(() => {
    let result = filterMapMarkers(markers, enabledLayers, searchQuery, nearbyFilter);
    if (hizmetlerCategoryFilter) {
      result = result.filter(
        (marker) =>
          marker.layer !== 'vora_hizmetler' || marker.meta?.category === hizmetlerCategoryFilter,
      );
    }
    return result;
  }, [markers, enabledLayers, searchQuery, nearbyFilter, hizmetlerCategoryFilter]);

  const scopedExplorers = useMemo(() => {
    if (!explorerEnabled) return [];
    if (!nearbyFilter) return explorerMarkers;
    return filterByRadius(explorerMarkers, nearbyFilter.center, nearbyFilter.radiusKm);
  }, [explorerEnabled, explorerMarkers, nearbyFilter]);

  const layerCounts = useMemo(() => {
    const base = nearbyFilter
      ? filterMapMarkers(markers, ALL_LAYERS, '', nearbyFilter)
      : markers;
    return countByLayer(base);
  }, [markers, nearbyFilter]);

  const mapSearch = useMapSearch({
    regionId,
    markers,
    proximity: coords,
  });

  const ensureLayerVisible = (layer: MapLayerId) => {
    if (!enabledLayers.includes(layer)) {
      setEnabledLayers([...enabledLayers, layer]);
    }
  };

  const sheetVisible = Boolean(
    (selectedMarker && !selectedExplorer && !selectedGroup) || selectedExplorer || selectedGroup,
  );
  const sheetHeight = selectedGroup
    ? MAP_CLUSTER_SHEET_HEIGHT
    : selectedExplorer
    ? 200
    : selectedMarker?.layer === 'posts'
      ? selectedMarker.mediaUrls?.length
        ? MAP_POST_MEDIA_SHEET_HEIGHT
        : MAP_POST_SHEET_HEIGHT
      : selectedMarker?.layer === 'hotels'
        ? MAP_HOTEL_SHEET_HEIGHT
        : MAP_DEFAULT_SHEET_HEIGHT;
  const controlsBottom = sheetVisible
    ? sheetBottomInset + sheetHeight + MAP_CONTROLS_GAP + spacing.md * 2
    : tabBarReserve + MAP_CONTROLS_GAP;

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

  const handleMarkerPress = async (marker: MapMarker) => {
    setSelectedExplorer(null);
    setSelectedGroup(null);

    if (marker.layer === 'posts') {
      const item = await fetchFeedPostById(marker.sourceId, user?.id ?? null);
      selectMarker(
        item?.mediaUrls?.length
          ? { ...marker, mediaUrls: item.mediaUrls, description: item.content || marker.description }
          : { ...marker, description: item?.content || marker.description },
      );
    } else {
      if (marker.layer === 'hotels') {
        ensureLayerVisible('hotels');
      }
      selectMarker(marker);
    }

    focusOn(marker.latitude, marker.longitude, 15);
  };

  const handleGroupPress = (group: MarkerGroup) => {
    setSelectedExplorer(null);
    selectMarker(null);
    setPostViewer(null);
    setSelectedGroup(group);
    focusOn(group.latitude, group.longitude, 15);
  };

  const handleClusterOpenMarker = async (marker: MapMarker) => {
    setSelectedGroup(null);
    await handleMarkerPress(marker);
  };

  const handleClusterOpenDetail = (marker: MapMarker) => {
    setSelectedGroup(null);
    if (marker.layer === 'posts') {
      void openPostViewer(marker);
      return;
    }
    navigateToMapDetail(marker);
  };

  const handleExplorerPress = (explorer: ExplorerMarker) => {
    selectMarker(null);
    setSelectedGroup(null);
    setSelectedExplorer(explorer);
    focusOn(explorer.latitude, explorer.longitude, 16);
  };

  const handleFocus = (marker: MapMarker) => {
    focusOn(marker.latitude, marker.longitude, 16);
  };

  const handleOpenDetail = (marker: MapMarker) => {
    selectMarker(null);
    navigateToMapDetail(marker);
  };

  const openPostViewer = async (marker: MapMarker) => {
    const item = await fetchFeedPostById(marker.sourceId, user?.id ?? null);
    if (!item) return;
    selectMarker(null);
    setSelectedExplorer(null);
    setPostViewer(item);
  };

  const handleOpenPostCard = (marker: MapMarker) => {
    void openPostViewer(marker);
  };

  const handlePostMediaPress = (marker: MapMarker) => {
    void openPostViewer(marker);
  };

  const handleSearchHit = async (hit: MapSearchHit) => {
    mapSearch.beginResolve(hit.id);
    try {
      if (hit.kind === 'marker') {
        ensureLayerVisible(hit.marker.layer);
        setSearchQuery(hit.marker.title);
        await handleMarkerPress(hit.marker);
        return;
      }

      const suggestion = hit.suggestion;
      const existingMarker = findMarkerForSuggestion(markers, suggestion);
      if (existingMarker) {
        ensureLayerVisible(existingMarker.layer);
        setSearchQuery(existingMarker.title);
        await handleMarkerPress(existingMarker);
        return;
      }

      const resolved = await resolvePlaceCoordinates({
        label: suggestion.label,
        regionId,
        suggestionRegionId: suggestion.regionId,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        geocodeHint: suggestion.geocodeHint,
        mapboxId: suggestion.mapboxId,
        sessionToken: suggestion.sessionToken,
        source: suggestion.source,
        proximity: coords ?? undefined,
      });

      setSearchQuery(suggestion.label);
      setSelectedExplorer(null);
      selectMarker(null);

      if (resolved) {
        focusOn(resolved.latitude, resolved.longitude, 15);
      }
    } finally {
      mapSearch.endResolve();
    }
  };

  const showEmptyHint =
    !loading &&
    scopedMarkers.length === 0 &&
    !selectedMarker &&
    !selectedExplorer &&
    !mapSearch.showPanel;

  const activeIncidentCount = layerCounts.incidents ?? 0;

  return (
    <View style={styles.container}>
      {!isFocused ? (
        <View style={styles.mapPlaceholder} />
      ) : (
        <PlatformMap
          markers={scopedMarkers}
          explorerMarkers={scopedExplorers}
          selectedMarkerId={selectedMarker?.id}
          selectedGroupId={selectedGroup?.id}
          selectedExplorerId={selectedExplorer?.id}
          onMarkerPress={handleMarkerPress}
          onGroupPress={handleGroupPress}
          onExplorerPress={handleExplorerPress}
          showsUserLocation={granted}
          focusCoordinate={focusCoordinate}
          mapStyle={mapStyle}
        />
      )}

      <View style={[styles.topOverlay, { paddingTop: insets.top + spacing.sm, zIndex: 55 }]} pointerEvents="box-none">
        <MapSearchBar
          value={searchQuery}
          onChangeText={mapSearch.handleChangeQuery}
          onFocus={mapSearch.handleFocus}
          onBlur={() => {
            setTimeout(() => mapSearch.setFocused(false), 180);
          }}
          onClear={() => mapSearch.clearSearch()}
          resultCount={scopedMarkers.length}
          loading={loading}
          searching={mapSearch.loading}
          nearbyEnabled={nearbyEnabled}
          mapStyle={mapStyle}
          onCycleMapStyle={cycleMapStyle}
        />
        <MapSearchResults
          visible={mapSearch.showPanel}
          loading={mapSearch.loading}
          query={searchQuery}
          onMap={mapSearch.onMap}
          places={mapSearch.places}
          resolvingId={mapSearch.resolvingId}
          onSelect={(hit) => {
            void handleSearchHit(hit);
          }}
        />
        {(hizmetlerCategoryFilter ||
          (enabledLayers.length === 1 && enabledLayers[0] === 'vora_hizmetler')) ? (
          <Pressable
            onPress={() => {
              clearHizmetlerMapPreset();
              setEnabledLayers(DEFAULT_ENABLED_LAYERS);
            }}
            style={[styles.hizmetlerBanner, { backgroundColor: `${VORA_HIZMETLER_ACCENT}18`, borderColor: `${VORA_HIZMETLER_ACCENT}40` }]}
          >
            <Ionicons name="construct-outline" size={16} color={VORA_HIZMETLER_ACCENT} />
            <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '700', flex: 1 }}>
              Vora Hizmetler
              {hizmetlerCategoryFilter ? ` · ${serviceCategoryLabel(hizmetlerCategoryFilter)}` : ''}
              {hizmetlerRadiusKm ? ` · ${hizmetlerRadiusKm} km` : ''}
            </Text>
            <Ionicons name="close" size={14} color={VORA_HIZMETLER_ACCENT} />
          </Pressable>
        ) : null}
        <MapLayerChips
          enabledLayers={enabledLayers}
          counts={layerCounts}
          onToggle={toggleLayer}
          onLayerNavigate={
            incidentGraphVisible
              ? (layer) => {
                  if (layer === 'incidents') openIncidentGraph();
                }
              : undefined
          }
        />
        {incidentGraphVisible && activeIncidentCount > 0 ? (
          <Pressable
            onPress={openIncidentGraph}
            style={[
              styles.incidentBanner,
              { backgroundColor: colors.surfaceElevated, borderColor: `${colors.danger}66` },
            ]}
          >
            <Ionicons name="pulse" size={14} color={colors.danger} />
            <Text variant="caption" style={{ color: colors.danger, flex: 1, fontWeight: '600' }}>
              {activeIncidentCount} canlı olay — {INCIDENT_GRAPH_SLOGAN}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.danger} />
          </Pressable>
        ) : null}
        {explorerEnabled ? (
          <View
            style={[
              styles.explorerBanner,
              { backgroundColor: colors.surfaceElevated, borderColor: `${EXPLORER_ACCENT_COLOR}66` },
            ]}
          >
            <Ionicons name="walk" size={14} color={EXPLORER_ACCENT_COLOR} />
            <Text variant="caption" style={{ color: EXPLORER_ACCENT_COLOR, flex: 1 }}>
              Kaşif modu açık — diğer kullanıcılar sizi haritada görebilir
            </Text>
          </View>
        ) : null}
        {showEmptyHint ? (
          <MapEmptyState
            nearbyEnabled={nearbyEnabled}
            hasSourceData={markers.length > 0}
            searchQuery={searchQuery}
          />
        ) : null}
        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.danger }]}>
            <Text variant="caption" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.controlsRail,
          {
            bottom: controlsBottom,
            zIndex: 55,
          },
        ]}
        pointerEvents="box-none"
      >
        <MapControls
          onRecenter={handleRecenter}
          onRefresh={refresh}
          onToggleNearby={handleToggleNearby}
          onToggleExplorer={toggleExplorerMode}
          refreshing={loading}
          nearbyEnabled={nearbyEnabled}
          explorerEnabled={explorerEnabled}
          voraAiEnabled={voraAiCanOpen}
          onOpenVoraAi={() => setVoraAiOpen(true)}
          incidentGraphEnabled={incidentGraphVisible}
          onOpenIncidentGraph={openIncidentGraph}
          incidentCount={activeIncidentCount}
        />
      </View>

      <VoraAiMapSheetHost
        latitude={coords?.latitude}
        longitude={coords?.longitude}
        open={voraAiOpen}
        onClose={() => setVoraAiOpen(false)}
      />

      <MapDetailSheet
        marker={selectedMarker}
        visible={Boolean(selectedMarker && !selectedExplorer && !selectedGroup && !postViewer)}
        bottomInset={sheetBottomInset}
        userCoords={coords}
        onClose={() => selectMarker(null)}
        onFocus={handleFocus}
        onOpenDetail={handleOpenDetail}
        onOpenPostCard={handleOpenPostCard}
        onPostMediaPress={handlePostMediaPress}
      />

      <MapClusterSheet
        group={selectedGroup}
        visible={Boolean(selectedGroup && !postViewer)}
        bottomInset={sheetBottomInset}
        userCoords={coords}
        onClose={() => setSelectedGroup(null)}
        onOpenMarker={handleClusterOpenMarker}
        onOpenDetail={handleClusterOpenDetail}
      />

      <ExplorerDetailSheet
        marker={selectedExplorer}
        visible={Boolean(selectedExplorer && !postViewer)}
        bottomInset={sheetBottomInset}
        onClose={() => setSelectedExplorer(null)}
        onViewProfile={(userId) => {
          setSelectedExplorer(null);
          router.push(`/user/${userId}` as never);
        }}
      />

      <FeedPostViewer
        items={postViewer ? [postViewer] : []}
        startIndex={0}
        visible={postViewer !== null}
        title="Gönderi"
        preferDirectMediaPlayback
        onClose={() => setPostViewer(null)}
        onUpdate={(id, patch) => {
          setPostViewer((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
        }}
        onDeleted={() => setPostViewer(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#0A0E14',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.xs,
  },
  controlsRail: {
    position: 'absolute',
    right: spacing.sm,
    alignItems: 'flex-end',
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  explorerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  incidentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hizmetlerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
