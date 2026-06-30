import { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { EventCard } from '@/features/events/components/EventCard';
import { FeaturedEventsCarousel } from '@/features/feed/components/FeaturedEventsCarousel';
import { EVENT_CENTER_DEF, EVENT_TABS, isEventLiveNow } from '@/features/events/constants';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { EVENT_FEATURE } from '@/features/events/featureFlags';
import { useEventTab } from '@/features/events/hooks/useEventTab';
import type { EventListing, EventTab } from '@/features/events/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function EventHeroBanner({ onCreate, showCreate = true }: { onCreate: () => void; showCreate?: boolean }) {
  const { colors, isDark } = useTheme();
  const accent = EVENT_CENTER_DEF.accent;

  return (
    <LinearGradient
      colors={
        isDark
          ? ([`${accent}44`, `${accent}18`, 'transparent'] as const)
          : ([`${accent}33`, `${accent}12`, 'transparent'] as const)
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroBanner}
    >
      <View style={styles.heroContent}>
        <View style={[styles.heroIcon, { backgroundColor: `${accent}22` }]}>
          <Ionicons name="calendar" size={28} color={accent} />
        </View>
        <View style={styles.heroText}>
          <Text variant="h2" style={{ color: colors.text }}>
            Etkinlik Merkezi
          </Text>
          <Text secondary variant="caption">
            Konserden festivale — bölgenizdeki tüm etkinlikler
          </Text>
        </View>
      </View>
      {showCreate ? (
        <Pressable
          onPress={onCreate}
          style={({ pressed }) => [
            styles.createFab,
            { backgroundColor: accent, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
            Oluştur
          </Text>
        </Pressable>
      ) : null}
    </LinearGradient>
  );
}

function TabPill({
  id,
  label,
  icon,
  active,
  onPress,
}: {
  id: EventTab;
  label: string;
  icon: string;
  active: boolean;
  onPress: (id: EventTab) => void;
}) {
  const { colors } = useTheme();
  const accent = EVENT_CENTER_DEF.accent;

  return (
    <Pressable
      onPress={() => onPress(id)}
      style={[
        styles.tab,
        {
          backgroundColor: active ? `${accent}18` : colors.surface,
          borderColor: active ? accent : colors.border,
        },
      ]}
    >
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={15}
        color={active ? accent : colors.textMuted}
      />
      <Text
        variant="caption"
        style={{
          color: active ? accent : colors.textSecondary,
          fontWeight: active ? '700' : '400',
        }}
      >
        {label}
      </Text>
      {active ? <View style={[styles.tabIndicator, { backgroundColor: accent }]} /> : null}
    </Pressable>
  );
}

function SectionHeader({ title, count, accent }: { title: string; count?: number; accent?: string }) {
  const { colors } = useTheme();
  const tone = accent ?? EVENT_CENTER_DEF.accent;

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionAccent, { backgroundColor: tone }]} />
        <Text variant="label">{title}</Text>
        {count != null && count > 0 ? (
          <View style={[styles.countBadge, { backgroundColor: `${tone}18` }]}>
            <Text variant="caption" style={{ color: tone, fontWeight: '700' }}>
              {count}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function groupEvents(events: EventListing[]) {
  const live = events.filter((e) => isEventLiveNow(e.startsAt, e.endsAt));
  const featured = events.filter(
    (e) => !isEventLiveNow(e.startsAt, e.endsAt) && (e.isFeatured || e.isSponsored),
  );
  const rest = events.filter(
    (e) => !isEventLiveNow(e.startsAt, e.endsAt) && !e.isFeatured && !e.isSponsored,
  );
  return { live, featured, rest };
}

type EventRow =
  | { type: 'carousel'; key: string; events: EventListing[] }
  | { type: 'section'; key: string; title: string; count: number; accent?: string }
  | { type: 'event'; key: string; event: EventListing };

function buildEventRows(
  live: EventListing[],
  featured: EventListing[],
  rest: EventListing[],
  tab: EventTab,
  includeFeaturedCarousel: boolean,
): EventRow[] {
  const rows: EventRow[] = [];

  if (includeFeaturedCarousel && tab === 'upcoming' && featured.length > 0) {
    rows.push({ type: 'carousel', key: 'carousel', events: featured });
  }

  if (live.length > 0) {
    rows.push({ type: 'section', key: 'sec-live', title: 'Şu An Canlı', count: live.length, accent: '#FF3B30' });
    for (const event of live) rows.push({ type: 'event', key: event.id, event });
  }

  if (rest.length > 0) {
    rows.push({
      type: 'section',
      key: 'sec-rest',
      title: tab === 'nearby' ? 'Yakınındaki Etkinlikler' : 'Yaklaşan Etkinlikler',
      count: rest.length,
    });
    for (const event of rest) rows.push({ type: 'event', key: event.id, event });
  }

  if (live.length === 0 && rest.length === 0 && featured.length > 0) {
    for (const event of featured) rows.push({ type: 'event', key: `f-${event.id}`, event });
  }

  return rows;
}

export function EventCenterScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [tab, setTab] = useState<EventTab>('upcoming');

  const { events, loading, error, refresh } = useEventTab(
    tab,
    profile?.region_id ?? null,
    user?.id ?? null,
  );

  const { live, featured, rest } = useMemo(() => groupEvents(events), [events]);

  const visibleTabs = useFeatureTabFilter(
    'event-center',
    EVENT_TABS,
    (t) => !['mine', 'attending', 'following'].includes(t.id) || !!user,
  );
  const showCreate = useFeatureVisible(EVENT_FEATURE.section.create);
  const showFeaturedCarousel = useFeatureVisible(EVENT_FEATURE.featuredCarousel);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0]?.id ?? 'upcoming');
    }
  }, [visibleTabs, tab]);

  const handleCreate = async () => {
    if (!(await requireAuth('Etkinlik oluşturma'))) return;
    router.push('/event-center/create' as never);
  };

  const rows = useMemo(
    () => buildEventRows(live, featured, rest, tab, showFeaturedCarousel),
    [live, featured, rest, tab, showFeaturedCarousel],
  );

  const listEmpty = (() => {
    if (loading && events.length === 0) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={EVENT_CENTER_DEF.accent} size="large" />
          <Text secondary variant="caption">
            Etkinlikler yükleniyor...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <GlassCard style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.textMuted} />
          <Text secondary>{error}</Text>
          <Pressable onPress={refresh} style={[styles.retryBtn, { borderColor: EVENT_CENTER_DEF.accent }]}>
            <Text variant="caption" style={{ color: EVENT_CENTER_DEF.accent, fontWeight: '600' }}>
              Yenile
            </Text>
          </Pressable>
        </GlassCard>
      );
    }

    return (
      <GlassCard style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: `${EVENT_CENTER_DEF.accent}14` }]}>
          <Ionicons name="calendar-outline" size={36} color={EVENT_CENTER_DEF.accent} />
        </View>
        <Text variant="label">Etkinlik bulunamadı</Text>
        <Text secondary variant="caption" style={styles.emptyHint}>
          Bu sekmede henüz etkinlik yok. Yakında yeni etkinlikler eklenecek.
        </Text>
        {tab === 'mine' && showCreate ? (
          <Pressable onPress={handleCreate} style={[styles.emptyCta, { backgroundColor: EVENT_CENTER_DEF.accent }]}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
              Etkinlik Oluştur
            </Text>
          </Pressable>
        ) : null}
      </GlassCard>
    );
  })();

  const renderRow = ({ item }: { item: EventRow }) => {
    if (item.type === 'carousel') {
      return <FeaturedEventsCarousel title="Öne Çıkanlar" events={item.events} />;
    }
    if (item.type === 'section') {
      return <SectionHeader title={item.title} count={item.count} accent={item.accent} />;
    }
    return <EventCard event={item.event} />;
  };

  return (
    <GradientBackground>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={EVENT_CENTER_DEF.accent} />
        }
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        removeClippedSubviews={false}
        windowSize={9}
        maxToRenderPerBatch={8}
        initialNumToRender={8}
        ListEmptyComponent={listEmpty}
        ListHeaderComponent={
          <>
            {user ? (
              <EventHeroBanner onCreate={handleCreate} showCreate={showCreate} />
            ) : (
              <View style={styles.guestHeader}>
                <Text variant="h2">Etkinlik Merkezi</Text>
                <Text secondary variant="caption">
                  Konserden festivale — bölgenizdeki tüm etkinlikler
                </Text>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBar}
            >
              {visibleTabs.map((t) => (
                <TabPill
                  key={t.id}
                  id={t.id}
                  label={t.label}
                  icon={t.icon}
                  active={tab === t.id}
                  onPress={setTab}
                />
              ))}
            </ScrollView>
          </>
        }
        renderItem={renderRow}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  heroBanner: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  createFab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  guestHeader: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  tabBar: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
    height: 2,
    borderRadius: 1,
  },
  list: {
    gap: spacing.md,
  },
  sectionHeader: {
    marginTop: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  center: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
