import { memo, useCallback, useEffect, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { InstantPressable } from '@/components/ui/InstantPressable';
import { CentersDrawerMenu } from '@/features/centers/components/CentersDrawerMenu';
import { ProfileTabIcon } from '@/features/profile/components/ProfileTabIcon';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useGuestMode } from '@/features/auth/hooks/useGuestMode';
import { useAuth } from '@/providers/AuthProvider';
import { useFeedDrawerStore } from '@/features/feed/store/feedDrawerStore';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const FEED_DRAWER_WIDTH_RATIO = 0.78;
const FEED_DRAWER_OPEN_MS = 300;
const FEED_DRAWER_CLOSE_MS = 280;
const FEED_DRAWER_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const DRAWER_AVATAR_SIZE = 48;

const MemoFeedChildren = memo(function MemoFeedChildren({ children }: { children: ReactNode }) {
  return <>{children}</>;
});

type FeedSideDrawerProfileHeaderProps = {
  onNavigate?: () => void;
};

function FeedSideDrawerProfileHeader({ onNavigate }: FeedSideDrawerProfileHeaderProps) {
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { isGuest, guestProfileComplete } = useGuestMode();
  const closeDrawer = useFeedDrawerStore((s) => s.closeDrawer);

  const displayName = profile?.full_name?.trim() || profile?.username || 'Profil';
  const username = profile?.username ? `@${profile.username}` : 'Hesabına git';

  const goProfile = () => {
    router.push('/(tabs)/profile');
    closeDrawer();
    onNavigate?.();
  };

  const handlePress = () => {
    if (!user) {
      void requireAuth('Profil');
      return;
    }
    if (isGuest && !guestProfileComplete) {
      void (async () => {
        const allowed = await requireAuth('Profil');
        if (allowed) goProfile();
      })();
      return;
    }
    goProfile();
  };

  return (
    <InstantPressable
      onPress={handlePress}
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
    </InstantPressable>
  );
}

type FeedSideDrawerShellProps = {
  children: ReactNode;
};

export function FeedSideDrawerShell({ children }: FeedSideDrawerShellProps) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const drawerWidth = width * FEED_DRAWER_WIDTH_RATIO;
  const open = useFeedDrawerStore((s) => s.open);
  const closeDrawer = useFeedDrawerStore((s) => s.closeDrawer);
  const feedRegionId = useFeedStore((s) => s.regionId);
  const progress = useSharedValue(0);
  const drawerWidthSv = useSharedValue(drawerWidth);

  useEffect(() => {
    drawerWidthSv.value = drawerWidth;
  }, [drawerWidth, drawerWidthSv]);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = withTiming(open ? 1 : 0, {
      duration: open ? FEED_DRAWER_OPEN_MS : FEED_DRAWER_CLOSE_MS,
      easing: FEED_DRAWER_EASING,
    });

    if (open && Platform.OS !== 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [open, progress]);

  const feedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * drawerWidthSv.value }],
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-drawerWidthSv.value, 0]),
      },
    ],
  }));

  const drawerContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 1], [0, 1, 1]),
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-18, 0]),
      },
    ],
  }));

  const scrimMaxOpacity = isDark ? 0.48 : 0.38;

  const scrimStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(progress.value, [0, 1], [0, scrimMaxOpacity]),
    }),
    [scrimMaxOpacity],
  );

  const feedShadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const handleClose = useCallback(() => {
    closeDrawer();
  }, [closeDrawer]);

  return (
    <View style={[shellStyles.root, { backgroundColor: colors.background }]} collapsable={false}>
      <Animated.View
        style={[
          shellStyles.drawer,
          { width: drawerWidth, backgroundColor: colors.background },
          drawerStyle,
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Animated.View style={[shellStyles.drawerInner, drawerContentStyle]}>
          <CentersDrawerMenu
            headerPrefix={<FeedSideDrawerProfileHeader onNavigate={closeDrawer} />}
            onCenterNavigate={closeDrawer}
            feedRegionId={feedRegionId}
          />
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[shellStyles.feed, { backgroundColor: colors.background }, feedStyle]}
        collapsable={false}
      >
        <Animated.View
          pointerEvents="none"
          style={[shellStyles.feedEdgeShadow, feedShadowStyle]}
        />
        <View style={shellStyles.feedInner}>
          <MemoFeedChildren>{children}</MemoFeedChildren>
        </View>
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          style={[shellStyles.scrim, scrimStyle]}
        >
          <Pressable
            style={shellStyles.scrimPress}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Menüyü kapat"
            android_ripple={{ color: 'transparent' }}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

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
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 1,
  },
  drawerInner: {
    flex: 1,
  },
  feed: {
    flex: 1,
    zIndex: 2,
    overflow: 'hidden',
  },
  feedInner: {
    flex: 1,
  },
  feedEdgeShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 10,
    zIndex: 3,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    backgroundColor: '#000',
  },
  scrimPress: {
    flex: 1,
  },
});
