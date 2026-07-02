import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { spacing } from '@/constants/theme';

type StoryProgressBarsProps = {
  total: number;
  activeIndex: number;
  progress: number;
};

function StoryProgressSegment({
  index,
  activeIndex,
  progress,
}: {
  index: number;
  activeIndex: number;
  progress: number;
}) {
  const fill = useSharedValue(0);

  useEffect(() => {
    const target =
      index < activeIndex ? 1 : index === activeIndex ? Math.max(0, Math.min(1, progress)) : 0;
    fill.value = withTiming(target, { duration: index === activeIndex ? 80 : 160 });
  }, [activeIndex, fill, index, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

export function StoryProgressBars({ total, activeIndex, progress }: StoryProgressBarsProps) {
  if (total <= 0) return null;

  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, index) => (
        <StoryProgressSegment
          key={index}
          index={index}
          activeIndex={activeIndex}
          progress={progress}
        />
      ))}
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
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
    transformOrigin: 'left center',
  },
});
