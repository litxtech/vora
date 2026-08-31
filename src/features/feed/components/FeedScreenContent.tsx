import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useMainTabSelected } from '@/features/navigation/hooks/useMainTabScreenActive';
import { FeedFilters } from '@/features/feed/components/FeedFilters';
import { FeedSpotlightCarousel } from '@/features/feed/components/FeedSpotlightCarousel';
import { FeaturedProfilesCarousel } from '@/features/profile/components/FeaturedProfilesCarousel';
import { fetchFeaturedProfiles } from '@/features/profile/services/featuredProfiles';
import type { FeaturedProfileCard } from '@/features/profile/services/featuredProfiles';
import { FeedHeader } from '@/features/feed/components/FeedHeader';
import { PostUploadBanner } from '@/features/compose/components/PostUploadBanner';
import { StoryUploadFeedBanner } from '@/features/stories/components/StoryUploadFeedBanner';
import { FeatureGate } from '@/features/feature-flags/components/FeatureGate';
import { StoryRingBar } from '@/features/stories/components/StoryRingBar';
import { STORIES_FEATURE } from '@/features/stories/featureFlags';
import { prefetchStoryRings } from '@/features/stories/services/storyRingSession';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';
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
import {
  getFeedRichHeaderDelayMs,
  shouldDeferFeedHeaderContent,
  shouldDeferFeedRichHeader,
  shouldLoadFeedFeaturedProfiles,
  shouldLoadFeedSpotlightCarousel,
  shouldPollFeedProcessingVideos,
  shouldUseFeedRealtime,
  shouldWarmupAndroidTabModules,
} from '@/lib/device/androidPerfProfile';
import { warmupAndroidTabModules } from '@/lib/device/androidTabWarmup';
import { warmupHeavyRouteModules } from '@/lib/navigation/routeWarmup';
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
  /** Detay üstteyken de true — liste/medya unmount olmasın, geri kaydırınca boş flash olmasın. */
  const isTabSelected = useMainTabSelected('index');
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = useStableTabBarInset();
  const listBottomInset = getFloatingTabBarReserve(tabBarBottomInset) + spacing.md;
  const { user } = useAuth();
  const { isVisible } = useFeatureFlags();
  const featuredProfilesVisible = isVisible('featured-profiles');
  const storiesVisible = isVisible(STORIES_FEATURE.root);
  const storyRingBarVisible = isVisible(STORIES_FEATURE.ringBar);
  const storyRingBootstrapVisible = isVisible(STORIES_FEATURE.ringBootstrap);
  const resetNewPosts = useFeedStore((s) => s.resetNewPosts);
  const category = useFeedStore((s) => s.category);
  const regionId = useFeedStore((s) => s.regionId);
  const [headerEvents, setHeaderEvents] = useState<EventListing[]>([]);
  const [headerLostItems, setHeaderLostItems] = useState<LostListing[]>([]);
  const [featuredProfiles, setFeaturedProfiles] = useState<FeaturedProfileCard[]>([]);
  const [richHeaderReady, setRichHeaderReady] = useState(!shouldDeferFeedRichHeader());
  const hasCachedStoryRings = useStoryRingStore((s) => s.rings.length > 0);
  const showStoryRingBar =
    (richHeaderReady || hasCachedStoryRings) && category === 'all' && storiesVisible && storyRingBarVisible;

  const { items, loading, refreshing, loadingMore, error, refresh, loadMore, updateItem, removeItem } = useFeed();

  useFeedProcessingVideos(items, updateItem, isFocused && shouldPollFeedProcessingVideos());
  useFeedRealtime(isFocused && shouldUseFeedRealtime());

  useEffect(() => {
    if (!isFocused || !shouldDeferFeedRichHeader()) return;
    // Geri dönüşte yeniden bekletme — bir kez hazır olduysa kalsın.
    if (richHeaderReady) return;
    const delayMs = getFeedRichHeaderDelayMs();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setRichHeaderReady(true);
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isFocused, richHeaderReady]);

  useEffect(() => {
    // Dev: warmup/prefetch Metro spike yapar — release'te detay geçişi hızlanır.
    if (!isFocused || __DEV__) return;

    const routeTask = warmupHeavyRouteModules();
    const tabTask = shouldWarmupAndroidTabModules() ? warmupAndroidTabModules() : { cancel: () => {} };

    return () => {
      routeTask.cancel();
      tabTask.cancel();
    };
  }, [isFocused]);

  useEffect(() => {
    // Yalnızca başka sekmeye geçince temizle — detay push blur'unda state silme.
    if (!isFocused && !isTabSelected) {
      useFeedMusicSoundStore.getState().clear();
      useFeedVideoPlaybackStore.getState().clear();
    }
  }, [isFocused, isTabSelected]);

  useEffect(() => {
    if (category !== 'all') {
      setHeaderEvents([]);
      setHeaderLostItems([]);
      setFeaturedProfiles([]);
      return;
    }

    // Blur'da header'ı silme — sağa kaydırıp / detaydan geri dönünce boş flash olmasın.
    if (!isTabSelected) return;

    if (shouldDeferFeedRichHeader() && !richHeaderReady) {
      return;
    }

    const loadHeaderContent = () => {
      if (shouldLoadFeedSpotlightCarousel()) {
        fetchFeedHeaderEvents(regionId).then(setHeaderEvents);
        fetchFeedHeaderLostItems(regionId).then(setHeaderLostItems);
      }

      if (!featuredProfilesVisible || !shouldLoadFeedFeaturedProfiles()) {
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
  }, [isTabSelected, category, regionId, user?.id, featuredProfilesVisible, richHeaderReady]);

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
        {showStoryRingBar ? (
          <FeatureGate featureId={STORIES_FEATURE.ringBar}>
            <StoryRingBar />
          </FeatureGate>
        ) : null}
        {richHeaderReady && category === 'all' && featuredProfilesVisible && featuredProfiles.length > 0 ? (
          <FeaturedProfilesCarousel profiles={featuredProfiles} onSeeAll={handleSeeAllFeatured} />
        ) : null}
        {richHeaderReady && category === 'all' && (headerEvents.length > 0 || headerLostItems.length > 0) ? (
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
      storyRingBarVisible,
      showStoryRingBar,
      regionId,
      richHeaderReady,
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
    if (storiesVisible && storyRingBootstrapVisible) {
      void prefetchStoryRings(user?.id ?? null, { background: true, animate: true, force: true, useCache: true });
    }
  }, [refresh, resetNewPosts, storiesVisible, storyRingBootstrapVisible, user?.id]);

  return (
    <FeedSideDrawerShell>
      <GradientBackground>
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          <View style={styles.uploadBanners}>
            <StoryUploadFeedBanner />
            <PostUploadBanner />
          </View>
          <FeedList
            items={items}
            loading={loading}
            refreshing={refreshing}
            loadingMore={loadingMore}
            error={error}
            isScreenFocused={isTabSelected}
            isRouteFocused={isFocused}
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
  uploadBanners: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    zIndex: 20,
  },
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
