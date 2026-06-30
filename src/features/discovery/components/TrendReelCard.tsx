import { Pressable, StyleSheet, View } from 'react-native';
import { openReelsAtReel } from '@/features/reels/services/reelsNavigation';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { trendRankLabel } from '@/features/discovery/constants';
import type { ReelItem } from '@/features/reels/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type TrendReelCardProps = {
  reel: ReelItem;
  rank: number;
};

export function TrendReelCard({ reel, rank }: TrendReelCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={styles.cell}
      onPress={() => openReelsAtReel(reel.id, reel)}
    >
      {reel.thumbnailUrl ? (
        <OptimizedImage uri={reel.thumbnailUrl} style={styles.thumb} tier="grid" contentFit="cover" />
      ) : (
        <View style={[styles.thumbPlaceholder, { backgroundColor: colors.surface }]}>
          <Ionicons name="play-circle" size={32} color={colors.textMuted} />
        </View>
      )}
      <View style={[styles.rankBadge, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
        <Text variant="caption" style={styles.rankText}>
          {trendRankLabel(rank)}
        </Text>
      </View>
      <View style={styles.stats}>
        <Ionicons name="heart" size={10} color="#fff" />
        <Text variant="caption" style={styles.statText}>
          {reel.likeCount}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    aspectRatio: 9 / 16,
    maxWidth: '33.33%',
    padding: 2,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  rankText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  stats: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
