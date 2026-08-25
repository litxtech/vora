import { LayoutChangeEvent, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useProfileGridLayout } from '@/features/profile/hooks/useProfileGridLayout';
import { formatCount } from '@/features/profile/constants';
import type { ReelItem } from '@/features/reels/types';
import { useTheme } from '@/providers/ThemeProvider';

/** Instagram: 1px ara — yapışık dikey ızgara. */
const GAP = 1;

type ProfileReelGridProps = {
  reels: ReelItem[];
  showStats?: boolean;
  onPressReel?: (reel: ReelItem) => void;
};

export function ProfileReelGrid({ reels, showStats = false, onPressReel }: ProfileReelGridProps) {
  const { colors } = useTheme();
  const { cellSize, pagePadding, containerWidth, onGridLayout } = useProfileGridLayout(GAP, {
    fullBleed: true,
  });

  if (reels.length === 0) {
    return <Text secondary style={styles.empty}>Henüz reel yok.</Text>;
  }

  const handleGridLayout = (event: LayoutChangeEvent) => {
    onGridLayout(event.nativeEvent.layout.width);
  };

  return (
    <View
      style={[
        styles.grid,
        {
          gap: GAP,
          marginHorizontal: -pagePadding,
          width: containerWidth > 0 ? containerWidth : undefined,
        },
      ]}
      onLayout={handleGridLayout}
    >
      {reels.map((reel) => (
        <Pressable
          key={reel.id}
          style={[
            styles.cell,
            cellSize > 0
              ? { width: cellSize, height: Math.round(cellSize * 1.25) }
              : styles.cellFallback,
            { backgroundColor: colors.surfaceElevated },
          ]}
          onPress={() => onPressReel?.(reel)}
        >
          {reel.thumbnailUrl ? (
            <Image
              source={{ uri: reel.thumbnailUrl }}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Ionicons name="play-circle" size={32} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.overlay}>
            <Ionicons name="play" size={12} color="#fff" />
            <Text variant="caption" style={styles.viewCount}>
              {formatCount(reel.viewCount)}
            </Text>
          </View>
          {showStats && reel.completionRate > 0 ? (
            <View style={styles.statsBadge}>
              <Text variant="caption" style={styles.statsText}>
                %{Math.round(reel.completionRate * 100)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { overflow: 'hidden', position: 'relative' },
  cellFallback: {
    width: '33.333%',
    aspectRatio: 1 / 1.25,
  },
  thumb: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A2230' },
  overlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewCount: { color: '#fff', fontSize: 11 },
  statsBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statsText: { color: '#00BFA5', fontSize: 10, fontWeight: '600' },
  empty: { textAlign: 'center', paddingVertical: 24 },
});
