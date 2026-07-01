import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { FeedFilters } from '@/features/feed/components/FeedFilters';
import { FeedSpotlightCarousel } from '@/features/feed/components/FeedSpotlightCarousel';
import { FeaturedProfilesCarousel } from '@/features/profile/components/FeaturedProfilesCarousel';
import { fetchFeaturedProfiles } from '@/features/profile/services/featuredProfiles';
import type { FeaturedProfileCard } from '@/features/profile/services/featuredProfiles';
import { FeedHeader } from '@/features/feed/components/FeedHeader';
import { PostUploadBanner } from '@/features/compose/components/PostUploadBanner';
import { FeatureGate } from '@/features/feature-flags/components/FeatureGate';
import { StoryRingBar } from '@/features/stories/components/StoryRingBar';
import { FeedList } from '@/features/feed/components/FeedList';
import { NewPostsBanner } from '@/features/feed/components/NewPostsBanner';
import { useFeed } from '@/features/feed/hooks/useFeed';
import { useFeedProcessingVideos } from '@/features/feed/hooks/useFeedProcessingVideos';
import { useFeedRealtime } from '@/features/feed/hooks/useFeedRealtime';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { useFeedMusicSoundStore } from '@/features/feed/store/feedMusicSoundStore';
import { useFeedVideoPlaybackStore } from '@/features/feed/store/feedVideoPlaybackStore';
import { fetchFeedHeaderEvents } from '@/features/feed/services/featuredEvents';
import { fetchFeedHeaderLostItems } from '@/features/feed/services/featuredLostItems';
import type { EventListing } from '@/features/events/types';
import type { LostListing } from '@/features/lost-found/types';
import { shouldDeferFeedHeaderContent } from '@/lib/device/androidPerfProfile';
import { warmupAndroidTabModules } from '@/lib/device/androidTabWarmup';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import { useStableTabBarInset } from '@/hooks/useStableTabBarInset';
import { getFloatingTabBarReserve } from '@/constants/tabBar';
import { FeedSideDrawerShell } from '@/features/feed/components/FeedSideDrawer';
import { useFeedDrawerStore } from '@/features/feed/store/feedDrawerStore';
import { spacing } from '@/constants/theme';

export function FeedScreenContent() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = useStableTabBarInset();
  const listBottomInset = getFloatingTabBarReserve(tabBarBottomInset) + spacing.md;
  const { user } = useAuth();
  const { isVisible } = useFeatureFlags();
  const featuredProfilesVisible = isVisible('featured-profiles');
  const storiesVisible = isVisible('stories');
  const resetNewPosts = useFeedStore((s) => s.resetNewPosts);
  const category = useFeedStore((s) => s.category);
  const regionId = useFeedStore((s) => s.regionId);
  const [headerEvents, setHeaderEvents] = useState<EventListing[]>([]);
  const [headerLostItems, setHeaderLostItems] = useState<LostListing[]>([]);
  const [featuredProfiles, setFeaturedProfiles] = useState<FeaturedProfileCard[]>([]);

  const { items, loading, refreshing, loadingMore, error, refresh, loadMore, updateItem, removeItem } = useFeed();

  useFeedProcessingVideos(items, updateItem, isFocused);
  useFeedRealtime(isFocused);

  useEffect(() => {
    if (!isFocused) return;
    const task = warmupAndroidTabModules();
    return () => task.cancel();
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused) {
      useFeedMusicSoundStore.getState().clear();
      useFeedVideoPlaybackStore.getState().clear();
    }
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused || category !== 'all') {
      setHeaderEvents([]);
      setHeaderLostItems([]);
      setFeaturedProfiles([]);
      return;
    }

    const loadHeaderContent = () => {
      fetchFeedHeaderEvents(regionId).then(setHeaderEvents);
      fetchFeedHeaderLostItems(regionId).then(setHeaderLostItems);

      if (!featuredProfilesVisible) {
        setFeaturedProfiles([]);
        return;
      }

      fetchFeaturedProfiles(regionId ?? 'trabzon', {
        excludeUserId: user?.id,
        limit: 8,
        isKaradenizWideScope: !regionId,
      }).then(setFeaturedProfiles);
    };

    if (shouldDeferFeedHeaderContent()) {
      const task = deferBackgroundWork(loadHeaderContent);
      return () => task.cancel();
    }

    loadHeaderContent();
  }, [isFocused, category, regionId, user?.id, featuredProfilesVisible]);

  const handleBannerRefresh = useCallback(() => {
    resetNewPosts();
    refresh();
  }, [resetNewPosts, refresh]);

  const handleSeeAllFeatured = useCallback(() => {
    router.push('/featured-profiles' as never);
  }, [router]);

  const header = useMemo(
    () => (
      <View style={styles.headerWrap}>
        <View style={styles.bannerSlot}>
          <NewPostsBanner onRefresh={handleBannerRefresh} />
        </View>
        <FeedHeader />
        {category === 'all' && storiesVisible ? (
          <FeatureGate featureId="stories">
            <StoryRingBar regionId={regionId} />
          </FeatureGate>
        ) : null}
        {category === 'all' && featuredProfilesVisible && featuredProfiles.length > 0 ? (
          <FeaturedProfilesCarousel profiles={featuredProfiles} onSeeAll={handleSeeAllFeatured} />
        ) : null}
        {category === 'all' && (headerEvents.length > 0 || headerLostItems.length > 0) ? (
          <FeedSpotlightCarousel events={headerEvents} lostItems={headerLostItems} />
        ) : null}
        <View style={styles.filtersSection}>
          <FeedFilters />
        </View>
      </View>
    ),
    [
      category,
      featuredProfiles,
      featuredProfilesVisible,
      storiesVisible,
      regionId,
      handleBannerRefresh,
      handleSeeAllFeatured,
      headerEvents,
      headerLostItems,
    ],
  );

  useEffect(() => {
    if (!isFocused) {
      useFeedDrawerStore.getState().closeDrawer();
    }
  }, [isFocused]);

  const handleRefresh = useCallback(() => {
    resetNewPosts();
    refresh();
  }, [resetNewPosts, refresh]);

  return (
    <FeedSideDrawerShell>
      <GradientBackground>
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          <PostUploadBanner />
          <FeedList
            items={items}
            loading={loading}
            refreshing={refreshing}
            loadingMore={loadingMore}
            error={error}
            isScreenFocused={isFocused}
            onRefresh={handleRefresh}
            onLoadMore={loadMore}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            header={header}
            listBottomInset={listBottomInset}
          />
        </View>
      </GradientBackground>
    </FeedSideDrawerShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, position: 'relative' },
  headerWrap: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  bannerSlot: { alignItems: 'center' },
  filtersSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
});
