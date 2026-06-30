import { Image, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { FeedMediaPreview } from '@/components/media/FeedMediaPreview';
import { formatCount } from '@/features/profile/constants';
import { openReelsAtReel } from '@/features/reels/services/reelsNavigation';
import { extractMuxPlaybackId } from '@/lib/mux/client';
import { useProfileGridLayout } from '@/features/profile/hooks/useProfileGridLayout';
import type { MusicUsageContentPreview } from '@/features/music/types';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const GAP = 2;

type MusicUsagePreviewGridProps = {
  items: MusicUsageContentPreview[];
};

export function MusicUsagePreviewGrid({ items }: MusicUsagePreviewGridProps) {
  const { colors } = useTheme();
  const { cellSize, onGridLayout } = useProfileGridLayout(GAP);

  const handleLayout = (event: LayoutChangeEvent) => {
    onGridLayout(event.nativeEvent.layout.width);
  };

  const openItem = (item: MusicUsageContentPreview) => {
    if (item.kind === 'reel') {
      const playbackId = item.previewUrl
        ? extractMuxPlaybackId(item.previewUrl)
        : item.thumbnailUrl
          ? extractMuxPlaybackId(item.thumbnailUrl)
          : null;
      openReelsAtReel(item.id, {
        id: item.id,
        playbackId,
        thumbnailUrl: item.thumbnailUrl,
        musicPlayback: null,
      });
      return;
    }
    router.push(`/detail/posts/${item.id}` as never);
  };

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="images-outline" size={32} color={colors.textMuted} />
        <Text secondary variant="caption" style={{ textAlign: 'center' }}>
          Henüz bu müziği kullanan gönderi veya reel yok.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.grid, { gap: GAP }]} onLayout={handleLayout}>
      {items.map((item) => {
        const hasThumb = Boolean(item.thumbnailUrl);
        const isVideoPost = item.kind === 'post' && item.previewUrl && isVideoUrl(item.previewUrl);
        const cellHeight = cellSize > 0 ? cellSize * 1.35 : undefined;

        return (
          <Pressable
            key={`${item.kind}-${item.id}`}
            style={[
              styles.cell,
              cellSize > 0
                ? { width: cellSize, height: cellHeight }
                : styles.cellFallback,
              { backgroundColor: colors.surfaceElevated },
            ]}
            onPress={() => openItem(item)}
          >
            {hasThumb && item.thumbnailUrl ? (
              item.kind === 'post' && !isVideoPost ? (
                <FeedMediaPreview url={item.thumbnailUrl} style={styles.thumb} resizeMode="cover" showPlayIcon={false} />
              ) : (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
              )
            ) : (
              <View style={[styles.thumb, styles.textPreview, { backgroundColor: `${colors.primary}12` }]}>
                <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
                <Text secondary variant="caption" numberOfLines={3} style={styles.textPreviewLabel}>
                  {item.caption.trim() || (item.kind === 'reel' ? 'Reel' : 'Gönderi')}
                </Text>
              </View>
            )}

            <View style={styles.kindBadge}>
              <Ionicons
                name={item.kind === 'reel' ? 'film' : isVideoPost ? 'videocam' : 'image'}
                size={10}
                color="#fff"
              />
            </View>

            <View style={styles.bottomOverlay}>
              <Text variant="caption" style={styles.authorLabel} numberOfLines={1}>
                @{item.author.username}
              </Text>
              <View style={styles.statRow}>
                <Ionicons
                  name={item.kind === 'reel' ? 'eye' : 'heart'}
                  size={10}
                  color="#fff"
                />
                <Text variant="caption" style={styles.statText}>
                  {formatCount(item.kind === 'reel' ? item.viewCount : item.likeCount)}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
  },
  cell: {
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  cellFallback: {
    width: '31.5%',
    aspectRatio: 3 / 4,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  textPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    gap: 4,
  },
  textPreviewLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  kindBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 2,
  },
  authorLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
