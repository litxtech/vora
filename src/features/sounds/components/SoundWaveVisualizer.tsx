import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { radius } from '@/constants/theme';

const BAR_COUNT = 24;

type SoundWaveVisualizerProps = {
  active: boolean;
  accentColor?: string;
  mutedColor?: string;
  height?: number;
};

export function SoundWaveVisualizer({
  active,
  accentColor = '#fff',
  mutedColor = 'rgba(255,255,255,0.25)',
  height = 56,
}: SoundWaveVisualizerProps) {
  return (
    <View style={[styles.row, { height }]}>
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <WaveBar
          key={index}
          index={index}
          active={active}
          accentColor={accentColor}
          mutedColor={mutedColor}
          maxHeight={height}
        />
      ))}
    </View>
  );
}

function WaveBar({
  index,
  active,
  accentColor,
  mutedColor,
  maxHeight,
}: {
  index: number;
  active: boolean;
  accentColor: string;
  mutedColor: string;
  maxHeight: number;
}) {
  const scale = useSharedValue(0.25);

  useEffect(() => {
    if (!active) {
      scale.value = withTiming(0.2 + (index % 5) * 0.04, { duration: 280 });
      return;
    }

    const peak = 0.35 + ((index * 7) % BAR_COUNT) / BAR_COUNT * 0.65;
    scale.value = withRepeat(
      withSequence(
        withTiming(peak, { duration: 280 + (index % 4) * 40, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.18 + (index % 3) * 0.06, { duration: 260 + (index % 3) * 50, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [active, index, scale]);

  const style = useAnimatedStyle(() => ({
    height: Math.max(6, maxHeight * scale.value),
    backgroundColor: active ? accentColor : mutedColor,
  }));

  return <Animated.View style={[styles.bar, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: '100%',
  },
  bar: {
    width: 4,
    borderRadius: radius.full,
  },
});
