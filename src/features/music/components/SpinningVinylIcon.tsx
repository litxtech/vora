import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

type SpinningVinylIconProps = {
  spinning?: boolean;
  size?: number;
};

export function SpinningVinylIcon({ spinning = false, size = 20 }: SpinningVinylIconProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (spinning) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 3200, easing: Easing.linear }),
        -1,
      );
      return;
    }
    cancelAnimation(rotation);
    rotation.value = 0;
  }, [rotation, spinning]);

  const discStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const hole = Math.max(4, Math.round(size * 0.22));

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Animated.View style={[styles.disc, discStyle, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[styles.ring, { width: size - 3, height: size - 3, borderRadius: (size - 3) / 2 }]} />
        <View style={[styles.hole, { width: hole, height: hole, borderRadius: hole / 2 }]} />
      </Animated.View>
      <Ionicons
        name="musical-note"
        size={Math.max(7, Math.round(size * 0.34))}
        color="#fff"
        style={styles.note}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  disc: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,20,24,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  hole: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  note: {
    position: 'absolute',
    opacity: 0.95,
  },
});
