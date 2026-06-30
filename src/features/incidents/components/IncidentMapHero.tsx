import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { IncidentPulseDot } from '@/features/incidents/components/IncidentPulseDot';
import { IncidentRegionChips } from '@/features/incidents/components/IncidentRegionChips';
import { IncidentSeverityStrip } from '@/features/incidents/components/IncidentSeverityStrip';
import { INCIDENT_ACCENT, INCIDENT_GRAPH_TITLE } from '@/features/incidents/constants';
import { PlatformMap } from '@/features/map/components/PlatformMap';
import type { RegionId } from '@/constants/regions';
import type { IncidentGraphItem } from '@/features/incidents/types';
import type { MapCoordinate, MapMarker } from '@/features/map/types';
import { radius, spacing } from '@/constants/theme';

type Props = {
  loading: boolean;
  markers: MapMarker[];
  fitCoordinates: MapCoordinate[];
  focusCoordinate: { latitude: number; longitude: number; zoom?: number } | null;
  onMarkerPress: (marker: MapMarker) => void;
  topInset: number;
  regionLabel: string;
  incidents: IncidentGraphItem[];
  regionId: RegionId | null;
  onSelectRegion: (regionId: RegionId | null) => void;
  activeSeverity: string | null;
  onSelectSeverity: (severity: string | null) => void;
  onBack: () => void;
  onReport: () => void;
  onMapInteractionStart?: () => void;
  onMapInteractionEnd?: () => void;
};

/** Canlı Nabız'ın tepeye sabitlenen, kenarlara taşan haritası — tüm göstergeler harita içinde. */
export function IncidentMapHero({
  loading,
  markers,
  fitCoordinates,
  focusCoordinate,
  onMarkerPress,
  topInset,
  regionLabel,
  incidents,
  regionId,
  onSelectRegion,
  activeSeverity,
  onSelectSeverity,
  onBack,
  onReport,
  onMapInteractionStart,
  onMapInteractionEnd,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const mapHeight = topInset + Math.max(460, Math.round(windowHeight * 0.56));

  return (
    <View style={[styles.wrap, { height: mapHeight, marginTop: -(topInset + spacing.sm) }]}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={INCIDENT_ACCENT} size="large" />
        </View>
      ) : (
        <PlatformMap
          markers={markers}
          fitCoordinates={fitCoordinates.length > 0 ? fitCoordinates : undefined}
          focusCoordinate={focusCoordinate}
          mapStyle="dark"
          scrollEnabled
          zoomEnabled
          showsUserLocation={false}
          clusterMarkers={false}
          cameraAutoFit
          onMarkerPress={onMarkerPress}
          onMapInteractionStart={onMapInteractionStart}
          onMapInteractionEnd={onMapInteractionEnd}
        />
      )}

      <LinearGradient
        colors={['rgba(5,8,12,0.78)', 'transparent']}
        style={[styles.topFade, { height: topInset + 120 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(5,8,12,0.55)', 'rgba(5,8,12,0.92)']}
        style={styles.bottomFade}
        pointerEvents="none"
      />

      {/* Üst bar — geri, başlık, pin sayısı */}
      <View style={[styles.topBar, { top: topInset + spacing.xs }]}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.glassCircle}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            {markers.length > 0 ? <IncidentPulseDot color="#fff" size={8} /> : null}
            <Text variant="label" style={styles.title}>
              {INCIDENT_GRAPH_TITLE}
            </Text>
          </View>
          <Text variant="caption" numberOfLines={1} style={styles.regionLabel}>
            {regionLabel}
          </Text>
        </View>

        <View style={[styles.countPill, { backgroundColor: markers.length > 0 ? INCIDENT_ACCENT : 'rgba(10,14,20,0.55)' }]}>
          <Ionicons name="location" size={13} color="#fff" />
          <Text variant="caption" style={styles.countText}>
            {markers.length}
          </Text>
        </View>
      </View>

      {/* Alt göstergeler — bölge + önem filtreleri ve paylaş */}
      <View style={styles.controls}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.controlRow}>
          <IncidentRegionChips regionId={regionId} onSelect={onSelectRegion} overlay />
        </Animated.View>
        <Animated.View entering={FadeIn.duration(300)} style={styles.controlRow}>
          <IncidentSeverityStrip
            incidents={incidents}
            activeSeverity={activeSeverity}
            onSelect={onSelectSeverity}
            overlay
          />
        </Animated.View>

        <Pressable onPress={onReport} style={styles.reportBtn}>
          <Ionicons name="add-circle" size={17} color="#fff" />
          <Text variant="caption" style={styles.reportBtnText}>
            Olay Bildir
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: -spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0A0E14',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0E14',
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
  topBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  glassCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(10,14,20,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#fff',
    fontWeight: '800',
  },
  regionLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '600',
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    minWidth: 40,
    justifyContent: 'center',
  },
  countText: {
    color: '#fff',
    fontWeight: '800',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md,
    gap: spacing.xs,
  },
  controlRow: {
    paddingHorizontal: spacing.lg,
  },
  reportBtn: {
    alignSelf: 'flex-end',
    marginRight: spacing.lg,
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: INCIDENT_ACCENT,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    shadowColor: INCIDENT_ACCENT,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  reportBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
});
