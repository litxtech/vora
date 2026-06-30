import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from 'expo-router';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ViewToken,
} from 'react-native';
import { ensureReelFeedAudioMode } from '@/features/music/services/audioPreview';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useAuth } from '@/providers/AuthProvider';
import { detachReelMusic } from '@/features/music/services/reelMusicSync';
import { ReelFeedPage } from '@/features/reels/components/ReelFeedPage';
import { useReels } from '@/features/reels/hooks/useReels';
import { initReelsPlayback } from '@/features/reels/services/initReelsPlayback';
import {
  clearPrimedReelVideoPreload,
  clearReelVideoPreloadPool,
  pauseReelVideoPreloadPool,
} from '@/features/reels/services/reelVideoPreload';
import { clearReelMusicPool } from '@/features/music/services/reelMusicSync';
import { fetchReelById, recordReelView } from '@/features/reels/services/reelsData';
import { primeReelForOpen, resetReelWarmup, scheduleReelWarmup } from '@/features/reels/services/reelWarmup';
import { useReelsPlaybackStore } from '@/features/reels/store/reelsPlaybackStore';
import { useReelsViewerStore } from '@/features/reels/store/reelsViewerStore';
import type { ReelItem } from '@/features/reels/types';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { getAndroidReelsFlatListPerfProps, isAndroid, shouldDeferHeavyFocusWork } from '@/lib/device/androidPerfProfile';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { subscribeMuxVideoReady } from '@/services/video/muxReadyEvents';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

/** Reels sekmesinden çıkıp bu süre dönülmezse video/müzik havuzları serbest bırakılır. */
const REELS_IDLE_RELEASE_MS = 20_000;

const IOS_REELS_LIST_PERF = {
  initialNumToRender: 1,
  maxToRenderPerBatch: 1,
  windowSize: 4,
  updateCellsBatchingPeriod: 80,
  removeClippedSubviews: true,
} as const;

export function ReelsFeed() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const viewedRef = useRef(new Set<string>());
  const listRef = useRef<FlatList<ReelItem>>(null);
  const anchoredRef = useRef<string | null>(null);
  const anchorFetchStartedRef = useRef<string | null>(null);
  const initialIndexSyncedRef = useRef(false);
  const wasFocusedRef = useRef(isFocused);
  const [viewportHeight, setViewportHeight] = useState(SCREEN_HEIGHT);
  const feed = useReels();

  useEffect(() => {
    if (!isFocused) return;
    return subscribeMuxVideoReady(() => {
      void feed.refresh();
    });
  }, [feed.refresh, isFocused]);

  const anchorReelId = useReelsViewerStore((s) => s.session?.anchorReelId ?? null);
  const clearSession = useReelsViewerStore((s) => s.clearSession);
  const setPlaybackActiveIndex = useReelsPlaybackStore((s) => s.setActiveIndex);
  const setPlaybackItemCount = useReelsPlaybackStore((s) => s.setItemCount);
  const setScrolling = useReelsPlaybackStore((s) => s.setScrolling);
  const warmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = feed.items;
  const activeIndex = useReelsPlaybackStore((s) => s.activeIndex);
  const itemCount = items.length;

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const feedRef = useRef(feed);
  feedRef.current = feed;

  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recordViewForIndex = useCallback((idx: number) => {
    const item = itemsRef.current[idx];
    if (item && !viewedRef.current.has(item.id)) {
      viewedRef.current.add(item.id);
      recordReelView(item.id).then((recorded) => {
        if (recorded) {
          feedRef.current.updateItem(item.id, { viewCount: item.viewCount + 1 });
        }
      });
    }
  }, []);

  const isAnchorPending = useCallback(() => {
    const pendingId = useReelsViewerStore.getState().session?.anchorReelId;
    return Boolean(pendingId && anchoredRef.current !== pendingId);
  }, []);

  const applyActiveIndex = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= itemCount) return;
      if (isAnchorPending()) return;
      if (idx !== useReelsPlaybackStore.getState().activeIndex) {
        setPlaybackActiveIndex(idx);
        feedRef.current.setActiveIndex(idx);
      }
      recordViewForIndex(idx);
    },
    [itemCount, setPlaybackActiveIndex, recordViewForIndex, isAnchorPending],
  );

  const commitActiveIndex = useCallback(
    (offsetY: number) => {
      if (viewportHeight <= 0 || itemCount === 0) return;
      const idx = Math.min(itemCount - 1, Math.max(0, Math.round(offsetY / viewportHeight)));
      applyActiveIndex(idx);
    },
    [itemCount, viewportHeight, applyActiveIndex],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (useReelsPlaybackStore.getState().isScrolling) return;
      if (viewableItems.length === 0) return;

      let best: ViewToken | null = null;
      for (const token of viewableItems) {
        if (!token.isViewable || token.index == null) continue;
        if (!best || (token.percentVisible ?? 0) > (best.percentVisible ?? 0)) {
          best = token;
        }
      }
      if (best?.index == null) return;
      applyActiveIndex(best.index);
    },
    [applyActiveIndex],
  );

  const onViewableRef = useRef(onViewableItemsChanged);
  onViewableRef.current = onViewableItemsChanged;

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 60, minimumViewTime: 0 },
      onViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => {
        onViewableRef.current(info);
      },
    },
  ]).current;

  const queueWarmup = useCallback((index: number) => {
    if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current);
    warmupTimerRef.current = setTimeout(() => {
      if (useReelsPlaybackStore.getState().isScrolling) return;
      scheduleReelWarmup(itemsRef.current, index);
    }, 250);
  }, []);

  useEffect(() => {
    setScrolling(false);
  }, [setScrolling]);

  useEffect(() => {
    if (!isFocused) {
      setScrolling(false);
      detachReelMusic();
      pauseReelVideoPreloadPool();
      clearPrimedReelVideoPreload();
      clearSession();
      anchoredRef.current = null;
      anchorFetchStartedRef.current = null;

      const state = useReelsPlaybackStore.getState();
      if (state.activeIndex < 0 && itemsRef.current.length > 0) {
        setPlaybackActiveIndex(0);
      }

      // Kısa sekme geçişlerinde havuz korunur; uzun süre dönülmezse bellek/decoder serbest bırakılır.
      const idleRelease = setTimeout(() => {
        resetReelWarmup();
        clearReelVideoPreloadPool();
        clearReelMusicPool();
      }, REELS_IDLE_RELEASE_MS);

      return () => clearTimeout(idleRelease);
    }

    const runFocusWork = () => {
      void initReelsPlayback();
      void ensureReelFeedAudioMode();
      setScrolling(false);

      const state = useReelsPlaybackStore.getState();
      const count = itemsRef.current.length;
      const safeIndex =
        state.activeIndex < 0 ? 0 : Math.min(state.activeIndex, Math.max(0, count - 1));

      if (state.activeIndex !== safeIndex) {
        setPlaybackActiveIndex(safeIndex);
      }

      if (count > 0) {
        scheduleReelWarmup(itemsRef.current, safeIndex);
      }
    };

    if (shouldDeferHeavyFocusWork()) {
      const task = deferBackgroundWork(runFocusWork);
      return () => task.cancel();
    }

    runFocusWork();
  }, [isFocused, clearSession, setPlaybackActiveIndex, setScrolling]);

  useEffect(() => {
    setPlaybackItemCount(items.length);
    if (items.length > 0 && !initialIndexSyncedRef.current) {
      if (!anchorReelId) {
        setPlaybackActiveIndex(0);
      }
      initialIndexSyncedRef.current = true;
    }
  }, [items.length, anchorReelId, setPlaybackItemCount, setPlaybackActiveIndex]);

  useEffect(() => {
    const wasFocused = wasFocusedRef.current;
    wasFocusedRef.current = isFocused;

    if (!isFocused || items.length === 0) return;
    if (!wasFocused && !anchorReelId) {
      const idx = Math.max(0, Math.min(useReelsPlaybackStore.getState().activeIndex, items.length - 1));
      setPlaybackActiveIndex(idx);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          offset: viewportHeight * idx,
          animated: false,
        });
      });
    }
  }, [isFocused, items.length, viewportHeight, anchorReelId, setPlaybackActiveIndex]);

  useEffect(() => {
    if (items.length === 0) {
      if (!anchorReelId) {
        setPlaybackActiveIndex(0);
      }
      return;
    }
    const current = useReelsPlaybackStore.getState().activeIndex;
    if (current < 0) return;
    if (current > items.length - 1) {
      setPlaybackActiveIndex(items.length - 1);
    }
  }, [items.length, anchorReelId, setPlaybackActiveIndex]);

  const viewportHeightSyncedRef = useRef(viewportHeight);

  useEffect(() => {
    if (viewportHeight <= 0 || items.length === 0) return;
    if (viewportHeightSyncedRef.current === viewportHeight) return;
    viewportHeightSyncedRef.current = viewportHeight;

    const current = useReelsPlaybackStore.getState().activeIndex;
    if (current < 0 || isAnchorPending()) return;

    const idx = Math.min(current, items.length - 1);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: viewportHeight * idx,
        animated: false,
      });
    });
  }, [viewportHeight, items.length, isAnchorPending]);

  useEffect(() => {
    if (!isFocused || items.length === 0 || isAnchorPending()) return;
    const idx = useReelsPlaybackStore.getState().activeIndex;
    if (idx < 0) return;
    scheduleReelWarmup(items, idx);
  }, [isFocused, items, isAnchorPending]);

  useEffect(() => {
    if (!isFocused || isAnchorPending()) return;
    queueWarmup(activeIndex);
    return () => {
      if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current);
    };
  }, [isFocused, activeIndex, isAnchorPending, queueWarmup]);

  const handleScrollBegin = useCallback(() => {
    setScrolling(true);
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
  }, [setScrolling]);

  const handleScrollSettled = useCallback(
    (offsetY: number) => {
      setScrolling(false);
      if (isAnchorPending()) return;
      commitActiveIndex(offsetY);
      queueWarmup(useReelsPlaybackStore.getState().activeIndex);
    },
    [setScrolling, commitActiveIndex, queueWarmup, isAnchorPending],
  );

  const handleScrollEndDrag = useCallback(
    (offsetY: number) => {
      if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = setTimeout(() => {
        handleScrollSettled(offsetY);
      }, 120);
    },
    [handleScrollSettled],
  );

  useEffect(() => {
    if (!isFocused || !anchorReelId) return;
    if (feed.loading && items.length === 0) return;
    if (anchoredRef.current === anchorReelId) return;

    const index = feed.items.findIndex((item) => item.id === anchorReelId);
    if (index >= 0) {
      setPlaybackActiveIndex(index);
      feed.setActiveIndex(index);
      setScrolling(true);

      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index, animated: false });
        if (useReelsViewerStore.getState().session?.anchorReelId !== anchorReelId) {
          setScrolling(false);
          return;
        }
        anchoredRef.current = anchorReelId;
        clearPrimedReelVideoPreload();
        setScrolling(false);
        recordViewForIndex(index);
        scheduleReelWarmup(feed.items, index);
      });
      return;
    }

    if (anchorFetchStartedRef.current === anchorReelId) return;

    anchorFetchStartedRef.current = anchorReelId;
    setPlaybackActiveIndex(0);
    setScrolling(true);

    void (async () => {
      const reel = await fetchReelById(anchorReelId, user?.id ?? null);
      if (useReelsViewerStore.getState().session?.anchorReelId !== anchorReelId) {
        setScrolling(false);
        return;
      }
      if (reel) {
        primeReelForOpen(reel);
        feed.prependReel(reel);
        return;
      }

      anchorFetchStartedRef.current = null;
      anchoredRef.current = anchorReelId;
      clearPrimedReelVideoPreload();
      setScrolling(false);
      setPlaybackActiveIndex(0);
    })();
  }, [
    anchorReelId,
    feed,
    feed.items,
    feed.loading,
    isFocused,
    items.length,
    recordViewForIndex,
    setPlaybackActiveIndex,
    setScrolling,
    user?.id,
  ]);

  const openCreate = async () => {
    if (!(await requireAuth('Reel paylaşımı'))) return;
    router.push('/reels/create' as never);
  };

  const playbackFocused = isFocused;

  const renderItem = useCallback(
    ({ item, index }: { item: ReelItem; index: number }) => (
      <ReelFeedPage
        item={item}
        index={index}
        isFocused={playbackFocused}
        viewportHeight={viewportHeight}
        viewportWidth={SCREEN_WIDTH}
        onUpdate={(patch) => feed.updateItem(item.id, patch)}
        onDeleted={() => feed.removeItem(item.id)}
      />
    ),
    [feed, playbackFocused, viewportHeight],
  );

  const reelsListPerf = isAndroid() ? getAndroidReelsFlatListPerfProps() : IOS_REELS_LIST_PERF;

  const itemLayout = useCallback(
    (_: ArrayLike<ReelItem> | null | undefined, index: number) => ({
      length: viewportHeight,
      offset: viewportHeight * index,
      index,
    }),
    [viewportHeight],
  );

  if (feed.loading && items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
          <View style={styles.headerRow} pointerEvents="auto">
            <View style={styles.headerSide} />
            <Text variant="h3" style={styles.headerTitle}>Reels</Text>
            <View style={styles.headerSide} />
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      </View>
    );
  }

  if (!feed.loading && items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
          <View style={styles.headerRow} pointerEvents="auto">
            <View style={styles.headerSide} />
            <Text variant="h3" style={styles.headerTitle}>Reels</Text>
            <Pressable style={styles.createBtn} onPress={openCreate} hitSlop={12} accessibilityLabel="Reel oluştur">
              <Ionicons name="add-circle" size={32} color="#fff" />
            </Pressable>
          </View>
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="play-circle-outline" size={48} color="rgba(255,255,255,0.45)" />
          <Text variant="label" style={styles.emptyTitle}>Henüz reel yok</Text>
          <Text variant="caption" style={styles.emptyMessage}>
            Bu bölgede yayınlanan reel bulunamadı. İlk reel'i paylaşın veya video işleniyorsa birkaç dakika bekleyin.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const nextHeight = event.nativeEvent.layout.height;
        if (nextHeight > 0 && nextHeight !== viewportHeight) {
          setViewportHeight(nextHeight);
        }
      }}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <View style={styles.headerRow} pointerEvents="auto">
          <View style={styles.headerSide} />
          <Text variant="h3" style={styles.headerTitle}>
            Reels
          </Text>
          <Pressable style={styles.createBtn} onPress={openCreate} hitSlop={12} accessibilityLabel="Reel oluştur">
            <Ionicons name="add-circle" size={32} color="#fff" />
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={(event) => {
          if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
          handleScrollSettled(event.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={(event) => {
          handleScrollEndDrag(event.nativeEvent.contentOffset.y);
        }}
        {...reelsListPerf}
        onEndReached={feed.loadMore}
        onEndReachedThreshold={0.6}
        onScrollToIndexFailed={(info) => {
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
          });
        }}
        getItemLayout={itemLayout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    minHeight: 44,
  },
  headerSide: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    color: '#fff',
    textAlign: 'center',
  },
  createBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { color: '#fff', textAlign: 'center' },
  emptyMessage: { color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20 },
});
