import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { FeedItem } from '@/features/feed/types';
import { spacing } from '@/constants/theme';
import { getFeedListPerfProps, getFeedEstimatedItemSize, isAndroid } from '@/lib/device/androidPerfProfile';
import { shouldUseSilentListRefresh } from '@/lib/ui/listRefresh';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { useTheme } from '@/providers/ThemeProvider';

type FeedListProps = {
  items: FeedItem[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  isScreenFocused?: boolean;
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
  isRowVisible?: boolean;
  onUpdateItem: (id: string, patch: Partial<FeedItem>) => void;
  onRemoveItem?: (id: string) => void;
};

const FeedPostRow = memo(function FeedPostRow({
  item,
  isScreenFocused,
  isRowVisible,
  onUpdateItem,
  onRemoveItem,
}: FeedPostRowProps) {
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
        isVisible={isRowVisible ?? true}
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
      isRowVisible={isRowVisible ?? true}
      onUpdate={onUpdate}
      onDeleted={onRemoveItem ? onDeleted : undefined}
    />
  );
});

function pickActiveVideoPostId(viewableItems: ViewToken[]): string | null {
  let activeVideoPostId: string | null = null;
  let bestPercent = 0;

  for (const token of viewableItems) {
    if (!token.isViewable || !token.item) continue;
    const row = token.item as FeedItem;
    if (row.sourceType !== 'post' || !row.mediaUrls.some((url) => isVideoUrl(url))) continue;

    const percent = token.percentVisible ?? 0;
    if (percent > bestPercent) {
      bestPercent = percent;
      activeVideoPostId = row.sourceId;
    }
  }

  return activeVideoPostId;
}

export function FeedList({
  items,
  loading,
  refreshing,
  loadingMore,
  error,
  isScreenFocused,
  onRefresh,
  onLoadMore,
  onUpdateItem,
  onRemoveItem,
  header,
  listBottomInset = 0,
}: FeedListProps) {
  const { colors } = useTheme();
  const showInitialEmpty = !loading && items.length === 0;
  const listPerf = getFeedListPerfProps();
  const listRef = useRef<FlatList<FeedItem> | FlashListRef<FeedItem>>(null);
  useScrollToTop(listRef);
  const [visibleRowIds, setVisibleRowIds] = useState<Set<string>>(() => new Set());
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingViewableRef = useRef<ViewToken[]>([]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const commitActiveVideo = useCallback((viewableItems: ViewToken[]) => {
    useFeedVideoPlaybackStore.getState().setActivePost(pickActiveVideoPostId(viewableItems));
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const isScrolling = useFeedVideoPlaybackStore.getState().isScrolling;
    const nextVisible = new Set<string>();

    for (const token of viewableItems) {
      if (!token.isViewable || !token.item) continue;
      const row = token.item as FeedItem;
      nextVisible.add(row.id);
    }

    setVisibleRowIds((prev) => {
      if (!isScrolling) return nextVisible;
      const merged = new Set(nextVisible);
      for (const id of prev) merged.add(id);
      return merged;
    });
    pendingViewableRef.current = viewableItems;

    if (isScrolling) return;
    commitActiveVideo(viewableItems);
  }).current;

  const handleScrollBegin = useCallback(() => {
    useFeedVideoPlaybackStore.getState().setScrolling(true);
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
  }, []);

  const handleScrollSettled = useCallback(() => {
    useFeedVideoPlaybackStore.getState().setScrolling(false);

    const nextVisible = new Set<string>();
    for (const token of pendingViewableRef.current) {
      if (!token.isViewable || !token.item) continue;
      nextVisible.add((token.item as FeedItem).id);
    }
    setVisibleRowIds(nextVisible);
    commitActiveVideo(pendingViewableRef.current);
  }, [commitActiveVideo]);

  const handleScrollEndDrag = useCallback(() => {
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
    scrollSettleTimerRef.current = setTimeout(handleScrollSettled, 120);
  }, [handleScrollSettled]);

  useEffect(() => {
    return () => {
      if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    useFeedVideoPlaybackStore.getState().setScrolling(false);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <FeedPostRow
        item={item}
        isScreenFocused={isScreenFocused}
        isRowVisible={visibleRowIds.has(item.id)}
        onUpdateItem={onUpdateItem}
        onRemoveItem={onRemoveItem}
      />
    ),
    [isScreenFocused, visibleRowIds, onUpdateItem, onRemoveItem],
  );

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

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

  const listEmpty = showInitialEmpty ? (
    <FeedEmptyState
      title="Henüz içerik yok"
      message="Bölgenizdeki paylaşımlar burada görünecek. İlk paylaşımı sen yap!"
      icon="radio-outline"
    />
  ) : null;

  const listFooter =
    loadingMore || (loading && items.length > 0 && !shouldUseSilentListRefresh()) ? (
      <ActivityIndicator color={colors.primary} style={styles.footer} />
    ) : null;

  const sharedListProps = {
    data: items,
    keyExtractor,
    renderItem,
    ListHeaderComponent: listHeader,
    ListEmptyComponent: listEmpty,
    ListFooterComponent: listFooter,
    refreshControl: (
      <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
    ),
    onEndReached: onLoadMore,
    onEndReachedThreshold: 0.4 as const,
    onViewableItemsChanged: onViewableItemsChanged,
    viewabilityConfig,
    onScrollBeginDrag: handleScrollBegin,
    onScrollEndDrag: handleScrollEndDrag,
    onMomentumScrollEnd: handleScrollSettled,
    showsVerticalScrollIndicator: false,
    contentContainerStyle: [styles.content, listBottomInset > 0 && { paddingBottom: listBottomInset }],
    style: styles.list,
    ...listPerf,
  };

  if (isAndroid()) {
    return (
      <FlashList
        ref={listRef}
        {...sharedListProps}
        drawDistance={getFeedEstimatedItemSize() * 2}
      />
    );
  }

  return (
    <FlatList
      ref={listRef}
      {...sharedListProps}
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
