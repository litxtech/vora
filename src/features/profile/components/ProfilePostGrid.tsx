import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { chunkProfileGridItems } from '@/features/profile/services/profileGridMetrics';
import {
  getProfileGridInitialBatch,
  getProfileGridLoadMoreBatch,
  shouldSkipUiBlur,
} from '@/lib/device/androidPerfProfile';
import { useAuth } from '@/providers/AuthProvider';
import { formatCount } from '@/features/profile/constants';
import type { FeedItem } from '@/features/feed/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

/** Instagram: 1px ara — yapışık kare ızgara. */
const GAP = 1;

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
  isDark: boolean;
  userId: string | null;
  onOpenViewer: (index: number) => void;
};

const ProfileGridCell = memo(function ProfileGridCell({
  item,
  index,
  cellSize,
  isDark,
  userId,
  onOpenViewer,
}: GridCellProps) {
  const hasMedia = postHasGridMedia(item);
  const primaryMedia = item.mediaUrls.find((url) => url?.trim()) ?? null;
  const sizeStyle = { width: cellSize, height: cellSize };

  return (
    <Pressable
      style={[styles.cell, sizeStyle]}
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
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(() => getProfileGridInitialBatch());
  const dismissToken = useFeedMediaViewerStore((s) => s.dismissToken);
  const { columns, cellSize, pagePadding, containerWidth } = useProfileGridLayout(GAP, {
    fullBleed: true,
  });

  useEffect(() => {
    setViewerIndex(null);
  }, [dismissToken]);

  useEffect(() => {
    setVisibleCount(getProfileGridInitialBatch());
  }, [items]);

  const visibleItems = items.slice(0, visibleCount);
  const rows = chunkProfileGridItems(visibleItems, columns);
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
      {cellSize > 0 ? (
        <View
          style={[
            styles.grid,
            {
              width: containerWidth,
              maxWidth: containerWidth,
              marginHorizontal: -pagePadding,
            },
          ]}
        >
          {rows.map((row, rowIndex) => (
            <View
              key={row[0]?.id ?? `row-${rowIndex}`}
              style={[styles.row, { gap: GAP, marginTop: rowIndex > 0 ? GAP : 0, height: cellSize }]}
            >
              {row.map((item, columnIndex) => (
                <ProfileGridCell
                  key={item.id}
                  item={item}
                  index={rowIndex * columns + columnIndex}
                  cellSize={cellSize}
                  isDark={isDark}
                  userId={user?.id ?? null}
                  onOpenViewer={openViewer}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

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
  grid: {
    alignSelf: 'flex-start',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    width: '100%',
  },
  cell: {
    overflow: 'hidden',
    backgroundColor: '#1A2230',
    position: 'relative',
  },
  thumb: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  multiBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 3,
  },
  videoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
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
