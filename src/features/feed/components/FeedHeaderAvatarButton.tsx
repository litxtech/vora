import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ProfileTabIcon } from '@/features/profile/components/ProfileTabIcon';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useFeedDrawerStore } from '@/features/feed/store/feedDrawerStore';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';

const AVATAR_SIZE = 34;
const TOGGLE_MS = 260;
const TOGGLE_EASING = Easing.bezier(0.22, 1, 0.36, 1);

export function FeedHeaderAvatarButton() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const open = useFeedDrawerStore((s) => s.open);
  const toggleDrawer = useFeedDrawerStore((s) => s.toggleDrawer);
  const iconProgress = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    iconProgress.value = withTiming(open ? 1 : 0, {
      duration: TOGGLE_MS,
      easing: TOGGLE_EASING,
    });
  }, [iconProgress, open]);

  const avatarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(iconProgress.value, [0, 0.45, 1], [1, 0, 0]),
    transform: [
      { scale: interpolate(iconProgress.value, [0, 1], [1, 0.82]) },
      { rotate: `${interpolate(iconProgress.value, [0, 1], [0, -12])}deg` },
    ],
  }));

  const closeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(iconProgress.value, [0, 0.55, 1], [0, 0, 1]),
    transform: [
      { scale: interpolate(iconProgress.value, [0, 1], [0.72, 1]) },
      { rotate: `${interpolate(iconProgress.value, [0, 1], [72, 0])}deg` },
    ],
  }));

  return (
    <Pressable
      onPress={toggleDrawer}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={open ? 'Menüyü kapat' : 'Menüyü aç'}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      {...getAndroidInstantPressableProps()}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[styles.iconLayer, avatarStyle]}>
          <ProfileTabIcon
            avatarUrl={profile?.avatar_url ?? null}
            username={profile?.username ?? ''}
            color={colors.primary}
            size={AVATAR_SIZE}
            focused={false}
          />
        </Animated.View>
        <Animated.View style={[styles.iconLayer, closeStyle]}>
          <View style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Ionicons name="close" size={18} color={colors.text} />
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexShrink: 0 },
  pressed: { opacity: 0.86 },
  iconBox: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
