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

type ProviderLivePulseProps = {
  color?: string;
  size?: number;
};

/** Usta profilinde çevrimiçi / hızlı yanıt göstergesi. */
export function ProviderLivePulse({ color = '#22C55E', size = 8 }: ProviderLivePulseProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.75, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.1, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(0.55, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [opacity, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.pulse,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          pulseStyle,
        ]}
      />
      <View
        style={[
          styles.dot,
          {
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: size,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
  },
  dot: {},
});
