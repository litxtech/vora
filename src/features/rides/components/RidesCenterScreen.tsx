import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { RidesBrandHeader } from '@/features/rides/components/RidesBrandHeader';
import { RidesSupportButton, RidesSupportNote } from '@/features/rides/components/RidesSupportStrip';
import { RideTripCard } from '@/features/rides/components/RideTripCard';
import { RideSearchSheet } from '@/features/rides/components/RideSearchSheet';
import {
  POPULAR_ROUTES,
  RIDES_ACCENT,
  RIDES_PRIMARY_TABS,
  rideCityName,
  ridesCreatePath,
  ridesAccountPath,
  TAB_EMPTY_MESSAGES,
} from '@/features/rides/constants';
import { useRideTrips } from '@/features/rides/hooks/useRideTrips';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { RIDES_FEATURE } from '@/features/rides/featureFlags';
import { toggleRideFavorite } from '@/features/rides/services/favoriteData';
import type { RideFilters, RideTab, RideTrip } from '@/features/rides/types';
import { buildRideSearchSummary, EMPTY_RIDE_FILTERS, hasActiveRideFilters } from '@/features/rides/utils/searchSummary';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { resolveMarketplaceRegionId, regionNameById } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function RidesCenterScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [tab, setTab] = useState<RideTab>('discover');
  const [filters, setFilters] = useState<RideFilters>({ sort: 'departure' });
  const [searchOpen, setSearchOpen] = useState(false);

  const showCreate = useFeatureVisible(RIDES_FEATURE.section.create);
  const showAccount = useFeatureVisible(RIDES_FEATURE.section.account);
  const showSupport = useFeatureVisible('support-center');
  const showSearch = useFeatureVisible(RIDES_FEATURE.search);
  const showPopularRoutes = useFeatureVisible(RIDES_FEATURE.popularRoutes);

  const primaryTabs = useFeatureTabFilter(
    'rides',
    RIDES_PRIMARY_TABS,
    (t) => t.id !== 'favorites' || !!user,
  );

  const regionId = resolveMarketplaceRegionId(profile?.region_id);
  const regionLabel = regionNameById(regionId) ?? 'Karadeniz';
  const searchSummary = buildRideSearchSummary(filters);

  const effectiveFilters = useMemo(() => {
    if (tab === 'discover' || tab === 'ongoing') {
      return { sort: filters.sort ?? 'departure' } satisfies RideFilters;
    }
    if (tab === 'routes' && !filters.fromCityId) {
      const route = POPULAR_ROUTES[0];
      return { ...filters, fromCityId: route.from, toCityId: route.to };
    }
    return filters;
  }, [tab, filters]);

  const { trips, loading, error, refresh, setTrips } = useRideTrips(tab, regionId, user?.id ?? null, effectiveFilters);

  const handleToggleFavorite = useCallback(
    async (trip: RideTrip) => {
      if (!(await requireAuth('Favori')) || !user) return;
      const next = !trip.isFavorite;
      setTrips((prev) =>
        prev
          .map((t) => (t.id === trip.id ? { ...t, isFavorite: next } : t))
          .filter((t) => tab !== 'favorites' || t.isFavorite),
      );
      const { error: favError } = await toggleRideFavorite(user.id, trip.id, !!trip.isFavorite);
      if (favError) refresh();
    },
    [requireAuth, user, refresh, setTrips, tab],
  );

  const goCreate = async () => {
    if (!(await requireAuth('Yolculuk paylaş'))) return;
    router.push(ridesCreatePath() as never);
  };

  const goAccount = async () => {
    if (!(await requireAuth('Hesabım'))) return;
    router.push(ridesAccountPath() as never);
  };

  const clearFilters = () => {
    setFilters(EMPTY_RIDE_FILTERS);
    setTab('discover');
    refresh();
  };

  return (
    <GradientBackground>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        scrollEnabled={!searchOpen}
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.topBar}>
              <ScreenBackButton style={styles.back} />
              {showSupport ? <RidesSupportButton /> : null}
            </View>
            <RidesBrandHeader
              regionLabel={regionLabel}
              onCreate={goCreate}
              onAccount={goAccount}
              showAccount={!!user && showAccount}
              showCreate={showCreate}
            />
            {showSupport ? <RidesSupportNote /> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {primaryTabs.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={async () => {
                    if (t.id === 'discover') {
                      setFilters(EMPTY_RIDE_FILTERS);
                    }
                    setTab(t.id);
                  }}
                  style={[
                    styles.tab,
                    { borderColor: colors.border, backgroundColor: tab === t.id ? `${RIDES_ACCENT}22` : `${colors.surface}99` },
                  ]}
                >
                  <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={14} color={tab === t.id ? RIDES_ACCENT : colors.textMuted} />
                  <Text variant="caption" style={{ color: tab === t.id ? RIDES_ACCENT : colors.text, fontWeight: '700' }}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {showSearch ? (
            <Pressable
              onPress={async () => { if (tab !== 'ongoing') setSearchOpen(true); }}
              style={[styles.searchBar, { backgroundColor: `${colors.surface}CC`, borderColor: colors.border }]}
            >
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <Text secondary={!searchSummary} variant="caption" style={{ flex: 1, fontWeight: searchSummary ? '600' : '400' }} numberOfLines={1}>
                {tab === 'ongoing' ? 'Devam eden yolculuklar — rota ve yolcu sayısı' : (searchSummary ?? 'Nereden → Nereye, tarih, filtre…')}
              </Text>
              {tab !== 'ongoing' && hasActiveRideFilters(filters) ? (
                <Pressable onPress={(e) => { e.stopPropagation(); clearFilters(); }} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : tab !== 'ongoing' ? (
                <Ionicons name="options-outline" size={18} color={RIDES_ACCENT} />
              ) : (
                <Ionicons name="navigate-outline" size={18} color={RIDES_ACCENT} />
              )}
            </Pressable>
            ) : null}
            {tab === 'routes' && showPopularRoutes ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeChips}>
                {POPULAR_ROUTES.map((r) => (
                  <Pressable
                    key={`${r.from}-${r.to}`}
                    onPress={() => setFilters((f) => ({ ...f, fromCityId: r.from, toCityId: r.to }))}
                    style={[
                      styles.routeChip,
                      {
                        borderColor: filters.fromCityId === r.from ? RIDES_ACCENT : colors.border,
                        backgroundColor: filters.fromCityId === r.from ? `${RIDES_ACCENT}18` : `${colors.surface}99`,
                      },
                    ]}
                  >
                    <Text variant="caption" style={{ fontWeight: '700' }}>
                      {rideCityName(r.from)} → {rideCityName(r.to)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            {loading ? <ActivityIndicator color={RIDES_ACCENT} style={{ marginVertical: spacing.md }} /> : null}
            {error ? <Text style={{ color: colors.danger, marginBottom: spacing.sm }}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={40} color={colors.textMuted} />
              <Text secondary>{TAB_EMPTY_MESSAGES[tab] ?? 'Yolculuk bulunamadı.'}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <RideTripCard
            trip={item}
            onToggleFavorite={() => handleToggleFavorite(item)}
          />
        )}
        refreshing={loading}
        onRefresh={refresh}
      />
      <RideSearchSheet
        visible={searchOpen}
        filters={filters}
        onClose={() => setSearchOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setTab('discover');
          setSearchOpen(false);
          refresh();
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.md },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    marginBottom: spacing.xs,
  },
  back: { marginBottom: 0 },
  tabs: { gap: spacing.xs, paddingVertical: spacing.sm },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  routeChips: { gap: spacing.xs, paddingBottom: spacing.sm },
  routeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
});
