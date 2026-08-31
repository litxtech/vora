import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useScrollToTop } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import type { FlashListRef } from '@shopify/flash-list';
import { ActivityIndicator, FlatList, StyleSheet, View, type ViewToken } from 'react-native';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Text } from '@/components/ui/Text';
import { FeedPostCard } from '@/features/feed/components/FeedPostCard';
import { FeedSponsoredAdCard } from '@/features/ads/components/FeedSponsoredAdCard';
import { FeedEventCard } from '@/features/feed/components/FeedEventCard';
import { FeedJobCard } from '@/features/feed/components/FeedJobCard';
import { FeedLostItemCard } from '@/features/feed/components/FeedLostItemCard';
import { FeedEmptyState } from '@/features/feed/components/shared/FeedEmptyState';
import { useFeedVideoPlaybackStore } from '@/features/feed/store/feedVideoPlaybackStore';
import { useFeedRowVisibilityStore } from '@/features/feed/store/feedRowVisibilityStore';
import { useFeedDrawerStore } from '@/features/feed/store/feedDrawerStore';
import type { FeedItem } from '@/features/feed/types';
import { spacing } from '@/constants/theme';
import { getFeedListPerfProps, getFeedFlashListDrawDistance, getFeedScrollSettleMs, isAndroid, shouldAutoplayFeedVideos } from '@/lib/device/androidPerfProfile';
import { shouldUseSilentListRefresh } from '@/lib/ui/listRefresh';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { useTheme } from '@/providers/ThemeProvider';

type FeedListProps = {
  items: FeedItem[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  /** Sekme seçili mi (detay üstteyken de true kalabilir) */
  isScreenFocused?: boolean;
  /** Gerçek rota odağı — detay açılınca false; kart başına useIsFocused yerine tek abonelik */
  isRouteFocused?: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onUpdateItem: (id: string, patch: Partial<FeedItem>) => void;
  onRemoveItem?: (id: string) => void;
  header: React.ReactElement;
  listBottomInset?: number;
};

type FeedPostRowProps = {
  item: FeedItem;
  isScreenFocused?: boolean;
  isRouteFocused?: boolean;
  onUpdateItem: (id: string, patch: Partial<FeedItem>) => void;
  onRemoveItem?: (id: string) => void;
};

const FeedPostRow = memo(function FeedPostRow({
  item,
  isScreenFocused,
  isRouteFocused,
  onUpdateItem,
  onRemoveItem,
}: FeedPostRowProps) {
  const isRowVisible = useFeedRowVisibilityStore((s) => s.visibleById[item.id] === true);

  const onUpdate = useCallback(
    (patch: Partial<FeedItem>) => onUpdateItem(item.id, patch),
    [item.id, onUpdateItem],
  );
  const onDeleted = useCallback(
    () => onRemoveItem?.(item.id),
    [item.id, onRemoveItem],
  );

  if (item.sourceType === 'business_ad') {
    return (
      <FeedSponsoredAdCard
        item={item}
        isVisible={isRowVisible}
        onUpdate={onUpdate}
      />
    );
  }

  return item.sourceType === 'event' ? (
    <FeedEventCard item={item} />
  ) : item.sourceType === 'lost_found' ? (
    <FeedLostItemCard item={item} />
  ) : item.sourceType === 'job' ? (
    <FeedJobCard item={item} />
  ) : (
    <FeedPostCard
      item={item}
      isScreenFocused={isScreenFocused}
      isRouteFocused={isRouteFocused}
      isRowVisible={isRowVisible}
      onUpdate={onUpdate}
      onDeleted={onRemoveItem ? onDeleted : undefined}
    />
  );
});

function pickActiveVideoPostId(viewableItems: ViewToken[]): string | null {
  let best: { postId: string; percent: number; index: number } | null = null;

  for (const token of viewableItems) {
    if (!token.isViewable || !token.item) continue;
    const row = token.item as FeedItem;
    if (row.sourceType !== 'post' || !row.mediaUrls.some((url) => isVideoUrl(url))) continue;

    const percent = (token as { percentVisible?: number }).percentVisible ?? 0;
    const index = token.index ?? Number.MAX_SAFE_INTEGER;
    // Görünürlük yüksek olan; eşitlikte listedeki üstteki (küçük index) tercih edilir.
    if (
      !best ||
      percent > best.percent ||
      (percent === best.percent && index < best.index)
    ) {
      best = { postId: row.sourceId, percent, index };
    }
  }

  return best?.postId ?? null;
}

function collectVisibleIds(viewableItems: ViewToken[]): Set<string> {
  const nextVisible = new Set<string>();
  for (const token of viewableItems) {
    if (!token.isViewable || !token.item) continue;
    nextVisible.add((token.item as FeedItem).id);
  }
  return nextVisible;
}

export function FeedList({
  items,
  loading,
  refreshing,
  loadingMore,
  error,
  isScreenFocused,
  isRouteFocused,
  onRefresh,
  onLoadMore,
  onUpdateItem,
  onRemoveItem,
  header,
  listBottomInset = 0,
}: FeedListProps) {
  const { colors } = useTheme();
  const showInitialEmpty = !loading && items.length === 0;
  const listPerf = useMemo(() => getFeedListPerfProps(), []);
  const drawDistance = useMemo(() => getFeedFlashListDrawDistance(), []);
  const listRef = useRef<FlatList<FeedItem> | FlashListRef<FeedItem>>(null);
  useScrollToTop(listRef);
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingViewableRef = useRef<ViewToken[]>([]);
  const commitActiveVideoRef = useRef<(viewableItems: ViewToken[]) => void>(() => {});
  const isScreenFocusedRef = useRef(isScreenFocused !== false);
  isScreenFocusedRef.current = isScreenFocused !== false;
  const visibleWhileScrollingRef = useRef<Set<string>>(new Set());

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const commitActiveVideo = useCallback((viewableItems: ViewToken[]) => {
    if (!shouldAutoplayFeedVideos()) {
      useFeedVideoPlaybackStore.getState().setActivePost(null);
      return;
    }
    useFeedVideoPlaybackStore.getState().setActivePost(pickActiveVideoPostId(viewableItems));
  }, []);
  commitActiveVideoRef.current = commitActiveVideo;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (useFeedDrawerStore.getState().listInteractionLocked) return;

    const isScrolling = useFeedVideoPlaybackStore.getState().isScrolling;
    const nextVisible = collectVisibleIds(viewableItems);

    // Blur / gizli sekmede boş viewability — görünür satırları ve son
    // bilinen token'ları silme; geri dönünce medya viewability beklemasin.
    if (nextVisible.size === 0 && !isScreenFocusedRef.current) {
      return;
    }

    pendingViewableRef.current = viewableItems;

    if (isScrolling) {
      // Kaydırırken merge — sticky görünürlük; store'u her frame güncelleme.
      const merged = visibleWhileScrollingRef.current;
      for (const id of nextVisible) merged.add(id);
      return;
    }

    visibleWhileScrollingRef.current = new Set(nextVisible);
    useFeedRowVisibilityStore.getState().replaceVisible(nextVisible);
    commitActiveVideo(viewableItems);
  }).current;

  const handleScrollBegin = useCallback(() => {
    useFeedVideoPlaybackStore.getState().setScrolling(true);
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
  }, []);

  const handleScrollSettled = useCallback(() => {
    useFeedVideoPlaybackStore.getState().setScrolling(false);

    const nextVisible = collectVisibleIds(pendingViewableRef.current);
    visibleWhileScrollingRef.current = new Set(nextVisible);
    useFeedRowVisibilityStore.getState().replaceVisible(nextVisible);
    commitActiveVideo(pendingViewableRef.current);
  }, [commitActiveVideo]);

  const handleScrollEndDrag = useCallback(() => {
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
    scrollSettleTimerRef.current = setTimeout(handleScrollSettled, getFeedScrollSettleMs());
  }, [handleScrollSettled]);

  useEffect(() => {
    return () => {
      if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
      useFeedRowVisibilityStore.getState().clear();
    };
  }, []);

  useEffect(() => {
    useFeedVideoPlaybackStore.getState().setScrolling(false);
  }, []);

  // Sekmeye geri dönünce son bilinen görünür satırlardan aktif videoyu yeniden seç.
  useEffect(() => {
    if (isScreenFocused === false) return;
    if (pendingViewableRef.current.length === 0) return;
    commitActiveVideoRef.current(pendingViewableRef.current);
  }, [isScreenFocused]);

  useEffect(() => {
    const clipSubviews = listPerf.removeClippedSubviews ?? false;

    const applyListInteraction = (locked: boolean) => {
      const videoStore = useFeedVideoPlaybackStore.getState();
      if (locked) {
        videoStore.setScrolling(true);
      } else {
        videoStore.setScrolling(false);
        commitActiveVideoRef.current(pendingViewableRef.current);
      }

      listRef.current?.setNativeProps?.({
        pointerEvents: locked ? 'none' : 'auto',
        removeClippedSubviews: locked ? false : clipSubviews,
      });
    };

    useFeedDrawerStore.getState().setListInteractionLockHandler(applyListInteraction);
    applyListInteraction(useFeedDrawerStore.getState().listInteractionLocked);

    return () => {
      useFeedDrawerStore.getState().setListInteractionLockHandler(null);
    };
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <FeedPostRow
        item={item}
        isScreenFocused={isScreenFocused}
        isRouteFocused={isRouteFocused}
        onUpdateItem={onUpdateItem}
        onRemoveItem={onRemoveItem}
      />
    ),
    [isScreenFocused, isRouteFocused, onUpdateItem, onRemoveItem],
  );

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);
  const getItemType = useCallback((item: FeedItem) => item.sourceType, []);

  const listHeader = useMemo(
    () => (
      <View>
        {header}
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: `${colors.danger}18`, borderColor: `${colors.danger}44` }]}>
            <Text variant="caption" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}
      </View>
    ),
    [colors.danger, error, header],
  );

  const listEmpty = useMemo(
    () =>
      showInitialEmpty ? (
        <FeedEmptyState
          title="Henüz içerik yok"
          message="Bölgenizdeki paylaşımlar burada görünecek. İlk paylaşımı sen yap!"
          icon="radio-outline"
        />
      ) : null,
    [showInitialEmpty],
  );

  const listFooter = useMemo(
    () =>
      loadingMore || (loading && items.length > 0 && !shouldUseSilentListRefresh()) ? (
        <ActivityIndicator color={colors.primary} style={styles.footer} />
      ) : null,
    [loadingMore, loading, items.length, colors.primary],
  );

  const contentContainerStyle = useMemo(
    () => [styles.content, listBottomInset > 0 && { paddingBottom: listBottomInset }],
    [listBottomInset],
  );

  const refreshControl = useMemo(
    () => (
      <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
    ),
    [refreshing, onRefresh, colors.primary],
  );

  const sharedListProps = useMemo(
    () => ({
      data: items,
      keyExtractor,
      renderItem,
      getItemType,
      ListHeaderComponent: listHeader,
      ListEmptyComponent: listEmpty,
      ListFooterComponent: listFooter,
      refreshControl,
      onEndReached: onLoadMore,
      onEndReachedThreshold: 0.4 as const,
      onViewableItemsChanged: onViewableItemsChanged,
      viewabilityConfig,
      onScrollBeginDrag: handleScrollBegin,
      onScrollEndDrag: handleScrollEndDrag,
      onMomentumScrollEnd: handleScrollSettled,
      showsVerticalScrollIndicator: false,
      contentContainerStyle,
      style: styles.list,
      ...listPerf,
    }),
    [
      items,
      keyExtractor,
      renderItem,
      getItemType,
      listHeader,
      listEmpty,
      listFooter,
      refreshControl,
      onLoadMore,
      onViewableItemsChanged,
      viewabilityConfig,
      handleScrollBegin,
      handleScrollEndDrag,
      handleScrollSettled,
      contentContainerStyle,
      listPerf,
    ],
  );

  if (isAndroid()) {
    return (
      <FlashList
        ref={listRef}
        {...sharedListProps}
        drawDistance={drawDistance}
      />
    );
  }

  // getItemType yalnızca FlashList; FlatList'e geçirme.
  const { getItemType: _flashItemType, ...flatListProps } = sharedListProps;

  return (
    <FlatList
      ref={listRef}
      {...flatListProps}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingBottom: spacing.xxl, flexGrow: 1 },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  footer: { marginVertical: spacing.lg },
});
