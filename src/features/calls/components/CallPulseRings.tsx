import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CALL_DESIGN } from '@/features/calls/constants';

type CallPulseRingsProps = {
  size?: number;
  color?: string;
  active?: boolean;
};

function PulseRing({
  size,
  color,
  delayMs,
  active,
}: {
  size: number;
  color: string;
  delayMs: number;
  active: boolean;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    if (!active) {
      scale.value = 1;
      opacity.value = 0;
      return;
    }

    const { durationMs } = CALL_DESIGN.pulse;
    scale.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.55, { duration: durationMs, easing: Easing.out(Easing.cubic) }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(0.5, { duration: 0 }),
          withTiming(0, { duration: durationMs, easing: Easing.out(Easing.cubic) }),
        ),
        -1,
        false,
      ),
    );
  }, [active, delayMs, opacity, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
        },
        ringStyle,
      ]}
    />
  );
}

/** Gelen/giden arama sırasında avatar etrafında genişleyen nabız halkaları. */
export function CallPulseRings({
  size = CALL_DESIGN.pulse.baseSize,
  color = CALL_DESIGN.pulse.outgoingColor,
  active = true,
}: CallPulseRingsProps) {
  const { ringCount, staggerMs, expandBy } = CALL_DESIGN.pulse;

  return (
    <View style={[styles.wrap, { width: size + expandBy * 2, height: size + expandBy * 2 }]}>
      {Array.from({ length: ringCount }).map((_, index) => (
        <PulseRing
          key={index}
          size={size}
          color={color}
          delayMs={index * staggerMs}
          active={active}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
});
