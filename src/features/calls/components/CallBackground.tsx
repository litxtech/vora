import { useEffect } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CALL_DESIGN } from '@/features/calls/constants';

type CallBackgroundProps = ViewProps & {
  children: React.ReactNode;
  variant?: 'default' | 'video';
};

function AmbientOrb({ color, style }: { color: string; style: object }) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.28, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const orbStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.orb, { backgroundColor: color }, style, orbStyle]} />;
}

export function CallBackground({ children, style, variant = 'default', ...props }: CallBackgroundProps) {
  const isVideo = variant === 'video';

  return (
    <View style={[styles.root, isVideo && styles.videoRoot, style]} {...props}>
      {isVideo ? (
        <View style={styles.videoFill} />
      ) : (
        <>
          <LinearGradient
            colors={[...CALL_DESIGN.gradients.screen]}
            locations={[0, 0.32, 0.68, 1]}
            style={StyleSheet.absoluteFill}
          />
          <AmbientOrb color="rgba(30, 136, 229, 0.22)" style={styles.orbPrimary} />
          <AmbientOrb color="rgba(0, 191, 165, 0.16)" style={styles.orbAccent} />
          <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
        </>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CALL_DESIGN.bg,
  },
  videoRoot: {
    backgroundColor: CALL_DESIGN.videoBg,
  },
  videoFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CALL_DESIGN.videoBg,
  },
  content: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPrimary: {
    width: 280,
    height: 280,
    top: '8%',
    left: '-18%',
  },
  orbAccent: {
    width: 220,
    height: 220,
    bottom: '18%',
    right: '-12%',
  },
});
