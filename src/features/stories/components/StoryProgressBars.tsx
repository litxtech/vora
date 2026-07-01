import { StyleSheet, View } from 'react-native';
import { spacing } from '@/constants/theme';

type StoryProgressBarsProps = {
  total: number;
  activeIndex: number;
  progress: number;
};

export function StoryProgressBars({ total, activeIndex, progress }: StoryProgressBarsProps) {
  if (total <= 0) return null;

  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, index) => {
        const fillRatio =
          index < activeIndex ? 1 : index === activeIndex ? Math.max(0, Math.min(1, progress)) : 0;

        return (
          <View key={index} style={styles.track}>
            <View style={[styles.fill, { width: `${fillRatio * 100}%` }]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
});
