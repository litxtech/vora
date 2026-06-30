import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import type { RegionId } from '@/constants/regions';
import { regionNameById } from '@/constants/regions';
import { IncidentCard } from '@/features/incidents/components/IncidentCard';
import { IncidentGraphHero } from '@/features/incidents/components/IncidentGraphHero';
import { IncidentMapHero } from '@/features/incidents/components/IncidentMapHero';
import { incidentMapFocus } from '@/features/incidents/components/IncidentMapPanel';
import { IncidentReportSheet } from '@/features/incidents/components/IncidentReportSheet';
import { IncidentSectionHeader } from '@/features/incidents/components/IncidentSectionHeader';
import { IncidentTimelineSection } from '@/features/incidents/components/IncidentTimelineSection';
import {
  INCIDENT_ACCENT,
  INCIDENT_SEVERITY,
  incidentGraphDemoEnabled,
} from '@/features/incidents/constants';
import { getDemoIncidentGraph } from '@/features/incidents/constants/demoIncidents';
import { fetchIncidentGraph } from '@/features/incidents/services/fetchIncidentGraph';
import type { IncidentGraphItem, IncidentGraphTimelineEntry } from '@/features/incidents/types';
import type { MapCoordinate, MapMarker } from '@/features/map/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortIncidents(items: IncidentGraphItem[]): IncidentGraphItem[] {
  return [...items].sort((a, b) => {
    const severityDiff = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
    if (severityDiff !== 0) return severityDiff;
    const aTime = new Date(a.latestUpdateAt ?? a.createdAt).getTime();
    const bTime = new Date(b.latestUpdateAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });
}

function toMapMarkers(items: IncidentGraphItem[]): MapMarker[] {
  return items
    .filter((item) => item.latitude != null && item.longitude != null)
    .map((item) => {
      const severity = INCIDENT_SEVERITY[item.severity] ?? INCIDENT_SEVERITY.medium;
      return {
        id: `incident-graph-${item.id}`,
        sourceId: item.id,
        layer: 'incidents' as const,
        title: item.title,
        subtitle: severity.label,
        description: item.description,
        latitude: item.latitude!,
        longitude: item.longitude!,
        createdAt: item.isDemo ? new Date().toISOString() : item.createdAt,
        isDemo: item.isDemo,
        meta: { severity: item.severity, mapColor: severity.color },
      };
    });
}

function mergeDemoIncidents(items: IncidentGraphItem[], regionId: RegionId | null): IncidentGraphItem[] {
  if (!incidentGraphDemoEnabled()) return items;
  const demo = getDemoIncidentGraph(regionId);
  const ids = new Set(items.map((item) => item.id));
  const merged = [...items, ...demo.incidents.filter((item) => !ids.has(item.id))];
  return sortIncidents(merged);
}

function initialRegionId(profileRegion?: RegionId): RegionId | null {
  if (incidentGraphDemoEnabled()) return null;
  return profileRegion ?? 'trabzon';
}

function EmptyState({ message }: { message: string }) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <GlassCard padded={false} style={styles.emptyCard}>
        <View style={[styles.emptyIcon, { backgroundColor: `${colors.danger}14` }]}>
          <Ionicons name="pulse-outline" size={28} color={colors.danger} />
        </View>
        <Text variant="label" style={styles.emptyTitle}>
          Şu an sakin
        </Text>
        <Text secondary style={styles.emptyText}>
          {message}
        </Text>
      </GlassCard>
    </Animated.View>
  );
}

function DemoPreviewBanner({ count }: { count: number }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.demoBanner, { backgroundColor: `${INCIDENT_ACCENT}14`, borderColor: `${INCIDENT_ACCENT}33` }]}>
      <Ionicons name="flask-outline" size={16} color={INCIDENT_ACCENT} />
      <Text variant="caption" style={{ color: colors.text, flex: 1 }}>
        {count} örnek olay gösteriliyor — harita ve kart düzenini test edin
      </Text>
    </View>
  );
}

export function IncidentGraphScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [regionId, setRegionId] = useState<RegionId | null>(() =>
    initialRegionId(profile?.region_id as RegionId | undefined),
  );
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidents, setIncidents] = useState<IncidentGraphItem[]>([]);
  const [timeline, setTimeline] = useState<IncidentGraphTimelineEntry[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [mapInteracting, setMapInteracting] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchIncidentGraph(regionId);
    const merged = mergeDemoIncidents(sortIncidents(data.incidents), regionId);
    const demoTimeline = incidentGraphDemoEnabled() ? getDemoIncidentGraph(regionId).timeline : [];
    const timelineIds = new Set(data.timeline.map((entry) => entry.id));
    const timeline = [...data.timeline, ...demoTimeline.filter((entry) => !timelineIds.has(entry.id))].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    setIncidents(merged);
    setTimeline(timeline);
    setActiveCount(merged.length);
  }, [regionId]);

  useEffect(() => {
    if (profile?.region_id && !regionId && !incidentGraphDemoEnabled()) {
      setRegionId(profile.region_id as RegionId);
    }
  }, [profile?.region_id, regionId]);

  useEffect(() => {
    setSeverityFilter(null);
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filteredIncidents = useMemo(() => {
    if (!severityFilter) return incidents;
    return incidents.filter((item) => item.severity === severityFilter);
  }, [incidents, severityFilter]);

  const mapMarkers = useMemo(() => toMapMarkers(incidents), [incidents]);
  const fitCoordinates = useMemo<MapCoordinate[]>(
    () =>
      mapMarkers.map((marker) => ({
        latitude: marker.latitude,
        longitude: marker.longitude,
      })),
    [mapMarkers],
  );
  const focusCoordinate = useMemo(() => incidentMapFocus(fitCoordinates), [fitCoordinates]);

  const regionLabel = regionId ? (regionNameById(regionId) ?? regionId) : 'Karadeniz Geneli';
  const demoPreviewCount = incidents.filter((item) => item.isDemo).length;
  const showDemoBanner = incidentGraphDemoEnabled() && demoPreviewCount > 0;

  const openIncident = (id: string) => {
    router.push(`/detail/incidents/${id}` as never);
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
  };

  return (
    <GradientBackground>
      <ScrollView
        nestedScrollEnabled
        scrollEnabled={!mapInteracting}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <IncidentMapHero
          loading={loading}
          markers={mapMarkers}
          fitCoordinates={fitCoordinates}
          focusCoordinate={focusCoordinate}
          onMarkerPress={(marker) => openIncident(marker.sourceId)}
          topInset={insets.top}
          regionLabel={regionLabel}
          incidents={incidents}
          regionId={regionId}
          onSelectRegion={setRegionId}
          activeSeverity={severityFilter}
          onSelectSeverity={setSeverityFilter}
          onBack={handleBack}
          onReport={() => setReportOpen(true)}
          onMapInteractionStart={() => setMapInteracting(true)}
          onMapInteractionEnd={() => setMapInteracting(false)}
        />

        <IncidentGraphHero
          activeCount={activeCount}
          timelineCount={timeline.length}
          incidents={incidents}
          compact
        />

        {showDemoBanner ? <DemoPreviewBanner count={demoPreviewCount} /> : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            <IncidentSectionHeader
              icon="list-outline"
              title="Aktif olaylar"
              subtitle={
                activeCount > 0
                  ? `${activeCount} olay — dokunarak dosyayı açın`
                  : 'Şu an takip edilen olay yok'
              }
              count={filteredIncidents.length}
            />

            {filteredIncidents.length === 0 ? (
              <EmptyState
                message={
                  severityFilter
                    ? 'Bu önem seviyesinde olay yok. Filtreyi kaldırarak tüm olayları görebilirsiniz.'
                    : 'Seçili bölgede açık veya doğrulanmış olay yok. Karadeniz Geneli filtresini deneyin.'
                }
              />
            ) : (
              <View style={styles.cardStack}>
                {filteredIncidents.map((item, index) => (
                  <IncidentCard
                    key={item.id}
                    item={item}
                    index={index}
                    onPress={() => openIncident(item.id)}
                  />
                ))}
              </View>
            )}

            {timeline.length > 0 ? (
              <>
                <IncidentSectionHeader
                  icon="time-outline"
                  title="Zaman çizelgesi"
                  subtitle="Son gelişmeler, yeniden eskiye"
                  count={timeline.length}
                />
                <IncidentTimelineSection entries={timeline} onPressEntry={openIncident} />
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <IncidentReportSheet
        visible={reportOpen}
        defaultRegionId={regionId}
        onClose={() => setReportOpen(false)}
        onSubmitted={refresh}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  center: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  cardStack: {
    gap: spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
});
