import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PlatformCharmBadgeSvg } from '@/features/platform-charm/components/PlatformCharmBadgeSvg';
import { PlatformCharmInfoModal } from '@/features/platform-charm/components/PlatformCharmInfoModal';
import { PLATFORM_CHARM_TITLE } from '@/features/platform-charm/constants';
import { getPlatformCharmTheme } from '@/features/platform-charm/theme';
import type { GenderId } from '@/constants/registration';
import { spacing } from '@/constants/theme';

export const PLATFORM_CHARM_TICK_SIZE = 14;

type PlatformCharmTickProps = {
  size?: number;
  earnedAt?: string | null;
  gender?: GenderId | null;
};

export function PlatformCharmTick({
  size = PLATFORM_CHARM_TICK_SIZE,
  earnedAt,
  gender,
}: PlatformCharmTickProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const theme = getPlatformCharmTheme(gender);
  const pulse = useSharedValue(0.55);
  const orbit = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    orbit.value = withRepeat(
      withTiming(1, { duration: 4800, easing: Easing.linear }),
      -1,
      false,
    );
  }, [orbit, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: pulse.value * 0.55,
    transform: [{ scale: 0.92 + pulse.value * 0.22 }],
  }));

  const sparkStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.45,
    transform: [{ rotate: `${orbit.value * 360}deg` }],
  }));

  const haloSize = size + 8;
  const haloOffset = (size - haloSize) / 2;

  return (
    <>
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          setModalVisible(true);
        }}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={PLATFORM_CHARM_TITLE}
        style={[styles.wrap, { width: size, height: size }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width: haloSize,
              height: haloSize,
              borderRadius: haloSize / 2,
              backgroundColor: theme.glow,
              left: haloOffset,
              top: haloOffset,
            },
            haloStyle,
          ]}
        />
        <Animated.View pointerEvents="none" style={[styles.orbit, { width: size, height: size }, sparkStyle]}>
          <View style={[styles.orbitDot, { backgroundColor: theme.sparkle, top: -1 }]} />
          <View style={[styles.orbitDot, styles.orbitDotB, { backgroundColor: theme.rim, bottom: -1 }]} />
        </Animated.View>
        <View style={styles.badge}>
          <PlatformCharmBadgeSvg size={size} gender={gender} />
        </View>
      </Pressable>

      <PlatformCharmInfoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        earnedAt={earnedAt}
        gender={gender}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    marginLeft: spacing.xs,
  },
  halo: {
    position: 'absolute',
  },
  orbit: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orbitDot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  orbitDotB: {
    bottom: 1,
    top: undefined,
  },
  badge: {
    zIndex: 1,
  },
});
