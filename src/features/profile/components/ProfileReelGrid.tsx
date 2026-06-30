import { LayoutChangeEvent, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useProfileGridLayout } from '@/features/profile/hooks/useProfileGridLayout';
import { formatCount } from '@/features/profile/constants';
import type { ReelItem } from '@/features/reels/types';
import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const GAP = 2;

type ProfileReelGridProps = {
  reels: ReelItem[];
  showStats?: boolean;
  onPressReel?: (reel: ReelItem) => void;
};

export function ProfileReelGrid({ reels, showStats = false, onPressReel }: ProfileReelGridProps) {
  const { colors } = useTheme();
  const { cellSize, onGridLayout } = useProfileGridLayout(GAP);

  if (reels.length === 0) {
    return <Text secondary style={styles.empty}>Henüz reel yok.</Text>;
  }

  const handleGridLayout = (event: LayoutChangeEvent) => {
    onGridLayout(event.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.grid, { gap: GAP }]} onLayout={handleGridLayout}>
      {reels.map((reel) => (
        <Pressable
          key={reel.id}
          style={[
            styles.cell,
            cellSize > 0
              ? { width: cellSize, height: cellSize * 1.4 }
              : styles.cellFallback,
            { backgroundColor: colors.surfaceElevated },
          ]}
          onPress={() => onPressReel?.(reel)}
        >
          {reel.thumbnailUrl ? (
            <Image source={{ uri: reel.thumbnailUrl }} style={styles.thumb} />
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
  cell: { borderRadius: radius.sm, overflow: 'hidden' },
  cellFallback: {
    width: '31%',
    aspectRatio: 1 / 1.4,
  },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A2230' },
  overlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewCount: { color: '#fff', fontSize: 11 },
  statsBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statsText: { color: '#00BFA5', fontSize: 10, fontWeight: '600' },
  empty: { textAlign: 'center', paddingVertical: 24 },
});
