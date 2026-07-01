import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
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
      {Array.from({ length: total }).map((_, index) => (
        <StorySegment
          key={index}
          isPast={index < activeIndex}
          isActive={index === activeIndex}
          progress={index === activeIndex ? progress : index < activeIndex ? 1 : 0}
        />
      ))}
    </View>
  );
}

function StorySegment({
  isPast,
  isActive,
  progress,
}: {
  isPast: boolean;
  isActive: boolean;
  progress: number;
}) {
  const fillStyle = useAnimatedStyle(() => ({
    width: withTiming(`${Math.max(0, Math.min(1, isPast ? 1 : isActive ? progress : 0)) * 100}%`, {
      duration: isActive ? 80 : 0,
    }),
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  track: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
});
