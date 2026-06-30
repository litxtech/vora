import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { MapBottomSheet } from '@/features/map/components/MapBottomSheet';
import { PlatformMap } from '@/features/map/components/PlatformMap';
import { LAYER_BY_ID } from '@/features/map/constants';
import { useMapLocation } from '@/features/map/hooks/useMapLocation';
import {
  fetchMapRouteGeometry,
  formatRouteDistance,
  formatRouteDuration,
  type MapRouteGeometry,
} from '@/features/map/services/mapDirections';
import { useMapStore } from '@/features/map/store/mapStore';
import type { MapCoordinate, MapLayerId, MapMarker, MapRouteSegment } from '@/features/map/types';
import { distanceKm, formatDistance } from '@/features/map/utils/geo';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const SHEET_HEIGHT = 360;

type MetaRowData = { label: string; value: string };

function parseNumber(value?: string | string[]): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseString(value?: string | string[]): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

function parseLayer(value?: string | string[]): MapLayerId {
  const raw = parseString(value);
  if (raw && raw in LAYER_BY_ID) return raw as MapLayerId;
  return 'businesses';
}

function MetaRow({ label, value }: MetaRowData) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metaRow, { borderBottomColor: colors.border }]}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

export function MapDirectionsScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { coords, granted, loading: locationLoading } = useMapLocation();
  const [sheetVisible, setSheetVisible] = useState(true);
  const [routeGeometry, setRouteGeometry] = useState<MapRouteGeometry | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [directionsActive, setDirectionsActive] = useState(false);

  const latitude = parseNumber(params.latitude);
  const longitude = parseNumber(params.longitude);
  const label = parseString(params.label) ?? 'Hedef konum';
  const subtitle = parseString(params.subtitle);
  const layer = parseLayer(params.layer);
  const sourceId = parseString(params.sourceId) ?? 'map-directions-target';

  const destination = useMemo<MapCoordinate | null>(() => {
    if (latitude == null || longitude == null) return null;
    return { latitude, longitude };
  }, [latitude, longitude]);

  const marker = useMemo<MapMarker | null>(() => {
    if (!destination) return null;
    const layerConfig = LAYER_BY_ID[layer];
    return {
      id: `directions-${sourceId}`,
      sourceId,
      layer,
      title: label,
      subtitle,
      latitude: destination.latitude,
      longitude: destination.longitude,
    };
  }, [destination, label, layer, sourceId, subtitle]);

  const focusCoordinate = useMemo(
    () =>
      directionsActive || !destination
        ? null
        : { latitude: destination.latitude, longitude: destination.longitude, zoom: 16 },
    [destination, directionsActive],
  );

  const routes = useMemo<MapRouteSegment[]>(() => {
    if (!routeGeometry?.coordinates.length || routeGeometry.coordinates.length < 2) return [];
    return [
      {
        id: 'map-directions-route',
        coordinates: routeGeometry.coordinates,
        color: colors.primary,
        outlineColor: '#ffffff',
        width: 6,
      },
    ];
  }, [routeGeometry, colors.primary]);

  const fitCoordinates = useMemo<MapCoordinate[]>(() => {
    if (!destination) return [];
    if (directionsActive && routeGeometry?.coordinates.length) {
      return [...routeGeometry.coordinates, destination];
    }
    if (coords) return [coords, destination];
    return [destination];
  }, [destination, coords, directionsActive, routeGeometry]);

  const resolveUserCoords = useCallback(async (): Promise<MapCoordinate | null> => {
    if (coords) return coords;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Konum izni gerekli', 'Yol tarifi için konum izni vermelisiniz.');
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }, [coords]);

  const handleDirections = useCallback(async () => {
    if (!destination) return;

    setLoadingRoute(true);
    try {
      const origin = await resolveUserCoords();
      if (!origin) return;

      const geometry = await fetchMapRouteGeometry([origin, destination]);
      setRouteGeometry(geometry);
      setDirectionsActive(true);
    } finally {
      setLoadingRoute(false);
    }
  }, [destination, resolveUserCoords]);

  const handleClearDirections = useCallback(() => {
    setDirectionsActive(false);
    setRouteGeometry(null);
  }, []);

  const handleOpenMainMap = useCallback(() => {
    if (!destination) return;
    useMapStore.getState().focusOn(destination.latitude, destination.longitude, 16);
    router.push('/(tabs)/map' as never);
  }, [destination]);

  const distanceLabel = useMemo(() => {
    if (!destination || !coords) return null;
    return formatDistance(distanceKm(coords, destination));
  }, [destination, coords]);

  const sheetBottomInset = insets.bottom + spacing.sm;
  const recenterBottom = sheetVisible
    ? SHEET_HEIGHT + sheetBottomInset + spacing.lg
    : sheetBottomInset + spacing.md;

  if (!destination || !marker) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ScreenBackButton style={{ alignSelf: 'flex-start', margin: spacing.md }} />
        <Text secondary>Konum bilgisi bulunamadı</Text>
      </View>
    );
  }

  const layerConfig = LAYER_BY_ID[layer];

  return (
    <View style={styles.flex}>
      <PlatformMap
        markers={[marker]}
        selectedMarkerId={marker.id}
        showsUserLocation
        focusCoordinate={focusCoordinate}
        fitCoordinates={fitCoordinates}
        routes={routes}
        mapStyle="dark"
        onMarkerPress={() => setSheetVisible(true)}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <ScreenBackButton />
      </View>

      <Pressable
        style={[
          styles.recenter,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.border, bottom: recenterBottom },
        ]}
        onPress={handleOpenMainMap}
        accessibilityLabel="Ana haritada aç"
      >
        <Ionicons name="map-outline" size={20} color={colors.primary} />
      </Pressable>

      <MapBottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        bottomInset={sheetBottomInset}
        maxHeight={SHEET_HEIGHT}
      >
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          nestedScrollEnabled
        >
          <View style={styles.sheetHeader}>
            <View style={[styles.iconWrap, { backgroundColor: `${layerConfig.color}18` }]}>
              <Ionicons
                name={layerConfig.icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={layerConfig.color}
              />
            </View>
            <View style={styles.sheetHeaderText}>
              <Text variant="h3" style={styles.title}>
                {label}
              </Text>
              {subtitle ? (
                <Text variant="caption" secondary>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => setSheetVisible(false)}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityLabel="Kartı kapat"
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <MetaRow
            label="Koordinat"
            value={`${destination.latitude.toFixed(6)}, ${destination.longitude.toFixed(6)}`}
          />
          {distanceLabel ? <MetaRow label="Kuş uçuşu" value={distanceLabel} /> : null}
          {directionsActive && routeGeometry ? (
            <>
              <MetaRow label="Sürüş mesafesi" value={formatRouteDistance(routeGeometry.distanceKm)} />
              <MetaRow label="Tahmini süre" value={formatRouteDuration(routeGeometry.durationMinutes)} />
            </>
          ) : null}

          <View style={styles.actions}>
            {directionsActive ? (
              <Button title="Rotayı kapat" variant="outline" onPress={handleClearDirections} />
            ) : (
              <Button
                title="Yol tarifi"
                variant="outline"
                loading={loadingRoute}
                disabled={loadingRoute || locationLoading}
                onPress={() => void handleDirections()}
              />
            )}
            <Button title="Ana haritada aç" onPress={handleOpenMainMap} />
          </View>
          {!granted && !locationLoading ? (
            <Text variant="caption" secondary style={styles.hint}>
              Yol tarifi için konum izni gerekir.
            </Text>
          ) : null}
        </ScrollView>
      </MapBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: spacing.sm,
    right: spacing.sm,
  },
  recenter: {
    position: 'absolute',
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    paddingRight: spacing.lg,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeaderText: {
    flex: 1,
    gap: 2,
  },
  title: {
    lineHeight: 24,
  },
  metaRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hint: {
    textAlign: 'center',
  },
});
