import { memo, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View, type View as RNView } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AccountSwitchBar } from '@/features/account-switch/components/AccountSwitchBar';
import { CanlarContributionCard } from '@/features/vora-canlar/components/CanlarContributionCard';
import { useAuth } from '@/providers/AuthProvider';
import {
  PROFILE_DRAWER_DISMISS_PROGRESS,
  PROFILE_DRAWER_DISMISS_VELOCITY_X,
  PROFILE_DRAWER_HAPTIC_PROGRESS,
  PROFILE_DRAWER_OPEN_PROGRESS,
  PROFILE_DRAWER_OPEN_VELOCITY_X,
  PROFILE_DRAWER_WIDTH_RATIO,
} from '@/features/profile/constants/drawer';
import {
  useProfilePageActions,
  type ProfilePageAction,
} from '@/features/profile/hooks/useProfilePageActions';
import {
  profileDrawerExternallyOwned,
  profileDrawerProgress,
  profileDrawerWidthPx,
} from '@/features/profile/store/profileDrawerProgress';
import { useProfileDrawerStore } from '@/features/profile/store/profileDrawerStore';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { getFloatingTabBarReserve } from '@/constants/tabBar';
import { useStableTabBarInset } from '@/hooks/useStableTabBarInset';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const DRAWER_INTERACTION_PROGRESS = 0.04;
const TABLET_INSTANT_DRAWER = isAndroidTablet();
const DRAWER_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

const DRAWER_OPEN_TIMING = {
  duration: TABLET_INSTANT_DRAWER ? 0 : 280,
  easing: DRAWER_EASE,
};

const DRAWER_CLOSE_TIMING = {
  duration: TABLET_INSTANT_DRAWER ? 0 : 240,
  easing: DRAWER_EASE,
};

function triggerDrawerHaptic() {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

type ProfileDrawerShellProps = {
  enabled?: boolean;
  isPremium?: boolean;
  onInsightsPress?: () => void;
  onSoundStatsPress?: () => void;
  soundStatsActive?: boolean;
  showMenuButton?: boolean;
  children: ReactNode;
};

type MenuProps = {
  isPremium: boolean;
  onInsightsPress?: () => void;
  onSoundStatsPress?: () => void;
  soundStatsActive: boolean;
  onNavigate: () => void;
};

function ProfileDrawerMenu({
  isPremium,
  onInsightsPress,
  onSoundStatsPress,
  soundStatsActive,
  onNavigate,
}: MenuProps) {
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = useStableTabBarInset();
  const listBottomInset = getFloatingTabBarReserve(tabBarBottomInset) + spacing.sm;
  const { colors } = useTheme();
  const { user } = useAuth();
  const actions = useProfilePageActions({
    isPremium,
    onInsightsPress,
    onSoundStatsPress,
    soundStatsActive,
  });

  const toneColor = (action: ProfilePageAction) => {
    if (action.active) return colors.accent;
    if (action.tone === 'premium') return '#FFB300';
    if (action.tone === 'wallet') return colors.warning;
    if (action.tone === 'admin') return colors.primary;
    if (action.tone === 'provider') return VORA_HIZMETLER_ACCENT;
    return colors.text;
  };

  return (
    <ScrollView
      style={styles.menuScroll}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingBottom: listBottomInset,
        paddingHorizontal: spacing.sm,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      directionalLockEnabled
    >
      <Text variant="label" style={[styles.menuTitle, { color: colors.text }]}>
        Menü
      </Text>
      <View style={styles.accountSlot}>
        <AccountSwitchBar />
      </View>
      {user?.id ? (
        <CanlarContributionCard
          userId={user.id}
          isOwnProfile
          onNavigate={onNavigate}
          style={styles.canlarCard}
        />
      ) : null}
      {actions.map((action) => {
        const color = toneColor(action);
        return (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              action.onPress();
              onNavigate();
            }}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: `${colors.text}0A` },
              action.active && { backgroundColor: `${colors.accent}14` },
            ]}
          >
            <Ionicons name={action.icon} size={22} color={color} style={styles.rowIcon} />
            <Text variant="body" numberOfLines={1} style={[styles.rowLabel, { color }]}>
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

type AnimatorProps = {
  drawerWidth: number;
  backgroundColor: string;
  scrimMaxOpacity: number;
  menu: ReactNode;
  edgeColor: string;
  showMenuButton: boolean;
  children: ReactNode;
};

const ProfileDrawerAnimator = memo(function ProfileDrawerAnimator({
  drawerWidth,
  backgroundColor,
  scrimMaxOpacity,
  menu,
  edgeColor,
  showMenuButton,
  children,
}: AnimatorProps) {
  const progress = profileDrawerProgress;
  const ownsProgress = useSharedValue(false);
  const drawerOpenSv = useSharedValue(0);
  const dragStartProgress = useSharedValue(0);
  const hapticArmed = useSharedValue(0);
  const drawerOpen = useProfileDrawerStore((s) => s.open);
  const innerRef = useRef<RNView>(null);

  const setContentLocked = useCallback((locked: boolean) => {
    innerRef.current?.setNativeProps?.({
      pointerEvents: locked ? 'none' : 'auto',
    });
  }, []);

  const markOpen = useCallback(() => {
    useProfileDrawerStore.getState().openDrawer();
    setContentLocked(true);
  }, [setContentLocked]);

  const markClosed = useCallback(() => {
    useProfileDrawerStore.getState().closeDrawer();
  }, []);

  const finishClose = useCallback(() => {
    ownsProgress.value = false;
    profileDrawerExternallyOwned.value = false;
    setContentLocked(false);
  }, [ownsProgress, setContentLocked]);

  const settle = useCallback(
    (shouldOpen: boolean, velocityX: number) => {
      const width = Math.max(profileDrawerWidthPx.value, 1);
      const speed = Math.min(Math.abs(velocityX / width), 2.2);
      const timing = TABLET_INSTANT_DRAWER
        ? { duration: 0, easing: Easing.linear }
        : {
            duration: Math.max(shouldOpen ? 180 : 160, (shouldOpen ? 280 : 240) - speed * 40),
            easing: DRAWER_EASE,
          };
      ownsProgress.value = true;
      profileDrawerExternallyOwned.value = false;
      if (shouldOpen) {
        progress.value = withTiming(1, timing, (finished) => {
          if (!finished && progress.value < 0.98) return;
          ownsProgress.value = false;
        });
        markOpen();
        return;
      }
      progress.value = withTiming(0, timing, (finished) => {
        if (!finished && progress.value > 0.02) return;
        runOnJS(finishClose)();
      });
      markClosed();
    },
    [finishClose, markClosed, markOpen, ownsProgress, progress],
  );

  useEffect(() => {
    profileDrawerWidthPx.value = drawerWidth;
  }, [drawerWidth]);

  useEffect(() => {
    const initialOpen = useProfileDrawerStore.getState().open;
    if (!profileDrawerExternallyOwned.value) {
      progress.value = initialOpen ? 1 : 0;
    }
    drawerOpenSv.value = initialOpen ? 1 : 0;
    setContentLocked(initialOpen);

    return useProfileDrawerStore.subscribe((state, previous) => {
      drawerOpenSv.value = state.open ? 1 : 0;
      if (state.open === previous.open) return;
      if (profileDrawerExternallyOwned.value || ownsProgress.value) {
        if (state.open) setContentLocked(true);
        return;
      }
      cancelAnimation(progress);
      if (state.open) {
        setContentLocked(true);
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
      if (progress.value <= 0.02) {
        progress.value = 0;
        setContentLocked(false);
        return;
      }
      progress.value = withTiming(0, DRAWER_CLOSE_TIMING, (finished) => {
        if (!finished && progress.value > 0.02) return;
        runOnJS(setContentLocked)(false);
      });
    });
  }, [drawerOpenSv, ownsProgress, progress, setContentLocked]);

  useAnimatedReaction(
    () => progress.value,
    (value, previous) => {
      if (value > 0.02) return;
      if (drawerOpenSv.value === 1) return;
      if ((previous ?? 1) <= 0.02) return;
      ownsProgress.value = false;
      profileDrawerExternallyOwned.value = false;
      runOnJS(setContentLocked)(false);
    },
  );

  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * profileDrawerWidthPx.value }],
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * profileDrawerWidthPx.value }],
  }));

  const scrimStyle = useAnimatedStyle(
    () => ({ opacity: progress.value * scrimMaxOpacity }),
    [scrimMaxOpacity],
  );

  const contentGesture = useMemo(() => {
    const dismissPan = Gesture.Pan()
      .enabled(drawerOpen && Platform.OS !== 'web')
      .maxPointers(1)
      .activeOffsetX(12)
      .failOffsetY([-36, 36])
      .onStart(() => {
        ownsProgress.value = true;
        profileDrawerExternallyOwned.value = false;
        cancelAnimation(progress);
        dragStartProgress.value = progress.value;
        runOnJS(setContentLocked)(true);
      })
      .onUpdate((event) => {
        const width = Math.max(profileDrawerWidthPx.value, 1);
        const next = dragStartProgress.value - event.translationX / width;
        progress.value = Math.min(1, Math.max(0, next));
      })
      .onEnd((event) => {
        const shouldClose =
          progress.value < PROFILE_DRAWER_DISMISS_PROGRESS ||
          event.velocityX >= PROFILE_DRAWER_DISMISS_VELOCITY_X;
        runOnJS(settle)(!shouldClose, event.velocityX);
      });

    const closeTap = Gesture.Tap()
      .enabled(drawerOpen && Platform.OS !== 'web')
      .maxDuration(280)
      .maxDistance(18)
      .onEnd((_event, success) => {
        if (!success) return;
        if (progress.value <= DRAWER_INTERACTION_PROGRESS) return;
        runOnJS(settle)(false, 0);
      });

    const openPan = Gesture.Pan()
      .enabled(!drawerOpen && Platform.OS === 'android')
      .maxPointers(1)
      .activeOffsetX(-24)
      .failOffsetY([-22, 22])
      .onStart(() => {
        ownsProgress.value = true;
        profileDrawerExternallyOwned.value = false;
        cancelAnimation(progress);
        dragStartProgress.value = progress.value;
        hapticArmed.value = 0;
      })
      .onUpdate((event) => {
        const width = Math.max(profileDrawerWidthPx.value, 1);
        const next = dragStartProgress.value - event.translationX / width;
        const clamped = Math.min(1, Math.max(0, next));
        progress.value = clamped;
        if (hapticArmed.value === 0 && clamped >= PROFILE_DRAWER_HAPTIC_PROGRESS) {
          hapticArmed.value = 1;
          runOnJS(triggerDrawerHaptic)();
        }
      })
      .onEnd((event) => {
        const shouldOpen =
          progress.value >= PROFILE_DRAWER_OPEN_PROGRESS ||
          event.velocityX <= PROFILE_DRAWER_OPEN_VELOCITY_X;
        runOnJS(settle)(shouldOpen, event.velocityX);
      });

    if (drawerOpen) return Gesture.Exclusive(dismissPan, closeTap);
    return openPan;
  }, [
    drawerOpen,
    dragStartProgress,
    hapticArmed,
    ownsProgress,
    progress,
    setContentLocked,
    settle,
  ]);

  const drawerGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(drawerOpen && Platform.OS !== 'web')
      .maxPointers(1)
      .activeOffsetX(12)
      .failOffsetY([-28, 28])
      .onStart(() => {
        ownsProgress.value = true;
        profileDrawerExternallyOwned.value = false;
        cancelAnimation(progress);
        dragStartProgress.value = progress.value;
      })
      .onUpdate((event) => {
        const width = Math.max(profileDrawerWidthPx.value, 1);
        const next = dragStartProgress.value - event.translationX / width;
        progress.value = Math.min(1, Math.max(0, next));
      })
      .onEnd((event) => {
        const shouldClose =
          progress.value < PROFILE_DRAWER_DISMISS_PROGRESS ||
          event.velocityX >= PROFILE_DRAWER_DISMISS_VELOCITY_X;
        runOnJS(settle)(!shouldClose, event.velocityX);
      });
  }, [drawerOpen, dragStartProgress, ownsProgress, progress, settle]);

  const pageBody = (
    <View style={styles.pageInner} collapsable={false}>
      <View ref={innerRef} style={styles.pageInner} collapsable={false} pointerEvents="box-none">
        {children}
      </View>
      {Platform.OS === 'web' ? (
        <Pressable
          pointerEvents={drawerOpen ? 'auto' : 'none'}
          style={styles.scrimHit}
          onPress={() => settle(false, 0)}
        >
          <Animated.View pointerEvents="none" style={[styles.scrimShade, scrimStyle]} />
        </Pressable>
      ) : (
        <Animated.View pointerEvents="none" style={[styles.scrim, scrimStyle]} />
      )}
    </View>
  );

  return (
    <>
      <GestureDetector gesture={drawerGesture}>
        <Animated.View
          style={[
            styles.drawer,
            { width: drawerWidth, backgroundColor, borderLeftColor: edgeColor },
            drawerStyle,
          ]}
          collapsable={false}
        >
          {menu}
        </Animated.View>
      </GestureDetector>
      <Animated.View style={[styles.page, { backgroundColor }, pageStyle]} collapsable={false}>
        {Platform.OS === 'web' ? pageBody : <GestureDetector gesture={contentGesture}>{pageBody}</GestureDetector>}
        {showMenuButton ? (
          <View pointerEvents="box-none" style={styles.menuButtonSlot}>
            <ProfileMenuButton />
          </View>
        ) : null}
      </Animated.View>
    </>
  );
});

export function ProfileDrawerShell({
  enabled = true,
  isPremium = false,
  onInsightsPress,
  onSoundStatsPress,
  soundStatsActive = false,
  showMenuButton = true,
  children,
}: ProfileDrawerShellProps) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const drawerWidth = width * PROFILE_DRAWER_WIDTH_RATIO;
  const closeDrawer = useProfileDrawerStore((s) => s.closeDrawer);

  const handleNavigate = useCallback(() => {
    closeDrawer();
  }, [closeDrawer]);

  const menu = useMemo(
    () => (
      <ProfileDrawerMenu
        isPremium={isPremium}
        onInsightsPress={onInsightsPress}
        onSoundStatsPress={onSoundStatsPress}
        soundStatsActive={soundStatsActive}
        onNavigate={handleNavigate}
      />
    ),
    [handleNavigate, isPremium, onInsightsPress, onSoundStatsPress, soundStatsActive],
  );

  if (!enabled) return <>{children}</>;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} collapsable={false}>
      <ProfileDrawerAnimator
        drawerWidth={drawerWidth}
        backgroundColor={colors.background}
        scrimMaxOpacity={isDark ? 0.48 : 0.38}
        edgeColor={colors.border}
        showMenuButton={showMenuButton}
        menu={menu}
      >
        {children}
      </ProfileDrawerAnimator>
    </View>
  );
}

export function ProfileMenuButton() {
  const { colors } = useTheme();
  const open = useProfileDrawerStore((s) => s.open);
  const toggleDrawer = useProfileDrawerStore((s) => s.toggleDrawer);

  return (
    <Pressable
      onPress={toggleDrawer}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={open ? 'Menüyü kapat' : 'Menüyü aç'}
      style={({ pressed }) => [
        styles.menuButton,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={open ? 'close' : 'menu'} size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  page: {
    flex: 1,
    minHeight: 0,
    zIndex: 2,
    overflow: 'hidden',
  },
  pageInner: { flex: 1, minHeight: 0 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  scrimHit: {
    ...StyleSheet.absoluteFillObject,
  },
  scrimShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  menuScroll: { flex: 1 },
  menuTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  accountSlot: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xs },
  canlarCard: { marginHorizontal: spacing.sm, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderRadius: radius.md,
  },
  rowIcon: { width: 24, textAlign: 'center' },
  rowLabel: { flex: 1, fontSize: 17, fontWeight: '500', letterSpacing: -0.2 },
  menuButtonSlot: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 40,
    height: 40,
    zIndex: 4,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
