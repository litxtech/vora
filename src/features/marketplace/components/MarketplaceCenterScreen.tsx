import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { MarketplaceBrandHeader } from '@/features/marketplace/components/MarketplaceBrandHeader';
import { MarketplaceCategorySheet } from '@/features/marketplace/components/MarketplaceCategorySheet';
import { MarketplaceGridCard } from '@/features/marketplace/components/MarketplaceGridCard';
import { MarketplaceFilterSheet } from '@/features/marketplace/components/MarketplaceFilterSheet';
import { MarketplaceSearchSheet } from '@/features/marketplace/components/MarketplaceSearchSheet';
import {
  MARKETPLACE_ACCENT,
  CATEGORY_DEFS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_PRIMARY_TABS,
  MARKETPLACE_SORT_OPTIONS,
  marketplaceAccountPath,
  TAB_EMPTY_MESSAGES,
} from '@/features/marketplace/constants';
import { useMarketplaceListings } from '@/features/marketplace/hooks/useMarketplaceListings';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { MARKETPLACE_FEATURE } from '@/features/marketplace/featureFlags';
import { toggleMarketplaceFavorite } from '@/features/marketplace/services/favoriteData';
import type { MarketplaceCategory, MarketplaceFilters, MarketplaceListing, MarketplaceTab } from '@/features/marketplace/types';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { resolveMarketplaceRegionId, regionNameById } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { getAndroidFlatListPerfProps, getMarketplaceGridColumns } from '@/lib/device/androidPerfProfile';

export function MarketplaceCenterScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [tab, setTab] = useState<MarketplaceTab>('discover');
  const [filters, setFilters] = useState<MarketplaceFilters>({ sort: 'favorites' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MarketplaceListing[]>([]);
  const [searchActive, setSearchActive] = useState(false);

  const primaryTabs = useFeatureTabFilter(
    'marketplace',
    MARKETPLACE_PRIMARY_TABS,
    (t) => t.id !== 'favorites' || !!user,
  );
  const showCreate = useFeatureVisible(MARKETPLACE_FEATURE.section.create);
  const showSearch = useFeatureVisible(MARKETPLACE_FEATURE.search);
  const showFilter = useFeatureVisible(MARKETPLACE_FEATURE.filter);
  const showCategoryPicker = useFeatureVisible(MARKETPLACE_FEATURE.categoryPicker);
  const showAccountShortcut = useFeatureVisible(MARKETPLACE_FEATURE.accountShortcut);

  const marketplaceRegionId = resolveMarketplaceRegionId(profile?.region_id);
  const regionLabel = regionNameById(marketplaceRegionId);

  const { listings, loading, loadingMore, hasMore, error, refresh, loadMore } = useMarketplaceListings(
    tab,
    marketplaceRegionId,
    user?.id ?? null,
    filters,
  );

  const gridColumns = getMarketplaceGridColumns();
  const listPerf = getAndroidFlatListPerfProps();

  const displayListings = searchActive && searchQuery.length >= 2 ? searchResults : listings;

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.minPrice != null || filters.maxPrice != null) n++;
    if (filters.condition) n++;
    if (filters.listingType) n++;
    if (filters.category) n++;
    if (filters.radiusKm) n++;
    if (filters.businessOnly) n++;
    if (filters.sort && filters.sort !== 'favorites') n++;
    return n;
  }, [filters]);

  const isCategoryActive = !!filters.category;
  const activeCategoryLabel = filters.category ? CATEGORY_DEFS[filters.category].label : null;

  const resetSearch = useCallback(() => {
    setSearchActive(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  }, []);

  const selectTab = useCallback(
    (next: MarketplaceTab) => {
      resetSearch();
      setTab(next);
      setFilters((f) => ({ ...f, category: null }));
    },
    [resetSearch],
  );

  const selectCategory = useCallback(
    (category: MarketplaceCategory) => {
      resetSearch();
      setTab('discover');
      setFilters((f) => ({ ...f, category }));
      setCategoryOpen(false);
    },
    [resetSearch],
  );

  const handleSearchApplied = useCallback((query: string, results: MarketplaceListing[]) => {
    setSearchQuery(query);
    setSearchResults(results);
    setSearchActive(true);
    setSearchOpen(false);
  }, []);

  const handleToggleFavorite = useCallback(
    async (listing: MarketplaceListing) => {
      if (!(await requireAuth('Favori')) || !user) return;
      await toggleMarketplaceFavorite(user.id, listing.id, !!listing.isFavorite);
      void refresh(true);
    },
    [requireAuth, user, refresh],
  );

  const renderListing = useCallback(
    ({ item }: { item: MarketplaceListing }) => (
      <MarketplaceGridCard listing={item} onToggleFavorite={() => handleToggleFavorite(item)} />
    ),
    [handleToggleFavorite],
  );

  const listingKey = useCallback((item: MarketplaceListing) => item.id, []);

  const goCreate = async () => {
    if (!(await requireAuth('İlan verme'))) return;
    router.push('/marketplace-center/create' as never);
  };

  const goAccount = async () => {
    if (!(await requireAuth('Hesabım'))) return;
    router.push(marketplaceAccountPath() as never);
  };

  const sortLabel = MARKETPLACE_SORT_OPTIONS.find((o) => o.id === (filters.sort ?? 'favorites'))?.label;

  return (
    <GradientBackground>
      <FlatList
        data={displayListings}
        keyExtractor={listingKey}
        renderItem={renderListing}
        numColumns={gridColumns}
        key={`marketplace-grid-${gridColumns}`}
        columnWrapperStyle={gridColumns > 1 ? styles.column : undefined}
        scrollEnabled={!categoryOpen && !filterOpen && !searchOpen}
        onEndReached={() => {
          if (!searchActive && hasMore) loadMore();
        }}
        onEndReachedThreshold={0.35}
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <ScreenBackButton style={styles.back} />
            <MarketplaceBrandHeader
              regionLabel={regionLabel}
              onCreate={goCreate}
              onAccount={goAccount}
              showAccount={!!user && showAccountShortcut}
              showCreate={showCreate}
            />

            {showSearch || showFilter ? (
            <View style={styles.searchRow}>
              {showSearch ? (
              <Pressable
                style={[styles.searchBar, { backgroundColor: `${colors.surface}CC`, borderColor: colors.border }]}
                onPress={() => setSearchOpen(true)}
              >
                <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                <Text secondary variant="caption" style={{ flex: 1 }}>
                  {searchQuery || 'Ürün veya kategori ara'}
                </Text>
              </Pressable>
              ) : null}
              {showFilter ? (
              <Pressable
                style={[styles.filterBtn, { borderColor: colors.border, backgroundColor: `${colors.surface}AA` }]}
                onPress={() => setFilterOpen(true)}
              >
                <Ionicons name="options-outline" size={20} color={colors.text} />
                {activeFilterCount > 0 ? (
                  <View style={[styles.filterBadge, { backgroundColor: MARKETPLACE_ACCENT }]}>
                    <Text variant="caption" style={styles.filterBadgeText}>
                      {activeFilterCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              ) : null}
            </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {primaryTabs.map((t) => {
                const active = tab === t.id && !searchActive;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => selectTab(t.id)}
                    style={[
                      styles.tab,
                      active
                        ? { backgroundColor: MARKETPLACE_ACCENT }
                        : { backgroundColor: `${colors.surface}AA`, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons
                      name={t.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={active ? '#fff' : MARKETPLACE_ACCENT}
                    />
                    <Text variant="caption" style={{ color: active ? '#fff' : colors.text, fontWeight: '700' }}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}

              {showCategoryPicker ? (
              <Pressable
                onPress={() => setCategoryOpen(true)}
                style={[
                  styles.tab,
                  isCategoryActive && !searchActive
                    ? { backgroundColor: MARKETPLACE_ACCENT }
                    : { backgroundColor: `${colors.surface}AA`, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="grid-outline"
                  size={14}
                  color={isCategoryActive && !searchActive ? '#fff' : MARKETPLACE_ACCENT}
                />
                <Text
                  variant="caption"
                  style={{
                    color: isCategoryActive && !searchActive ? '#fff' : colors.text,
                    fontWeight: '700',
                  }}
                >
                  {isCategoryActive && activeCategoryLabel ? activeCategoryLabel : 'Kategoriler'}
                </Text>
              </Pressable>
              ) : null}
            </ScrollView>

            {showFilter ? (
            <Pressable
              onPress={() => setFilterOpen(true)}
              style={[styles.metaBar, { backgroundColor: `${colors.surface}88`, borderColor: colors.border }]}
            >
              <Text secondary variant="caption">
                {sortLabel} · {regionLabel}
              </Text>
              <View style={styles.metaAction}>
                <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '700' }}>
                  Sırala & filtrele
                </Text>
                <Ionicons name="chevron-forward" size={12} color={MARKETPLACE_ACCENT} />
              </View>
            </Pressable>
            ) : null}

            {searchActive && searchQuery ? (
              <Pressable onPress={resetSearch} style={[styles.searchChip, { borderColor: MARKETPLACE_ACCENT }]}>
                <Ionicons name="search-outline" size={12} color={MARKETPLACE_ACCENT} />
                <Text variant="caption" style={{ color: MARKETPLACE_ACCENT }}>
                  {searchQuery}
                </Text>
                <Ionicons name="close" size={12} color={MARKETPLACE_ACCENT} />
              </Pressable>
            ) : null}

            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={48} color={colors.textMuted} />
              <Text secondary style={{ textAlign: 'center' }}>
                {filters.category
                  ? `${activeCategoryLabel ?? 'Bu kategori'} için ilan bulunamadı.`
                  : (TAB_EMPTY_MESSAGES[tab] ?? 'İlan bulunamadı.')}
              </Text>
              {showCreate ? <Button title="İlan Ver" onPress={goCreate} /> : null}
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={MARKETPLACE_ACCENT} style={{ marginVertical: spacing.lg }} />
          ) : null
        }
        refreshing={loading}
        onRefresh={refresh}
        {...listPerf}
      />

      <MarketplaceFilterSheet
        visible={filterOpen}
        filters={filters}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
      />

      <MarketplaceSearchSheet
        visible={searchOpen}
        regionId={marketplaceRegionId}
        filters={filters}
        onClose={() => setSearchOpen(false)}
        onSearchApplied={handleSearchApplied}
        onToggleFavorite={handleToggleFavorite}
      />

      <MarketplaceCategorySheet
        visible={categoryOpen}
        activeCategory={filters.category ?? null}
        onClose={() => setCategoryOpen(false)}
        onSelect={selectCategory}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg },
  headerBlock: { gap: spacing.sm, marginBottom: spacing.sm },
  back: { marginBottom: spacing.xs },
  column: { gap: spacing.sm },
  searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  tabs: { gap: spacing.xs },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  searchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
});
