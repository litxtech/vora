import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useProfileGridLayout } from '@/features/profile/hooks/useProfileGridLayout';
import { chunkProfileGridItems } from '@/features/profile/services/profileGridMetrics';
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
  const { columns, cellSize, pagePadding, containerWidth } = useProfileGridLayout(GAP, {
    fullBleed: true,
  });

  if (reels.length === 0) {
    return <Text secondary style={styles.empty}>Henüz reel yok.</Text>;
  }

  if (cellSize <= 0) return null;

  const rowHeight = Math.round(cellSize * 1.25);
  const rows = chunkProfileGridItems(reels, columns);

  return (
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
          style={[styles.row, { gap: GAP, marginTop: rowIndex > 0 ? GAP : 0, height: rowHeight }]}
        >
          {row.map((reel) => (
            <Pressable
              key={reel.id}
              style={[
                styles.cell,
                { width: cellSize, height: rowHeight, backgroundColor: colors.surfaceElevated },
              ]}
              onPress={() => onPressReel?.(reel)}
            >
              {reel.thumbnailUrl ? (
                <Image source={{ uri: reel.thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
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
      ))}
    </View>
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
  cell: { overflow: 'hidden', position: 'relative' },
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
