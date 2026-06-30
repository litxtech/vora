import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { PlatformMap } from '@/features/map/components/PlatformMap';
import type { MapMarker, MapRouteSegment } from '@/features/map/types';
import {
  fetchRideRouteGeometry,
  formatRouteDistance,
  formatRouteDuration,
  type RideRouteGeometry,
} from '@/features/rides/services/rideRouteDirections';
import { fetchLiveLocation, subscribeLiveLocation, upsertLiveLocation } from '@/features/rides/services/liveLocationData';
import { fetchRideTrip } from '@/features/rides/services/tripData';
import { rideCityName, RIDES_ACCENT, TRIP_STATUS_LABELS } from '@/features/rides/constants';
import {
  routeLabelFromCityIds,
  routeNodesFromCityIds,
  routeNodesFromTrip,
} from '@/features/rides/utils/rideRouteNodes';
import type { RideLiveLocation, RideTrip } from '@/features/rides/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type DraftRouteParams = {
  fromCityId: string;
  toCityId: string;
  stopCityIds: string[];
};

function parseStopsParam(stops?: string | string[]): string[] {
  const raw = Array.isArray(stops) ? stops[0] : stops;
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function paramString(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function buildWaypointMarkers(
  trip: RideTrip | null,
  draft: DraftRouteParams | null,
  nodes: { latitude: number; longitude: number }[],
): MapMarker[] {
  if (!nodes.length) return [];

  const markers: MapMarker[] = [];
  const push = (id: string, title: string, index: number) => {
    const node = nodes[index];
    if (!node) return;
    markers.push({
      id,
      sourceId: id,
      layer: 'tourism',
      title,
      latitude: node.latitude,
      longitude: node.longitude,
    });
  };

  if (trip) {
    const stops = [...(trip.stops ?? [])].sort((a, b) => a.stopOrder - b.stopOrder);
    push('ride-from', rideCityName(trip.fromCityId), 0);
    stops.forEach((stop, i) => {
      push(`ride-stop-${stop.id ?? i}`, rideCityName(stop.cityId), i + 1);
    });
    push('ride-to', rideCityName(trip.toCityId), nodes.length - 1);
    return markers;
  }

  if (draft) {
    const stopIds = draft.stopCityIds.filter((id) => id !== draft.fromCityId && id !== draft.toCityId);
    push('ride-from', rideCityName(draft.fromCityId), 0);
    stopIds.forEach((cityId, i) => push(`ride-stop-${cityId}`, rideCityName(cityId), i + 1));
    push('ride-to', rideCityName(draft.toCityId), nodes.length - 1);
  }

  return markers;
}

type RideTripMapScreenProps = {
  draft?: DraftRouteParams;
};

export function RideTripMapScreen({ draft: draftProp }: RideTripMapScreenProps = {}) {
  const params = useLocalSearchParams<{ id?: string; from?: string; to?: string; stops?: string }>();
  const tripId = paramString(params.id);
  const fromCityId = paramString(params.from);
  const toCityId = paramString(params.to);
  const stopsParam = params.stops;
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const draft: DraftRouteParams | null =
    draftProp ??
    (fromCityId && toCityId
      ? { fromCityId, toCityId, stopCityIds: parseStopsParam(stopsParam) }
      : null);

  const [trip, setTrip] = useState<RideTrip | null>(null);
  const [tripLoading, setTripLoading] = useState(Boolean(tripId && !draftProp));
  const [tripMissing, setTripMissing] = useState(false);
  const [live, setLive] = useState<RideLiveLocation | null>(null);
  const [geometry, setGeometry] = useState<RideRouteGeometry | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  const isLiveTrip = trip?.status === 'in_progress';
  const isDriver = user?.id === trip?.driverId;

  useEffect(() => {
    if (!tripId) {
      setTripLoading(false);
      return;
    }

    let active = true;
    setTripLoading(true);
    setTripMissing(false);
    void fetchRideTrip(tripId).then((result) => {
      if (!active) return;
      setTrip(result);
      setTripMissing(!result);
      setTripLoading(false);
    });

    return () => {
      active = false;
    };
  }, [tripId]);

  useEffect(() => {
    if (!tripId || !isLiveTrip) {
      setLive(null);
      return;
    }
    void fetchLiveLocation(tripId).then(setLive);
    return subscribeLiveLocation(tripId, setLive);
  }, [tripId, isLiveTrip]);

  useEffect(() => {
    if (!isDriver || !tripId || !isLiveTrip) return;

    const tick = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await upsertLiveLocation(tripId, pos.coords.latitude, pos.coords.longitude, pos.coords.heading ?? undefined);
    };

    void tick();
    intervalRef.current = setInterval(tick, 20000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDriver, tripId, isLiveTrip]);

  const routeNodes = useMemo(() => {
    if (trip) return routeNodesFromTrip(trip);
    if (draft) return routeNodesFromCityIds(draft.fromCityId, draft.toCityId, draft.stopCityIds);
    return [];
  }, [trip, draft]);

  useEffect(() => {
    if (routeNodes.length < 2) {
      setGeometry(null);
      setLoadingRoute(false);
      return;
    }

    let active = true;
    setLoadingRoute(true);
    void fetchRideRouteGeometry(routeNodes).then((result) => {
      if (active) {
        setGeometry(result);
        setLoadingRoute(false);
      }
    });

    return () => {
      active = false;
    };
  }, [routeNodes]);

  const routeLabel = useMemo(() => {
    if (trip) return `${rideCityName(trip.fromCityId)} → ${rideCityName(trip.toCityId)}`;
    if (draft) return routeLabelFromCityIds(draft.fromCityId, draft.toCityId, draft.stopCityIds);
    return 'Güzergah';
  }, [trip, draft]);

  const markers = useMemo(() => {
    const waypoints = buildWaypointMarkers(trip, draft, routeNodes);
    if (isLiveTrip && live) {
      return [
        ...waypoints.filter((m) => m.id !== 'ride-from'),
        {
          id: 'ride-driver',
          sourceId: trip?.id ?? 'driver',
          layer: 'traffic' as const,
          title: 'Sürücü',
          latitude: live.latitude,
          longitude: live.longitude,
        },
      ];
    }
    return waypoints;
  }, [trip, draft, routeNodes, isLiveTrip, live]);

  const routes = useMemo<MapRouteSegment[]>(() => {
    const coords =
      geometry?.coordinates.length && geometry.coordinates.length >= 2
        ? geometry.coordinates
        : routeNodes.length >= 2
          ? routeNodes
          : [];
    if (coords.length < 2) return [];

    return [
      {
        id: 'ride-route',
        coordinates: coords,
        color: RIDES_ACCENT,
        outlineColor: '#ffffff',
        width: 6,
      },
    ];
  }, [geometry, routeNodes]);

  const fitCoordinates = useMemo(() => {
    const coords = routeNodes.length >= 2 ? [...routeNodes] : [];
    if (isLiveTrip && live) {
      return [...coords, { latitude: live.latitude, longitude: live.longitude }];
    }
    return coords;
  }, [routeNodes, isLiveTrip, live]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/rides-center' as never);
  }, []);

  if (tripId && tripLoading && !draft) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={RIDES_ACCENT} />
      </View>
    );
  }

  if (tripId && tripMissing && !draft) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: spacing.lg, paddingTop: insets.top + spacing.md, alignItems: 'stretch' }]}>
        <ScreenBackButton style={{ marginBottom: spacing.md }} />
        <Text variant="label">Yolculuk bulunamadı</Text>
        <Pressable onPress={handleBack} style={{ marginTop: spacing.md, alignSelf: 'center' }}>
          <Text style={{ color: RIDES_ACCENT }}>Geri dön</Text>
        </Pressable>
      </View>
    );
  }

  if (routeNodes.length < 2) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: spacing.lg, paddingTop: insets.top + spacing.md, alignItems: 'stretch' }]}>
        <ScreenBackButton onPress={handleBack} style={{ marginBottom: spacing.md }} />
        <Text variant="label">Güzergah koordinatları bulunamadı</Text>
        <Pressable onPress={handleBack} style={{ marginTop: spacing.md, alignSelf: 'center' }}>
          <Text style={{ color: RIDES_ACCENT }}>Geri dön</Text>
        </Pressable>
      </View>
    );
  }

  const headerTitle = isLiveTrip ? 'Canlı yolculuk' : 'Güzergah';
  const statusLine = trip
    ? isLiveTrip
      ? live?.currentCityId
        ? `Sürücü: ${rideCityName(live.currentCityId)}`
        : 'Yolculuk devam ediyor'
      : `Durum: ${TRIP_STATUS_LABELS[trip.status] ?? trip.status} · henüz başlamadı`
    : 'Planlanan rota önizlemesi';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.mapSlot} collapsable={false}>
        <PlatformMap
          markers={markers}
          routes={routes}
          fitCoordinates={fitCoordinates}
          showsUserLocation={isLiveTrip && isDriver}
          mapStyle={isDark ? 'dark' : 'standard'}
        />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]} pointerEvents="box-none">
        <ScreenBackButton
          onPress={handleBack}
          style={[styles.backFab, { backgroundColor: colors.surface, borderColor: colors.border }]}
        />
        <View style={[styles.titlePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="caption" style={{ fontWeight: '700' }} numberOfLines={1}>
            {headerTitle}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.bottomSheet,
          { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.sheetHandle} />
        <Text variant="label" numberOfLines={2}>
          {routeLabel}
        </Text>
        <Text variant="caption" secondary>
          {statusLine}
        </Text>

        {loadingRoute && !geometry ? (
          <ActivityIndicator color={RIDES_ACCENT} style={{ marginTop: spacing.sm }} />
        ) : geometry ? (
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: `${RIDES_ACCENT}14` }]}>
              <Ionicons name="navigate-outline" size={14} color={RIDES_ACCENT} />
              <Text variant="caption" style={{ color: RIDES_ACCENT, fontWeight: '700' }}>
                {formatRouteDistance(geometry.distanceKm)}
              </Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: `${RIDES_ACCENT}14` }]}>
              <Ionicons name="time-outline" size={14} color={RIDES_ACCENT} />
              <Text variant="caption" style={{ color: RIDES_ACCENT, fontWeight: '700' }}>
                ~{formatRouteDuration(geometry.durationMinutes)}
              </Text>
            </View>
            {isLiveTrip && live?.etaMinutes != null ? (
              <View style={[styles.metaChip, { backgroundColor: `${RIDES_ACCENT}14` }]}>
                <Ionicons name="flag-outline" size={14} color={RIDES_ACCENT} />
                <Text variant="caption" style={{ color: RIDES_ACCENT, fontWeight: '700' }}>
                  Varış ~{live.etaMinutes} dk
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {!isLiveTrip ? (
          <Text variant="caption" secondary style={{ marginTop: spacing.sm }}>
            Yolculuk kalkış saatinde otomatik başlar. Başladıktan sonra bu ekranda canlı konum paylaşılır.
          </Text>
        ) : isDriver ? (
          <Text variant="caption" secondary style={{ marginTop: spacing.sm }}>
            Konumunuz onaylı yolcularla paylaşılıyor.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function LiveTripMapScreen() {
  return <RideTripMapScreen />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapSlot: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    zIndex: 20,
    elevation: 20,
  },
  backFab: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  titlePill: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bottomSheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    zIndex: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
    marginBottom: spacing.sm,
    opacity: 0.35,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
});
