import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PlatformSupporterInfoModal } from '@/features/platform-support/components/PlatformSupporterInfoModal';
import { radius } from '@/constants/theme';

const SUPPORT_COLOR = '#10B981';
const SUPPORT_GLOW = 'rgba(16, 185, 129, 0.45)';

type PlatformSupporterPillProps = {
  since: string;
};

export function PlatformSupporterPill({ since }: PlatformSupporterPillProps) {
  const [infoVisible, setInfoVisible] = useState(false);
  const dotScale = useSharedValue(1);
  const dotOpacity = useSharedValue(0.85);
  const textOpacity = useSharedValue(0.92);
  const ringScale = useSharedValue(1);

  useEffect(() => {
    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    textOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.72, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 1400, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [dotOpacity, dotScale, ringScale, textOpacity]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: Math.max(0, 1.1 - ringScale.value * 0.55),
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const handlePress = () => {
    setInfoVisible(true);
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Platform destekçisi bilgisi"
      >
        <View style={styles.pill}>
          <View style={styles.liveWrap}>
            <Animated.View style={[styles.liveRing, ringStyle]} />
            <Animated.View style={[styles.liveDot, dotStyle]} />
          </View>
          <Animated.Text style={[styles.label, textStyle]}>Destekçi</Animated.Text>
          <Ionicons name="checkmark-circle" size={13} color={SUPPORT_COLOR} />
        </View>
      </Pressable>
      <PlatformSupporterInfoModal
        visible={infoVisible}
        onClose={() => setInfoVisible(false)}
        since={since}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
  },
  liveWrap: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: SUPPORT_GLOW,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SUPPORT_COLOR,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: SUPPORT_COLOR,
  },
});
