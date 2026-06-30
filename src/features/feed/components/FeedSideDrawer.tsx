import { useEffect, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CentersMenuContent } from '@/features/centers/components/CentersMenuContent';
import { ProfileTabIcon } from '@/features/profile/components/ProfileTabIcon';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useAuth } from '@/providers/AuthProvider';
import { useFeedDrawerStore } from '@/features/feed/store/feedDrawerStore';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const FEED_DRAWER_WIDTH_RATIO = 0.58;
const FEED_DRAWER_SPRING = { damping: 24, stiffness: 290, mass: 0.85 } as const;
const HEADER_AVATAR_SIZE = 34;
const DRAWER_AVATAR_SIZE = 48;

export function FeedHeaderAvatarButton() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const openDrawer = useFeedDrawerStore((s) => s.openDrawer);

  return (
    <Pressable
      onPress={openDrawer}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Menüyü aç"
      style={({ pressed }) => [avatarStyles.btn, pressed && avatarStyles.pressed]}
      {...getAndroidInstantPressableProps()}
    >
      <ProfileTabIcon
        avatarUrl={profile?.avatar_url ?? null}
        username={profile?.username ?? ''}
        color={colors.primary}
        size={HEADER_AVATAR_SIZE}
        focused={false}
      />
    </Pressable>
  );
}

type FeedSideDrawerProfileHeaderProps = {
  onNavigate?: () => void;
};

function FeedSideDrawerProfileHeader({ onNavigate }: FeedSideDrawerProfileHeaderProps) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const closeDrawer = useFeedDrawerStore((s) => s.closeDrawer);

  const displayName = profile?.full_name?.trim() || profile?.username || 'Profil';
  const username = profile?.username ? `@${profile.username}` : 'Hesabına git';

  const handlePress = async () => {
    const allowed = await requireAuth('Profil');
    if (!allowed) return;
    closeDrawer();
    onNavigate?.();
    router.push('/(tabs)/profile');
  };

  return (
    <Pressable
      onPress={() => void handlePress()}
      style={({ pressed }) => [
        profileStyles.row,
        { backgroundColor: pressed ? `${colors.primary}10` : 'transparent' },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Profile git"
    >
      <ProfileTabIcon
        avatarUrl={profile?.avatar_url ?? null}
        username={profile?.username ?? ''}
        color={colors.primary}
        size={DRAWER_AVATAR_SIZE}
        focused
      />
      <View style={profileStyles.copy}>
        <Text variant="label" numberOfLines={1} style={profileStyles.name}>
          {displayName}
        </Text>
        <Text secondary variant="caption" numberOfLines={1}>
          {username}
        </Text>
      </View>
      <View style={[profileStyles.chevron, { backgroundColor: `${colors.textMuted}12` }]}>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

type FeedSideDrawerShellProps = {
  children: ReactNode;
};

export function FeedSideDrawerShell({ children }: FeedSideDrawerShellProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const drawerWidth = width * FEED_DRAWER_WIDTH_RATIO;
  const open = useFeedDrawerStore((s) => s.open);
  const closeDrawer = useFeedDrawerStore((s) => s.closeDrawer);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(open ? 1 : 0, FEED_DRAWER_SPRING);
    if (open && Platform.OS !== 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [open, progress]);

  const feedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * drawerWidth }],
    borderTopLeftRadius: interpolate(progress.value, [0, 1], [0, 18]),
    borderBottomLeftRadius: interpolate(progress.value, [0, 1], [0, 18]),
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-drawerWidth, 0]) }],
    opacity: interpolate(progress.value, [0, 0.15, 1], [0, 1, 1]),
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.38]),
    left: drawerWidth,
  }));

  const handleClose = () => {
    closeDrawer();
    if (Platform.OS !== 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
  };

  return (
    <View style={shellStyles.root}>
      <Animated.View
        style={[
          shellStyles.drawer,
          { width: drawerWidth, backgroundColor: colors.background },
          drawerStyle,
        ]}
      >
        <CentersMenuContent
          variant="drawer"
          onCenterNavigate={closeDrawer}
          headerPrefix={<FeedSideDrawerProfileHeader onNavigate={closeDrawer} />}
        />
      </Animated.View>

      <Animated.View style={[shellStyles.feedLayer, feedStyle]}>{children}</Animated.View>

      <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[shellStyles.scrim, scrimStyle]}>
        <Pressable
          style={shellStyles.scrimPress}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Menüyü kapat"
        />
      </Animated.View>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  btn: { flexShrink: 0 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.94 }] },
});

const profileStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontWeight: '800', letterSpacing: -0.2 },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

const shellStyles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  drawer: {
    ...StyleSheet.absoluteFillObject,
    right: undefined,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  feedLayer: { flex: 1, zIndex: 2, overflow: 'hidden', backgroundColor: 'transparent' },
  scrim: { ...StyleSheet.absoluteFillObject, zIndex: 3, backgroundColor: '#000' },
  scrimPress: { flex: 1 },
});
