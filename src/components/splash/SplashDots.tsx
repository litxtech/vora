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
import { useTheme } from '@/providers/ThemeProvider';

const DOT = 12;
const GAP = 12;
const LIFT = 12;
const STAGGER_MS = 80;

/** BootSplash dikey ortalama için cluster yüksekliği. */
export const SPLASH_DOTS_CLUSTER_HEIGHT = DOT + LIFT * 2 + 4;

const VORA_CORAL = '#F07167';

type BounceDotProps = {
  delayMs: number;
  color: string;
  isLast?: boolean;
};

function BounceDot({ delayMs, color, isLast = false }: BounceDotProps) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    const upMs = 220;
    const downMs = 380;

    translateY.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-LIFT, {
            duration: upMs,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(0, {
            duration: downMs,
            easing: Easing.out(Easing.quad),
          }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, translateY]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color }, isLast && styles.dotLast, bodyStyle]}
    />
  );
}

/** İki nokta — hafif zıplama, native driver, düşük maliyet. */
export function SplashDots() {
  const { colors } = useTheme();

  return (
    <View style={styles.cluster}>
      <BounceDot delayMs={0} color={colors.primary} />
      <BounceDot delayMs={STAGGER_MS} color={VORA_CORAL} isLast />
    </View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SPLASH_DOTS_CLUSTER_HEIGHT,
    paddingHorizontal: 4,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    marginRight: GAP,
  },
  dotLast: {
    marginRight: 0,
  },
});
