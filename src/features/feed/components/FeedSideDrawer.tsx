import { memo, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, type View as RNView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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
const DRAWER_INTERACTION_PROGRESS = 0.04;
const DRAWER_DISMISS_PROGRESS = 0.45;
const DRAWER_DISMISS_VELOCITY_X = -450;
const DRAWER_AVATAR_SIZE = 48;

/** iOS stack push (ör. puan sıralaması) benzeri açılış — yumuşak hızlanma, tok duruş. */
const DRAWER_OPEN_TIMING = {
  duration: 400,
  easing: Easing.bezier(0.33, 1, 0.68, 1),
};

/** Stack pop benzeri kapanış — hafif ivmeli çıkış. */
const DRAWER_CLOSE_TIMING = {
  duration: 340,
  easing: Easing.bezier(0.32, 0, 0.67, 0),
};

function closeDrawerTiming() {
  'worklet';
  return DRAWER_CLOSE_TIMING;
}

function closeReleaseSpring(velocity: number) {
  'worklet';
  return {
    damping: 32,
    stiffness: 400,
    mass: 0.72,
    overshootClamping: true,
    velocity,
  };
}

function openReleaseSpring(velocity: number) {
  'worklet';
  const speed = Math.min(Math.abs(velocity), 2.5);
  return {
    duration: Math.max(260, 400 - speed * 55),
    easing: Easing.bezier(0.33, 1, 0.68, 1),
  };
}

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
  const progress = useSharedValue(0);
  const drawerWidthSv = useSharedValue(drawerWidth);
  const drawerOpenSv = useSharedValue(useFeedDrawerStore.getState().open ? 1 : 0);
  const dragStartProgress = useSharedValue(0);
  const ownsProgress = useSharedValue(false);
  const feedInnerRef = useRef<RNView>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const setFeedInteractionLocked = useCallback((locked: boolean) => {
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
    setFeedInteractionLocked(useFeedDrawerStore.getState().open);
  }, [ownsProgress, setFeedInteractionLocked]);

  useEffect(() => {
    drawerWidthSv.value = drawerWidth;
  }, [drawerWidth, drawerWidthSv]);

  useEffect(() => {
    const initialOpen = useFeedDrawerStore.getState().open;
    progress.value = initialOpen ? 1 : 0;
    drawerOpenSv.value = initialOpen ? 1 : 0;
    setFeedInteractionLocked(initialOpen);

    return useFeedDrawerStore.subscribe((state, previous) => {
      drawerOpenSv.value = state.open ? 1 : 0;

      if (state.open === previous.open) return;
      if (ownsProgress.value) return;

      cancelAnimation(progress);
      progress.value = state.open
        ? withTiming(1, DRAWER_OPEN_TIMING)
        : withTiming(0, DRAWER_CLOSE_TIMING);

      if (state.open) {
        setFeedInteractionLocked(true);
      }

      if (state.open && Platform.OS !== 'android') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    });
  }, [drawerOpenSv, ownsProgress, progress, setFeedInteractionLocked]);

  useAnimatedReaction(
    () => progress.value,
    (current, previous) => {
      const wasLocked = (previous ?? 0) > DRAWER_INTERACTION_PROGRESS;
      const shouldLock = current > DRAWER_INTERACTION_PROGRESS;
      if (wasLocked === shouldLock) return;

      if (!shouldLock && drawerOpenSv.value > 0) return;

      runOnJS(setFeedInteractionLocked)(shouldLock);
    },
    [drawerOpenSv, setFeedInteractionLocked],
  );

  const feedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.round(progress.value * drawerWidthSv.value) }],
  }));

  const feedSurfaceProps = useAnimatedProps(() => ({
    renderToHardwareTextureAndroid: progress.value > DRAWER_INTERACTION_PROGRESS,
    needsOffscreenAlphaCompositing: progress.value > DRAWER_INTERACTION_PROGRESS,
  }));

  const scrimStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(progress.value, [0, 0.45, 1], [0, scrimMaxOpacity * 0.72, scrimMaxOpacity]),
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
        cancelAnimation(progress);
        dragStartProgress.value = progress.value;
      })
      .onUpdate((event) => {
        const width = Math.max(drawerWidthSv.value, 1);
        const next = dragStartProgress.value + event.translationX / width;
        progress.value = Math.min(1, Math.max(0, next));
      })
      .onEnd((event) => {
        const width = Math.max(drawerWidthSv.value, 1);
        const velocity = event.velocityX / width;
        const shouldClose =
          progress.value < DRAWER_DISMISS_PROGRESS || event.velocityX < DRAWER_DISMISS_VELOCITY_X;

        ownsProgress.value = true;

        if (shouldClose) {
          progress.value = withSpring(0, closeReleaseSpring(velocity), (finished) => {
            if (!finished) return;
            runOnJS(finishGestureAnimation)();
          });
          runOnJS(closeFromGesture)();
          return;
        }

        progress.value = withTiming(1, openReleaseSpring(velocity), (finished) => {
          if (!finished) return;
          runOnJS(finishGestureAnimation)();
        });
      });

    const tap = Gesture.Tap().maxDuration(250).onEnd(() => {
      if (progress.value <= DRAWER_INTERACTION_PROGRESS) return;

      ownsProgress.value = true;
      progress.value = withTiming(0, closeDrawerTiming(), (finished) => {
        if (!finished) return;
        runOnJS(finishGestureAnimation)();
      });
      runOnJS(closeFromGesture)();
    });

    return Gesture.Exclusive(pan, tap);
  }, [
    closeFromGesture,
    dragStartProgress,
    drawerWidthSv,
    finishGestureAnimation,
    ownsProgress,
    progress,
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
          animatedProps={feedSurfaceProps}
          style={[shellStyles.feed, { backgroundColor }, feedStyle]}
          collapsable={false}
        >
          <View ref={feedInnerRef} style={shellStyles.feedInner} collapsable={false}>
            <MemoFeedChildren>{children}</MemoFeedChildren>
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
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
});
