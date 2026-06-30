import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { MapBottomSheet } from '@/features/map/components/MapBottomSheet';
import { PlatformMap } from '@/features/map/components/PlatformMap';
import { useMapLocation } from '@/features/map/hooks/useMapLocation';
import {
  fetchMapRouteGeometry,
  formatRouteDistance,
  formatRouteDuration,
  type MapRouteGeometry,
} from '@/features/map/services/mapDirections';
import type { MapCoordinate, MapMarker, MapRouteSegment } from '@/features/map/types';
import { distanceKm, formatDistance } from '@/features/map/utils/geo';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { openLocationInMainMap } from '../services/locationNavigation';
import type { ChatLocationPayload, ChatLocationViewContext } from '../types';
import { formatChatLocationAddress } from '../utils';

const SHEET_HEIGHT = 360;

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

function parseRouteParams(params: Record<string, string | string[] | undefined>): {
  payload: ChatLocationPayload | null;
  context: ChatLocationViewContext;
} {
  const latitude = parseNumber(params.latitude);
  const longitude = parseNumber(params.longitude);
  if (latitude == null || longitude == null) {
    return { payload: null, context: {} };
  }

  const accuracy = parseNumber(params.accuracy);

  return {
    payload: {
      latitude,
      longitude,
      label: parseString(params.label),
      street: parseString(params.street),
      district: parseString(params.district),
      city: parseString(params.city),
      region: parseString(params.region),
      country: parseString(params.country),
      postalCode: parseString(params.postalCode),
      accuracy: accuracy ?? undefined,
    },
    context: {
      sharedAt: parseString(params.sharedAt),
      senderName: parseString(params.senderName),
    },
  };
}

function MetaRow({ label, value }: { label: string; value: string }) {
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

export function ChatLocationMapScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { coords, granted, loading: locationLoading } = useMapLocation();
  const [sheetVisible, setSheetVisible] = useState(true);
  const [routeGeometry, setRouteGeometry] = useState<MapRouteGeometry | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [directionsActive, setDirectionsActive] = useState(false);

  const { payload, context } = useMemo(() => parseRouteParams(params), [params]);

  const marker = useMemo<MapMarker | null>(() => {
    if (!payload) return null;
    return {
      id: 'chat-shared-location',
      sourceId: 'chat-shared-location',
      layer: 'posts',
      title: payload.label ?? 'Paylaşılan konum',
      subtitle: formatChatLocationAddress(payload),
      latitude: payload.latitude,
      longitude: payload.longitude,
      createdAt: context.sharedAt,
    };
  }, [payload, context.sharedAt]);

  const focusCoordinate = useMemo(
    () =>
      directionsActive || !payload
        ? null
        : { latitude: payload.latitude, longitude: payload.longitude, zoom: 16 },
    [payload, directionsActive],
  );

  const routes = useMemo<MapRouteSegment[]>(() => {
    if (!routeGeometry?.coordinates.length || routeGeometry.coordinates.length < 2) return [];
    return [
      {
        id: 'chat-location-route',
        coordinates: routeGeometry.coordinates,
        color: colors.primary,
        outlineColor: '#ffffff',
        width: 6,
      },
    ];
  }, [routeGeometry, colors.primary]);

  const fitCoordinates = useMemo<MapCoordinate[]>(() => {
    if (!payload) return [];
    if (directionsActive && routeGeometry?.coordinates.length) {
      return [...routeGeometry.coordinates, payload];
    }
    if (coords) return [coords, payload];
    return [payload];
  }, [payload, coords, directionsActive, routeGeometry]);

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
    if (!payload) return;

    setLoadingRoute(true);
    try {
      const origin = await resolveUserCoords();
      if (!origin) return;

      const geometry = await fetchMapRouteGeometry([origin, payload]);
      setRouteGeometry(geometry);
      setDirectionsActive(true);
    } finally {
      setLoadingRoute(false);
    }
  }, [payload, resolveUserCoords]);

  const handleClearDirections = useCallback(() => {
    setDirectionsActive(false);
    setRouteGeometry(null);
  }, []);

  const distanceLabel = useMemo(() => {
    if (!payload || !coords) return null;
    return formatDistance(distanceKm(coords, payload));
  }, [payload, coords]);

  const sharedAtLabel = useMemo(() => {
    if (!context.sharedAt) return null;
    return new Date(context.sharedAt).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [context.sharedAt]);

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false);
  }, []);

  const handleOpenSheet = useCallback(() => {
    setSheetVisible(true);
  }, []);

  const sheetBottomInset = insets.bottom + spacing.sm;
  const recenterBottom = sheetVisible
    ? SHEET_HEIGHT + sheetBottomInset + spacing.lg
    : sheetBottomInset + spacing.md;

  if (!payload || !marker) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ScreenBackButton style={{ alignSelf: 'flex-start', margin: spacing.md }} />
        <Text secondary>Konum bilgisi bulunamadı</Text>
      </View>
    );
  }

  const address = formatChatLocationAddress(payload);
  const title = payload.label ?? address;

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
        onMarkerPress={handleOpenSheet}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <ScreenBackButton />
      </View>

      <Pressable
        style={[
          styles.recenter,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.border, bottom: recenterBottom },
        ]}
        onPress={() => openLocationInMainMap(payload)}
        accessibilityLabel="Ana haritada aç"
      >
        <Ionicons name="map-outline" size={20} color={colors.primary} />
      </Pressable>

      <MapBottomSheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
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
            <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="location" size={22} color={colors.primary} />
            </View>
            <View style={styles.sheetHeaderText}>
              <Text variant="h3" style={styles.title}>
                {title}
              </Text>
              {address !== title ? (
                <Text variant="caption" secondary>
                  {address}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={handleCloseSheet}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityLabel="Kartı kapat"
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <MetaRow
            label="Koordinat"
            value={`${payload.latitude.toFixed(6)}, ${payload.longitude.toFixed(6)}`}
          />
          {payload.street ? <MetaRow label="Sokak" value={payload.street} /> : null}
          {payload.district ? <MetaRow label="İlçe" value={payload.district} /> : null}
          {payload.city ? <MetaRow label="Şehir" value={payload.city} /> : null}
          {payload.region ? <MetaRow label="Bölge" value={payload.region} /> : null}
          {payload.country ? <MetaRow label="Ülke" value={payload.country} /> : null}
          {payload.postalCode ? <MetaRow label="Posta kodu" value={payload.postalCode} /> : null}
          {payload.accuracy != null ? (
            <MetaRow label="Doğruluk" value={`±${Math.round(payload.accuracy)} m`} />
          ) : null}
          {distanceLabel ? <MetaRow label="Kuş uçuşu" value={distanceLabel} /> : null}
          {directionsActive && routeGeometry ? (
            <>
              <MetaRow label="Sürüş mesafesi" value={formatRouteDistance(routeGeometry.distanceKm)} />
              <MetaRow label="Tahmini süre" value={formatRouteDuration(routeGeometry.durationMinutes)} />
            </>
          ) : null}
          {context.senderName ? <MetaRow label="Paylaşan" value={context.senderName} /> : null}
          {sharedAtLabel ? <MetaRow label="Paylaşım zamanı" value={sharedAtLabel} /> : null}

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
            <Button title="Ana haritada aç" onPress={() => openLocationInMainMap(payload)} />
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
