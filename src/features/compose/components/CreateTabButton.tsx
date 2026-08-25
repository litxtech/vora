import { useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeLinearGradient } from '@/components/ui/SafeLinearGradient';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useGuestMode } from '@/features/auth/hooks/useGuestMode';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { getAndroidInstantPressableProps, isAndroid } from '@/lib/device/androidPerfProfile';
import { prefetchComposeRoute } from '@/lib/navigation/lazyRouteScreens';
import { pushRoute } from '@/lib/navigation/pushRoute';
import { asGradientColors } from '@/lib/ui/gradientColors';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const RING_SIZE = 42;
const INNER_SIZE = 34;

const RING_COLORS = asGradientColors(
  ['#1E88E5', '#00BFA5', '#7C4DFF', '#FF6D00', '#EC407A', '#1E88E5'],
  2,
);

export function CreateTabButton({
  style,
  accessibilityState,
  ...rest
}: BottomTabBarButtonProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isGuest, guestProfileComplete } = useGuestMode();
  const { requireAuth } = useRequireAuth();
  const showCreate = useFeatureVisible('compose');
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2800, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  useEffect(() => {
    if (!showCreate) return;
    const timer = setTimeout(() => {
      void prefetchComposeRoute();
    }, isAndroid() ? 400 : 800);
    return () => clearTimeout(timer);
  }, [showCreate]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!showCreate) return null;

  const handlePressIn = () => {
    void prefetchComposeRoute();
  };

  const openCompose = () => {
    void prefetchComposeRoute();
    if (Platform.OS !== 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    pushRoute('/compose' as Href);
  };

  const handlePress = () => {
    if (user && (!isGuest || guestProfileComplete)) {
      openCompose();
      return;
    }

    void (async () => {
      if (!(await requireAuth('Paylaşım'))) return;
      openCompose();
    })();
  };

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel="Paylaş"
      accessibilityState={accessibilityState}
      onPressIn={handlePressIn}
      onPress={handlePress}
      style={[style as StyleProp<ViewStyle>, styles.hit]}
      hitSlop={8}
      {...getAndroidInstantPressableProps()}
    >
      <View style={styles.wrap}>
        <Animated.View style={[styles.ring, ringStyle]}>
          <SafeLinearGradient colors={RING_COLORS} style={styles.ringFill} />
        </Animated.View>
        <View style={[styles.fab, { backgroundColor: colors.background }]}>
          <Text style={[styles.brandLetter, { color: colors.primary }]}>V</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    overflow: 'hidden',
  },
  ringFill: {
    width: '100%',
    height: '100%',
  },
  fab: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  brandLetter: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
    transform: [{ skewX: '-8deg' }],
  },
});
