import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import type { RegionId } from '@/constants/regions';
import { DiscoveryHeader } from '@/features/discovery/components/DiscoveryHeader';
import { DiscoveryTabBar } from '@/features/discovery/components/DiscoveryTabBar';
import { DiscoveryUserSearchResults } from '@/features/discovery/components/DiscoveryUserSearchResults';
import { TrendBusinessCard } from '@/features/discovery/components/TrendBusinessCard';
import { TrendReelCard } from '@/features/discovery/components/TrendReelCard';
import { useDiscovery } from '@/features/discovery/hooks/useDiscovery';
import { useDiscoveryUserSearch } from '@/features/discovery/hooks/useDiscoveryUserSearch';
import { useDiscoveryUserSuggestions } from '@/features/discovery/hooks/useDiscoveryUserSuggestions';
import { useDiscoveryStore } from '@/features/discovery/store/discoveryStore';
import { DISCOVERY_TABS } from '@/features/discovery/constants';
import { DISCOVERY_FEATURE } from '@/features/discovery/featureFlags';
import type { DiscoveryResult, TrendBusiness } from '@/features/discovery/types';
import type { FeedItem } from '@/features/feed/types';
import type { ReelItem } from '@/features/reels/types';
import type { EventListing } from '@/features/events/types';
import type { PersonnelListing } from '@/features/personnel-center/types';
import type { HotelListing } from '@/features/hotel-center/types';
import { EventCard } from '@/features/events/components/EventCard';
import { HotelCard } from '@/features/hotel-center/components/HotelCard';
import { FeedPostCard } from '@/features/feed/components/FeedPostCard';
import { ListingCard } from '@/features/personnel-center/components/ListingCard';
import { FeaturedProfilesCarousel } from '@/features/profile/components/FeaturedProfilesCarousel';
import { fetchFeaturedProfiles, type FeaturedProfileCard } from '@/features/profile/services/featuredProfiles';
import { useStableTabBarInset } from '@/hooks/useStableTabBarInset';
import { getFloatingTabBarReserve } from '@/constants/tabBar';
import { radius, spacing } from '@/constants/theme';
import { getAndroidFlatListPerfProps, getDiscoveryEstimatedItemSize, getMarketplaceGridColumns, isAndroid } from '@/lib/device/androidPerfProfile';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { useTheme } from '@/providers/ThemeProvider';

type DiscoveryRow =
  | { id: string; kind: 'post'; rank: number; payload: FeedItem }
  | { id: string; kind: 'reel'; rank: number; payload: ReelItem }
  | { id: string; kind: 'event'; payload: EventListing }
  | { id: string; kind: 'business'; rank: number; payload: TrendBusiness }
  | { id: string; kind: 'job'; payload: PersonnelListing }
  | { id: string; kind: 'hotel'; payload: HotelListing };

function buildDiscoveryRows(result: DiscoveryResult | null): DiscoveryRow[] {
  if (!result) return [];

  switch (result.tab) {
    case 'posts':
    case 'news':
      return result.items.map((item, index) => ({
        id: item.id,
        kind: 'post' as const,
        rank: index + 1,
        payload: item,
      }));
    case 'reels':
      return result.items.map((item, index) => ({
        id: item.id,
        kind: 'reel' as const,
        rank: index + 1,
        payload: item,
      }));
    case 'events':
      return result.items.map((item) => ({
        id: item.id,
        kind: 'event' as const,
        payload: item,
      }));
    case 'businesses':
      return result.items.map((item, index) => ({
        id: item.id,
        kind: 'business' as const,
        rank: index + 1,
        payload: item,
      }));
    case 'jobs':
      return result.items.map((item) => ({
        id: item.id,
        kind: 'job' as const,
        payload: item,
      }));
    case 'hotels':
      return result.items.map((item) => ({
        id: item.id,
        kind: 'hotel' as const,
        payload: item,
      }));
    default:
      return [];
  }
}

type DiscoveryRowItemProps = {
  item: DiscoveryRow;
  isFocused: boolean;
  warningColor: string;
  onNoopUpdate: () => void;
};

const DiscoveryRowItem = memo(function DiscoveryRowItem({
  item,
  isFocused,
  warningColor,
  onNoopUpdate,
}: DiscoveryRowItemProps) {
  switch (item.kind) {
    case 'post':
      return (
        <View>
          <View style={styles.rankStrip}>
            <Text variant="caption" style={{ color: warningColor, fontWeight: '700' }}>
              #{item.rank}
            </Text>
            <Text variant="caption" secondary>
              Trend
            </Text>
          </View>
          <FeedPostCard item={item.payload} isScreenFocused={isFocused} onUpdate={onNoopUpdate} />
        </View>
      );
    case 'reel':
      return <TrendReelCard reel={item.payload} rank={item.rank} />;
    case 'event':
      return <EventCard event={item.payload} />;
    case 'business':
      return <TrendBusinessCard business={item.payload} rank={item.rank} />;
    case 'job':
      return <ListingCard listing={item.payload} />;
    case 'hotel':
      return <HotelCard hotel={item.payload} />;
    default:
      return null;
  }
});

export function DiscoveryScreen() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = useStableTabBarInset();
  const listBottomInset = getFloatingTabBarReserve(tabBarBottomInset) + spacing.md;
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const showFeaturedCarousel = useFeatureVisible(DISCOVERY_FEATURE.featuredCarousel);
  const visibleTabs = useFeatureTabFilter('discover', DISCOVERY_TABS);
  const regionId = useDiscoveryStore((s) => s.regionId);
  const scope = useDiscoveryStore((s) => s.scope);
  const tab = useDiscoveryStore((s) => s.tab);
  const setTab = useDiscoveryStore((s) => s.setTab);
  const setRegionId = useDiscoveryStore((s) => s.setRegionId);
  const userSearchOpen = useDiscoveryStore((s) => s.userSearchOpen);
  const userSearchQuery = useDiscoveryStore((s) => s.userSearchQuery);
  const closeUserSearch = useDiscoveryStore((s) => s.closeUserSearch);
  // Profil bölgesi store varsayılanından (trabzon) farklıysa, region set edilene kadar
  // fetch'i beklet — aksi halde önce yanlış bölge için atılıp çöpe giden bir fetch oluşur.
  const regionSettled = !profile?.region_id || regionId === (profile.region_id as RegionId);
  const { result, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore } = useDiscovery(
    isFocused && regionSettled,
  );
  const { results: userSearchResults, loading: userSearchLoading, error: userSearchError } =
    useDiscoveryUserSearch(userSearchQuery);
  const { suggestions, loading: suggestionsLoading } = useDiscoveryUserSuggestions(
    userSearchOpen,
    regionId,
    scope,
    user?.id,
  );
  const [featuredProfiles, setFeaturedProfiles] = useState<FeaturedProfileCard[]>([]);

  const activeTabLabel = DISCOVERY_TABS.find((t) => t.id === tab)?.label ?? 'İçerik';
  const showUserSearch = userSearchOpen;
  const listData = useMemo(() => {
    if (result && result.tab !== tab) return [];
    return buildDiscoveryRows(result);
  }, [result, tab]);
  const reelColumns = getMarketplaceGridColumns();
  const isReelGrid = tab === 'reels';
  const listKey = isReelGrid ? `reels-${reelColumns}` : tab;

  useFocusEffect(
    useCallback(() => {
      return () => {
        closeUserSearch();
      };
    }, [closeUserSearch]),
  );

  useEffect(() => {
    if (profile?.region_id) {
      setRegionId(profile.region_id as RegionId);
    }
  }, [profile?.region_id, setRegionId]);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0]?.id ?? 'posts');
    }
  }, [visibleTabs, tab, setTab]);

  useEffect(() => {
    if (!regionId || !showFeaturedCarousel) {
      setFeaturedProfiles([]);
      return;
    }
    void fetchFeaturedProfiles(regionId, { excludeUserId: user?.id, limit: 8 }).then(setFeaturedProfiles);
  }, [regionId, user?.id, refreshing, showFeaturedCarousel]);

  const noopUpdate = useCallback(() => {}, []);

  const renderRow = useCallback(
    ({ item }: { item: DiscoveryRow }) => (
      <DiscoveryRowItem
        item={item}
        isFocused={isFocused}
        warningColor={colors.warning}
        onNoopUpdate={noopUpdate}
      />
    ),
    [colors.warning, isFocused, noopUpdate],
  );

  const keyExtractor = useCallback((item: DiscoveryRow) => item.id, []);

  const listHeader = useMemo(
    () => (
      <View style={styles.headerStack}>
        <DiscoveryHeader />
        {!showUserSearch ? <DiscoveryTabBar value={tab} onChange={setTab} /> : null}
        {!showUserSearch && showFeaturedCarousel && featuredProfiles.length > 0 ? (
          <FeaturedProfilesCarousel
            profiles={featuredProfiles}
            onSeeAll={() => router.push('/featured-profiles' as never)}
          />
        ) : null}
        {!showUserSearch ? (
          <View style={styles.sectionHead}>
            <Text variant="label">{activeTabLabel}</Text>
            <Text variant="caption" secondary>
              Trend sıralaması
            </Text>
          </View>
        ) : null}
      </View>
    ),
    [
      activeTabLabel,
      featuredProfiles,
      showFeaturedCarousel,
      setTab,
      showUserSearch,
      tab,
    ],
  );

  const handleEndReached = useCallback(() => {
    if (hasMore) loadMore();
  }, [hasMore, loadMore]);

  if (showUserSearch) {
    return (
      <GradientBackground>
        <View style={[styles.searchPage, { paddingTop: insets.top + spacing.md, paddingBottom: listBottomInset }]}>
          <DiscoveryHeader />
          <DiscoveryUserSearchResults
            query={userSearchQuery}
            results={userSearchResults}
            loading={userSearchLoading}
            error={userSearchError}
            requiresAuth={!user}
            suggestions={suggestions}
            suggestionsLoading={suggestionsLoading}
          />
        </View>
      </GradientBackground>
    );
  }

  const discoveryListProps = {
    style: styles.list,
    data: listData,
    keyExtractor,
    renderItem: renderRow,
    numColumns: isReelGrid ? reelColumns : 1,
    columnWrapperStyle: isReelGrid ? styles.reelColumn : undefined,
    refreshControl: (
      <AppRefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
    ),
    onEndReached: handleEndReached,
    onEndReachedThreshold: 0.4 as const,
    contentContainerStyle: [
      styles.page,
      { paddingTop: insets.top + spacing.md, paddingBottom: listBottomInset },
      isReelGrid && styles.reelPage,
    ],
    ListHeaderComponent: listHeader,
    ListEmptyComponent:
      loading && !result ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error && !result ? (
        <GlassCard style={styles.empty}>
          <Text secondary>{error}</Text>
          <Pressable onPress={refresh} style={[styles.retryBtn, { borderColor: colors.primary }]}>
            <Text style={{ color: colors.primary }}>Yenile</Text>
          </Pressable>
        </GlassCard>
      ) : !loading ? (
        <GlassCard style={styles.empty}>
          <Ionicons name="compass-outline" size={36} color={colors.textMuted} />
          <Text secondary>Bu dönemde trend içerik bulunamadı.</Text>
          <Text variant="caption" secondary>
            Takip etmediğiniz içerikler burada görünür.
          </Text>
        </GlassCard>
      ) : null,
    ListFooterComponent:
      loadingMore ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : null,
    ...getAndroidFlatListPerfProps(),
  };

  return (
    <GradientBackground>
      {isAndroid() ? (
        <FlashList
          key={listKey}
          {...discoveryListProps}
          drawDistance={getDiscoveryEstimatedItemSize() * 2}
        />
      ) : (
        <FlatList key={listKey} {...discoveryListProps} />
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  page: {
    flexGrow: 1,
  },
  searchPage: {
    flex: 1,
  },
  headerStack: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  center: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  empty: {
    marginHorizontal: spacing.md,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  rankStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  reelPage: {
    paddingHorizontal: spacing.sm,
  },
  reelColumn: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});
