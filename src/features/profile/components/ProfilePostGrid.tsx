import { memo, useCallback, useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FeedMediaPreview } from '@/components/media/FeedMediaPreview';
import { Button } from '@/components/ui/Button';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { Text } from '@/components/ui/Text';
import { FeedPostViewer } from '@/features/feed/components/FeedPostViewer';
import { useFeedMediaViewerStore } from '@/features/feed/store/feedMediaViewerStore';
import { openFeedVideoItem } from '@/features/reels/services/reelsNavigation';
import {
  postHasGridMedia,
  ProfileGridTextCell,
} from '@/features/profile/components/ProfileGridTextCell';
import { useProfileGridLayout } from '@/features/profile/hooks/useProfileGridLayout';
import {
  getProfileGridInitialBatch,
  getProfileGridLoadMoreBatch,
  shouldSkipUiBlur,
} from '@/lib/device/androidPerfProfile';
import { useAuth } from '@/providers/AuthProvider';
import { formatCount } from '@/features/profile/constants';
import type { FeedItem } from '@/features/feed/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const GAP = 4;

type ProfilePostGridProps = {
  items: FeedItem[];
  onUpdate?: (id: string, patch: Partial<FeedItem>) => void;
  onDeleted?: (id: string) => void;
};

function ProfileGridStatsOverlay({
  likeCount,
  commentCount,
}: {
  likeCount: number;
  commentCount: number;
}) {
  if (likeCount <= 0 && commentCount <= 0) return null;

  return (
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.75)']}
      style={styles.overlay}
      pointerEvents="none"
    >
      <View style={styles.stat}>
        <Ionicons name="heart" size={10} color="#fff" />
        {likeCount > 0 ? (
          <Text variant="caption" style={styles.statText}>
            {formatCount(likeCount)}
          </Text>
        ) : null}
      </View>
      <View style={styles.stat}>
        <Ionicons name="chatbubble" size={10} color="#fff" />
        {commentCount > 0 ? (
          <Text variant="caption" style={styles.statText}>
            {formatCount(commentCount)}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  );
}

type GridCellProps = {
  item: FeedItem;
  index: number;
  cellSize: number;
  borderColor: string;
  isDark: boolean;
  userId: string | null;
  onOpenViewer: (index: number) => void;
};

const ProfileGridCell = memo(function ProfileGridCell({
  item,
  index,
  cellSize,
  borderColor,
  isDark,
  userId,
  onOpenViewer,
}: GridCellProps) {
  const hasMedia = postHasGridMedia(item);
  const primaryMedia = item.mediaUrls.find((url) => url?.trim()) ?? null;

  return (
    <Pressable
      style={[
        styles.cell,
        cellSize > 0 ? { width: cellSize, height: cellSize } : styles.cellFallback,
        { borderColor },
      ]}
      onPress={() => {
        void openFeedVideoItem(item, userId).then((openedInReels) => {
          if (!openedInReels) onOpenViewer(index);
        });
      }}
    >
      {hasMedia && primaryMedia ? (
        <>
          {isDark && !shouldSkipUiBlur() ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,14,20,0.35)' }]} />
          ) : null}
          <FeedMediaPreview
            url={primaryMedia}
            style={styles.thumb}
            resizeMode="cover"
            tier="grid"
            layoutWidth={cellSize > 0 ? cellSize : undefined}
            showPlayIcon={false}
          />
          {isVideoUrl(primaryMedia) ? (
            <View style={styles.videoBadge}>
              <Ionicons name="videocam" size={11} color="#fff" />
            </View>
          ) : null}
          {item.mediaUrls.filter((url) => url?.trim()).length > 1 ? (
            <View style={styles.multiBadge}>
              <Ionicons name="copy-outline" size={11} color="#fff" />
            </View>
          ) : null}
        </>
      ) : (
        <ProfileGridTextCell item={item} />
      )}

      <ProfileGridStatsOverlay likeCount={item.likeCount} commentCount={item.commentCount} />
    </Pressable>
  );
});

export function ProfilePostGrid({ items, onUpdate, onDeleted }: ProfilePostGridProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(() => getProfileGridInitialBatch());
  const dismissToken = useFeedMediaViewerStore((s) => s.dismissToken);
  const { cellSize, onGridLayout } = useProfileGridLayout(GAP);

  useEffect(() => {
    setViewerIndex(null);
  }, [dismissToken]);

  useEffect(() => {
    setVisibleCount(getProfileGridInitialBatch());
  }, [items]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const handleUpdate = (id: string, patch: Partial<FeedItem>) => {
    onUpdate?.(id, patch);
  };

  const handleDeleted = (id: string) => {
    onDeleted?.(id);
    if (viewerIndex !== null && items.length <= 1) {
      setViewerIndex(null);
    } else if (viewerIndex !== null && viewerIndex >= items.length - 1) {
      setViewerIndex(Math.max(0, items.length - 2));
    }
  };

  const handleGridLayout = (event: LayoutChangeEvent) => {
    onGridLayout(event.nativeEvent.layout.width);
  };

  const openViewer = useCallback((index: number) => {
    setViewerIndex(index);
  }, []);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(items.length, prev + getProfileGridLoadMoreBatch()));
  }, [items.length]);

  if (items.length === 0) {
    return <Text secondary style={styles.empty}>Henüz gönderi yok.</Text>;
  }

  return (
    <>
      <View style={[styles.grid, { gap: GAP }]} onLayout={handleGridLayout}>
        {visibleItems.map((item, index) => (
          <ProfileGridCell
            key={item.id}
            item={item}
            index={index}
            cellSize={cellSize}
            borderColor={`${colors.border}88`}
            isDark={isDark}
            userId={user?.id ?? null}
            onOpenViewer={openViewer}
          />
        ))}
      </View>

      {hasMore ? (
        <Button
          title={`Daha fazla göster (${items.length - visibleCount})`}
          variant="outline"
          onPress={loadMore}
          style={styles.loadMore}
        />
      ) : null}

      {viewerIndex !== null && viewerIndex >= 0 && viewerIndex < items.length ? (
        <FeedPostViewer
          items={items}
          startIndex={viewerIndex}
          visible
          onClose={() => setViewerIndex(null)}
          onUpdate={handleUpdate}
          onDeleted={handleDeleted}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  cellFallback: {
    width: '31%',
    aspectRatio: 1,
  },
  thumb: { width: '100%', height: '100%' },
  multiBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.sm,
    padding: 3,
  },
  videoBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.sm,
    padding: 3,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: 6,
    paddingTop: 18,
    paddingBottom: 5,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  empty: { textAlign: 'center', paddingVertical: spacing.lg },
  loadMore: { marginTop: spacing.sm },
});
