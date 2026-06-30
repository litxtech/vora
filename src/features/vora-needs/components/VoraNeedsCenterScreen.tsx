import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { VORA_NEEDS_FEATURE } from '@/features/vora-needs/featureFlags';
import { VoraNeedCard } from '@/features/vora-needs/components/VoraNeedCard';
import { VoraNeedFilterSheet } from '@/features/vora-needs/components/VoraNeedFilterSheet';
import { VoraNeedTabBar } from '@/features/vora-needs/components/VoraNeedTabBar';
import { VoraNeedsBrandHeader } from '@/features/vora-needs/components/VoraNeedsBrandHeader';
import {
  VORA_NEEDS_ACCENT,
  VORA_NEED_FEED_TABS,
  VORA_NEED_TAB_EMPTY_MESSAGES,
} from '@/features/vora-needs/constants';
import { useVoraNeedsFeed } from '@/features/vora-needs/hooks/useVoraNeedsFeed';
import { toggleVoraNeedFavorite } from '@/features/vora-needs/services/needData';
import type { VoraNeedFeedFilters, VoraNeedFeedTab, VoraNeedListing } from '@/features/vora-needs/types';
import { regionNameById } from '@/constants/regions';
import { spacing } from '@/constants/theme';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';

export function VoraNeedsCenterScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [tab, setTab] = useState<VoraNeedFeedTab>('all');
  const [filters, setFilters] = useState<VoraNeedFeedFilters>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeFilters = useMemo(
    () => ({ ...filters, query: debouncedQuery || undefined }),
    [filters, debouncedQuery],
  );

  const { listings, loading, loadingMore, hasMore, error, refresh, loadMore } = useVoraNeedsFeed(
    tab,
    profile?.region_id ?? null,
    user?.id ?? null,
    activeFilters,
  );

  const showCreate = useFeatureVisible(VORA_NEEDS_FEATURE.section.create);
  const showSearch = useFeatureVisible(VORA_NEEDS_FEATURE.search);
  const showFilter = useFeatureVisible(VORA_NEEDS_FEATURE.filter);
  const showCardFavorite = useFeatureVisible(VORA_NEEDS_FEATURE.cardFavorite);

  const visibleTabs = useFeatureTabFilter(
    'vora-needs',
    VORA_NEED_FEED_TABS,
    (t) => (t.id !== 'mine' && t.id !== 'favorites') || !!user,
  );

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0]?.id ?? 'all');
    }
  }, [visibleTabs, tab]);

  const regionLabel = regionNameById(profile?.region_id ?? 'trabzon') ?? 'Bölgeniz';
  const hasActiveFilters = !!(filters.category || filters.visibility || filters.urgentOnly);
  const isSearching = debouncedQuery.length >= 2;
  const listPerf = getAndroidFlatListPerfProps();

  const handleCreate = useCallback(async () => {
    if (!(await requireAuth('İlan oluşturma'))) return;
    router.push('/vora-needs-center/create' as never);
  }, [requireAuth]);

  const handleFavorite = useCallback(
    async (listing: VoraNeedListing) => {
      if (!user?.id) {
        if (!(await requireAuth('Favorilere ekleme'))) return;
        return;
      }
      await toggleVoraNeedFavorite(listing.id, user.id, listing.isFavorited ?? false);
      refresh();
    },
    [user?.id, requireAuth, refresh],
  );

  const renderItem = useCallback(
    ({ item }: { item: VoraNeedListing }) => (
      <VoraNeedCard
        listing={item}
        onToggleFavorite={showCardFavorite ? handleFavorite : undefined}
      />
    ),
    [handleFavorite, showCardFavorite],
  );

  const keyExtractor = useCallback((item: VoraNeedListing) => item.id, []);

  const listHeader = (
    <View style={styles.headerBlock}>
      <ScreenBackButton style={styles.back} />
      <VoraNeedsBrandHeader regionLabel={regionLabel} onCreate={handleCreate} showCreate={showCreate} />

      {showSearch ? (
      <View style={[styles.searchRow, { borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="İlan ara…"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      ) : null}

      {showSearch && isSearching ? (
        <Text secondary variant="caption">
          “{debouncedQuery}” için {listings.length} sonuç
        </Text>
      ) : null}

      <View style={styles.toolbar}>
        <View style={styles.tabWrap}>
          <VoraNeedTabBar value={tab} onChange={setTab} tabs={visibleTabs} />
        </View>
        {showFilter ? (
        <Pressable
          onPress={() => setFilterOpen(true)}
          style={[
            styles.filterBtn,
            {
              borderColor: hasActiveFilters ? VORA_NEEDS_ACCENT : colors.border,
              backgroundColor: hasActiveFilters ? `${VORA_NEEDS_ACCENT}14` : `${colors.surface}AA`,
            },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={hasActiveFilters ? VORA_NEEDS_ACCENT : colors.textMuted}
          />
        </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={[styles.errorBox, { borderColor: colors.danger }]}>
          <Text variant="caption" style={{ color: colors.danger }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const listEmpty = !loading ? (
    <View style={styles.empty}>
      <Ionicons name="hand-left-outline" size={36} color={colors.textMuted} />
      <Text secondary style={styles.emptyText}>
        {isSearching
          ? `“${debouncedQuery}” ile eşleşen ilan bulunamadı.`
          : (VORA_NEED_TAB_EMPTY_MESSAGES[tab] ?? 'Bu sekmede ilan bulunamadı.')}
      </Text>
      {showCreate ? (
      <Pressable onPress={handleCreate} style={[styles.emptyCta, { backgroundColor: VORA_NEEDS_ACCENT }]}>
        <Text variant="label" style={styles.emptyCtaText}>
          İhtiyaç Paylaş
        </Text>
      </Pressable>
      ) : null}
    </View>
  ) : null;

  return (
    <GradientBackground>
      <FlatList
        data={listings}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={VORA_NEEDS_ACCENT} style={styles.footerLoader} />
          ) : null
        }
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
          listings.length === 0 && styles.pageEmpty,
        ]}
        refreshControl={
          <AppRefreshControl refreshing={loading && listings.length > 0} onRefresh={refresh} tintColor={VORA_NEEDS_ACCENT} />
        }
        onEndReached={() => {
          if (hasMore && !loadingMore) loadMore();
        }}
        onEndReachedThreshold={0.35}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!filterOpen}
        {...listPerf}
      />

      <VoraNeedFilterSheet
        visible={filterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  pageEmpty: {
    flexGrow: 1,
  },
  headerBlock: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  back: {
    marginBottom: spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tabWrap: {
    flex: 1,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCta: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 999,
  },
  emptyCtaText: {
    color: '#fff',
    fontWeight: '700',
  },
  footerLoader: {
    paddingVertical: spacing.lg,
  },
});
