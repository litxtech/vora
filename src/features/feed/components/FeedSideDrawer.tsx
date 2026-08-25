import { memo, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, type View as RNView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
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
import {
  FEED_DRAWER_DISMISS_PROGRESS,
  FEED_DRAWER_DISMISS_VELOCITY_X,
  FEED_DRAWER_WIDTH_RATIO,
} from '@/features/feed/constants/drawer';
import {
  feedDrawerExternallyOwned,
  feedDrawerProgress,
  feedDrawerWidthPx,
} from '@/features/feed/store/feedDrawerProgress';
import { useFeedDrawerStore } from '@/features/feed/store/feedDrawerStore';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

import { isAndroidTablet } from '@/lib/device/isAndroidTablet';

const DRAWER_INTERACTION_PROGRESS = 0.04;
const DRAWER_AVATAR_SIZE = 48;

const TABLET_INSTANT_DRAWER = isAndroidTablet();

/** X tarzı sade ease — tek timing, spring yok (titreme kaynağı). */
const DRAWER_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

const DRAWER_OPEN_TIMING = {
  duration: TABLET_INSTANT_DRAWER ? 0 : 280,
  easing: DRAWER_EASE,
};

const DRAWER_CLOSE_TIMING = {
  duration: TABLET_INSTANT_DRAWER ? 0 : 240,
  easing: DRAWER_EASE,
};

function closeDrawerTiming() {
  'worklet';
  return DRAWER_CLOSE_TIMING;
}

function releaseTiming(velocity: number, opening: boolean) {
  'worklet';
  if (TABLET_INSTANT_DRAWER) {
    return { duration: 0, easing: Easing.linear };
  }
  const speed = Math.min(Math.abs(velocity), 2.5);
  const base = opening ? 280 : 240;
  return {
    duration: Math.max(opening ? 180 : 160, base - speed * 40),
    easing: DRAWER_EASE,
  };
}

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

type FeedDrawerAnimatorProps = {
  drawerWidth: number;
  backgroundColor: string;
  scrimMaxOpacity: number;
  feedRegionId: ReturnType<typeof useFeedStore.getState>['regionId'];
  onClose: () => void;
  children: ReactNode;
};

const FeedDrawerAnimator = memo(function FeedDrawerAnimator({
  drawerWidth,
  backgroundColor,
  scrimMaxOpacity,
  feedRegionId,
  onClose,
  children,
}: FeedDrawerAnimatorProps) {
  const progress = feedDrawerProgress;
  const ownsProgress = useSharedValue(false);
  const drawerOpenSv = useSharedValue(0);
  const dragStartProgress = useSharedValue(0);
  const feedInnerRef = useRef<RNView>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const applyFeedInteractionLocked = useCallback((locked: boolean) => {
    feedInnerRef.current?.setNativeProps?.({
      pointerEvents: locked ? 'none' : 'auto',
    });
    useFeedDrawerStore.getState().setListInteractionLocked(locked);
  }, []);

  const closeFromGesture = useCallback(() => {
    onCloseRef.current();
  }, []);

  const finishGestureAnimation = useCallback(() => {
    ownsProgress.value = false;
    feedDrawerExternallyOwned.value = false;
    applyFeedInteractionLocked(false);
  }, [ownsProgress, applyFeedInteractionLocked]);

  useEffect(() => {
    const applyShellPointerEvents = (locked: boolean) => {
      feedInnerRef.current?.setNativeProps?.({
        pointerEvents: locked ? 'none' : 'auto',
      });
    };
    useFeedDrawerStore.getState().setFeedShellLockHandler(applyShellPointerEvents);
    applyShellPointerEvents(useFeedDrawerStore.getState().listInteractionLocked);
    return () => {
      useFeedDrawerStore.getState().setFeedShellLockHandler(null);
    };
  }, []);

  useEffect(() => {
    feedDrawerWidthPx.value = drawerWidth;
  }, [drawerWidth]);

  useEffect(() => {
    const initialOpen = useFeedDrawerStore.getState().open;
    progress.value = initialOpen ? 1 : 0;
    drawerOpenSv.value = initialOpen ? 1 : 0;
    applyFeedInteractionLocked(initialOpen);

    return useFeedDrawerStore.subscribe((state, previous) => {
      drawerOpenSv.value = state.open ? 1 : 0;
      if (state.open === previous.open) return;

      // Jest / dış sürükleme progress'i yönetiyorsa store animasyonunu atla —
      // cancel + yeniden withTiming titreme yaratıyordu.
      if (feedDrawerExternallyOwned.value || ownsProgress.value) {
        if (state.open) {
          applyFeedInteractionLocked(true);
        }
        // Kapanış: ownership jestte — unlock reaction / safety / finishGesture ile.
        return;
      }

      cancelAnimation(progress);

      if (state.open) {
        ownsProgress.value = false;
        applyFeedInteractionLocked(true);
        if (progress.value >= 0.98) {
          progress.value = 1;
          return;
        }
        progress.value = withTiming(1, DRAWER_OPEN_TIMING);
        if (Platform.OS !== 'android') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return;
      }

      ownsProgress.value = false;
      if (progress.value <= 0.02) {
        progress.value = 0;
        applyFeedInteractionLocked(false);
        return;
      }
      progress.value = withTiming(0, DRAWER_CLOSE_TIMING, (finished) => {
        // Android: finished=false olsa bile kapalıysa kilidi çöz.
        if (!finished && progress.value > 0.02) return;
        runOnJS(applyFeedInteractionLocked)(false);
      });
    });
  }, [drawerOpenSv, ownsProgress, progress, applyFeedInteractionLocked]);

  useAnimatedReaction(
    () => progress.value,
    (value, previous) => {
      if (value > 0.02) return;
      if (drawerOpenSv.value === 1) return;
      if ((previous ?? 1) <= 0.02) return;
      // Ownership ne olursa olsun — tamamen kapanınca feed etkileşimini aç.
      ownsProgress.value = false;
      feedDrawerExternallyOwned.value = false;
      runOnJS(applyFeedInteractionLocked)(false);
    },
  );

  const feedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * feedDrawerWidthPx.value }],
  }));

  const scrimStyle = useAnimatedStyle(
    () => ({
      opacity: progress.value * scrimMaxOpacity,
    }),
    [scrimMaxOpacity],
  );

  const feedDismissGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .manualActivation(true)
      .maxPointers(1)
      .activeOffsetX([-10, 10])
      .failOffsetY([-24, 24])
      .onTouchesDown((_, state) => {
        if (progress.value > DRAWER_INTERACTION_PROGRESS) {
          state.activate();
        } else {
          state.fail();
        }
      })
      .onStart(() => {
        ownsProgress.value = true;
        feedDrawerExternallyOwned.value = false;
        cancelAnimation(progress);
        dragStartProgress.value = progress.value;
        runOnJS(applyFeedInteractionLocked)(true);
      })
      .onUpdate((event) => {
        const width = Math.max(feedDrawerWidthPx.value, 1);
        const next = dragStartProgress.value + event.translationX / width;
        progress.value = Math.min(1, Math.max(0, next));
      })
      .onEnd((event) => {
        const width = Math.max(feedDrawerWidthPx.value, 1);
        const velocity = event.velocityX / width;
        const shouldClose =
          progress.value < FEED_DRAWER_DISMISS_PROGRESS ||
          event.velocityX < FEED_DRAWER_DISMISS_VELOCITY_X;

        ownsProgress.value = true;

        if (shouldClose) {
          progress.value = withTiming(0, releaseTiming(velocity, false), (finished) => {
            // Android iptalinde de kilidi bırak — aksi halde feed donuyor.
            if (!finished && progress.value > 0.02) return;
            runOnJS(finishGestureAnimation)();
          });
          runOnJS(closeFromGesture)();
          return;
        }

        progress.value = withTiming(1, releaseTiming(velocity, true), (finished) => {
          if (!finished) return;
          ownsProgress.value = false;
        });
      });

    const tap = Gesture.Tap().maxDuration(250).onEnd(() => {
      if (progress.value <= DRAWER_INTERACTION_PROGRESS) return;

      ownsProgress.value = true;
      progress.value = withTiming(0, closeDrawerTiming(), (finished) => {
        if (!finished && progress.value > 0.02) return;
        runOnJS(finishGestureAnimation)();
      });
      runOnJS(closeFromGesture)();
    });

    return Gesture.Exclusive(pan, tap);
  }, [
    closeFromGesture,
    dragStartProgress,
    finishGestureAnimation,
    ownsProgress,
    progress,
    applyFeedInteractionLocked,
  ]);

  return (
    <>
      <View
        style={[shellStyles.drawer, { width: drawerWidth, backgroundColor }]}
        collapsable={false}
      >
        <CentersDrawerMenu
          headerPrefix={<FeedSideDrawerProfileHeader onNavigate={onClose} />}
          onCenterNavigate={onClose}
          feedRegionId={feedRegionId}
        />
      </View>

      <GestureDetector gesture={feedDismissGesture}>
        <Animated.View
          style={[shellStyles.feed, { backgroundColor }, feedStyle]}
          collapsable={false}
        >
          <View ref={feedInnerRef} style={shellStyles.feedInner} collapsable={false} pointerEvents="box-none">
            {children}
          </View>
          <Animated.View pointerEvents="none" style={[shellStyles.scrim, scrimStyle]} />
        </Animated.View>
      </GestureDetector>
    </>
  );
});

type FeedSideDrawerShellProps = {
  children: ReactNode;
};

export function FeedSideDrawerShell({ children }: FeedSideDrawerShellProps) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const drawerWidth = width * FEED_DRAWER_WIDTH_RATIO;
  const closeDrawer = useFeedDrawerStore((s) => s.closeDrawer);
  const feedRegionId = useFeedStore((s) => s.regionId);

  const handleClose = useCallback(() => {
    if (!useFeedDrawerStore.getState().open) return;
    closeDrawer();
  }, [closeDrawer]);

  const animatorProps = useMemo(
    () => ({
      drawerWidth,
      backgroundColor: colors.background,
      scrimMaxOpacity: isDark ? 0.48 : 0.38,
      feedRegionId,
      onClose: handleClose,
    }),
    [colors.background, drawerWidth, feedRegionId, handleClose, isDark],
  );

  return (
    <View style={[shellStyles.root, { backgroundColor: colors.background }]} collapsable={false}>
      <FeedDrawerAnimator {...animatorProps}>{children}</FeedDrawerAnimator>
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
  feed: {
    flex: 1,
    zIndex: 2,
    overflow: 'hidden',
  },
  feedInner: {
    flex: 1,
    backfaceVisibility: 'hidden',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
});
