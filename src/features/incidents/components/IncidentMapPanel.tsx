import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { IncidentPulseDot } from '@/features/incidents/components/IncidentPulseDot';
import { INCIDENT_ACCENT } from '@/features/incidents/constants';
import { PlatformMap } from '@/features/map/components/PlatformMap';
import { KARADENIZ_MAP_CENTER } from '@/features/map/constants';
import type { MapCoordinate, MapMarker } from '@/features/map/types';
import { radius, spacing } from '@/constants/theme';

type Props = {
  loading: boolean;
  markers: MapMarker[];
  fitCoordinates: MapCoordinate[];
  focusCoordinate: { latitude: number; longitude: number; zoom?: number } | null;
  onMarkerPress: (marker: MapMarker) => void;
  fullBleed?: boolean;
};

export function IncidentMapPanel({
  loading,
  markers,
  fitCoordinates,
  focusCoordinate,
  onMarkerPress,
  fullBleed = false,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const mapHeight = Math.max(420, Math.round(windowHeight * 0.48));

  const mapContent = loading ? (
    <View style={styles.mapLoading}>
      <ActivityIndicator color={INCIDENT_ACCENT} size="large" />
    </View>
  ) : (
    <>
      <PlatformMap
        markers={markers}
        fitCoordinates={fitCoordinates.length > 0 ? fitCoordinates : undefined}
        focusCoordinate={focusCoordinate}
        mapStyle="dark"
        scrollEnabled={false}
        zoomEnabled={false}
        showsUserLocation={false}
        clusterMarkers={false}
        cameraAutoFit
        onMarkerPress={onMarkerPress}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={styles.mapTopFade}
        pointerEvents="none"
      />
      <View style={styles.mapTopOverlay} pointerEvents="none">
        <View style={styles.mapTopPill}>
          {markers.length > 0 ? <IncidentPulseDot color="#fff" size={8} /> : null}
          <Ionicons name="map-outline" size={14} color="#fff" />
          <Text variant="caption" style={styles.mapTopText}>
            Canlı harita
          </Text>
        </View>
        {markers.length > 0 ? (
          <View style={[styles.mapCountPill, { backgroundColor: INCIDENT_ACCENT }]}>
            <Text variant="caption" style={styles.mapCountText}>
              {markers.length} pin
            </Text>
          </View>
        ) : null}
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={styles.mapBottomFade}
        pointerEvents="none"
      />
      <View style={styles.mapBottomOverlay} pointerEvents="none">
        <Text variant="caption" style={styles.mapHint}>
          {markers.length > 0
            ? 'Kaydır · Pinlere dokun'
            : 'Konumlu olay bekleniyor'}
        </Text>
      </View>
    </>
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(140).springify()}
      style={fullBleed ? styles.fullBleedWrap : undefined}
    >
      <View style={[styles.shell, { height: mapHeight }]}>
        <View style={styles.mapWrap}>{mapContent}</View>
      </View>
    </Animated.View>
  );
}

export function incidentMapFocus(fits: MapCoordinate[]) {
  if (fits.length > 0) return null;
  return { ...KARADENIZ_MAP_CENTER, zoom: 7.2 };
}

const styles = StyleSheet.create({
  fullBleedWrap: {
    marginHorizontal: -spacing.lg,
  },
  shell: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0E14',
  },
  mapTopFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 88,
  },
  mapTopOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  mapTopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  mapTopText: {
    color: '#fff',
    fontWeight: '700',
  },
  mapCountPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  mapCountText: {
    color: '#fff',
    fontWeight: '800',
  },
  mapBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
  },
  mapBottomOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.md,
  },
  mapHint: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
    textAlign: 'center',
  },
});
