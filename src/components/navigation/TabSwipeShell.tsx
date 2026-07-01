import { type ReactElement, useCallback, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  MAIN_TAB_LABELS,
  MAIN_TAB_SWIPE_COMPLETE_MS,
  MAIN_TAB_SWIPE_DISABLED_ROUTES,
  MAIN_TAB_SWIPE_DISTANCE_PX,
  MAIN_TAB_SWIPE_SNAP_RATIO,
  MAIN_TAB_SWIPE_VELOCITY_PX,
  type MainTabRoute,
} from '@/features/navigation/constants';
import { useVisibleMainTabs } from '@/features/navigation/hooks/useVisibleMainTabs';
import { useFeedDrawerStore } from '@/features/feed/store/feedDrawerStore';
import { shouldUseMainTabSwipeGesture } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

const TAB_PEEK_ICONS: Record<MainTabRoute, keyof typeof Ionicons.glyphMap> = {
  index: 'newspaper-outline',
  discover: 'compass-outline',
  centers: 'grid-outline',
  messages: 'chatbubbles-outline',
  reels: 'play-circle-outline',
  profile: 'person-outline',
};

const TAB_SWIPE_TIMING = {
  duration: MAIN_TAB_SWIPE_COMPLETE_MS,
  easing: Easing.bezier(0.33, 1, 0.68, 1),
};

type TabSwipeShellProps = {
  routeName: string;
  navigation: NavigationProp<ParamListBase>;
  children: ReactElement;
};

type TabPeekProps = {
  route: MainTabRoute;
  side: 'left' | 'right';
  width: number;
};

function TabPeekPanel({ route, side, width }: TabPeekProps) {
  const { colors, isDark } = useTheme();
  const icon = TAB_PEEK_ICONS[route];
  const label = MAIN_TAB_LABELS[route];

  return (
    <View
      style={[
        styles.peek,
        side === 'left' ? styles.peekLeft : styles.peekRight,
        {
          width,
          backgroundColor: isDark ? colors.surfaceElevated : colors.background,
          borderColor: colors.border,
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.peekContent,
          side === 'left' ? styles.peekContentLeft : styles.peekContentRight,
        ]}
      >
        <View style={[styles.peekBadge, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name={icon} size={28} color={colors.primary} />
        </View>
        <Text variant="label" style={styles.peekLabel}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export function TabSwipeShell({ routeName, navigation, children }: TabSwipeShellProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const visibleTabs = useVisibleMainTabs();
  const feedDrawerOpen = useFeedDrawerStore((s) => s.open);
  const isFeedTab = routeName === 'index';
  const swipeEnabled =
    (shouldUseMainTabSwipeGesture() || isFeedTab) &&
    !MAIN_TAB_SWIPE_DISABLED_ROUTES.has(routeName) &&
    !(isFeedTab && feedDrawerOpen);

  const currentRoute = routeName as MainTabRoute;
  const currentIndex = visibleTabs.indexOf(currentRoute);
  const prevRoute = currentIndex > 0 ? visibleTabs[currentIndex - 1] : null;
  const nextRoute =
    currentIndex >= 0 && currentIndex < visibleTabs.length - 1
      ? visibleTabs[currentIndex + 1]
      : null;

  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  const switchTab = useCallback(
    (direction: 'next' | 'prev') => {
      const idx = visibleTabs.indexOf(routeName as MainTabRoute);
      if (idx < 0) return;

      const targetIndex = direction === 'next' ? idx + 1 : idx - 1;
      const targetRoute = visibleTabs[targetIndex];
      if (!targetRoute || targetRoute === routeName) return;

      if (Platform.OS !== 'android') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      navigation.jumpTo(targetRoute);
    },
    [navigation, routeName, visibleTabs],
  );

  const openFeedDrawer = useCallback(() => {
    if (useFeedDrawerStore.getState().open) return;
    useFeedDrawerStore.getState().openDrawer();
    if (Platform.OS === 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const finishTabSwitch = useCallback(
    (direction: 'next' | 'prev') => {
      translateX.value = 0;
      isAnimating.value = false;
      switchTab(direction);
    },
    [isAnimating, switchTab, translateX],
  );

  const resetDrag = useCallback(() => {
    translateX.value = 0;
    isAnimating.value = false;
  }, [isAnimating, translateX]);

  const handleSwipeEnd = useCallback(
    (translationX: number, velocityX: number) => {
      const snapDistance = width * MAIN_TAB_SWIPE_SNAP_RATIO;
      const swipedLeft =
        translationX <= -snapDistance || velocityX <= -MAIN_TAB_SWIPE_VELOCITY_PX;
      const swipedRight =
        translationX >= MAIN_TAB_SWIPE_DISTANCE_PX || velocityX >= MAIN_TAB_SWIPE_VELOCITY_PX;

      if (isFeedTab) {
        if (swipedRight) {
          isAnimating.value = true;
          translateX.value = withTiming(0, TAB_SWIPE_TIMING, () => {
            runOnJS(openFeedDrawer)();
            runOnJS(resetDrag)();
          });
          return;
        }
        if (swipedLeft && nextRoute) {
          isAnimating.value = true;
          translateX.value = withTiming(-width, TAB_SWIPE_TIMING, (finished) => {
            if (!finished) return;
            runOnJS(finishTabSwitch)('next');
          });
          return;
        }
        isAnimating.value = true;
        translateX.value = withTiming(0, TAB_SWIPE_TIMING, () => {
          runOnJS(resetDrag)();
        });
        return;
      }

      if (swipedLeft && nextRoute) {
        isAnimating.value = true;
        translateX.value = withTiming(-width, TAB_SWIPE_TIMING, (finished) => {
          if (!finished) return;
          runOnJS(finishTabSwitch)('next');
        });
        return;
      }

      if (swipedRight && prevRoute) {
        isAnimating.value = true;
        translateX.value = withTiming(width, TAB_SWIPE_TIMING, (finished) => {
          if (!finished) return;
          runOnJS(finishTabSwitch)('prev');
        });
        return;
      }

      isAnimating.value = true;
      translateX.value = withTiming(0, TAB_SWIPE_TIMING, () => {
        runOnJS(resetDrag)();
      });
    },
    [
      finishTabSwitch,
      isAnimating,
      isFeedTab,
      nextRoute,
      openFeedDrawer,
      prevRoute,
      resetDrag,
      translateX,
      width,
    ],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .activeOffsetX([-24, 24])
        .failOffsetY([-18, 18])
        .onStart(() => {
          if (isAnimating.value) return;
          cancelAnimation(translateX);
        })
        .onUpdate((event) => {
          if (isAnimating.value) return;

          let next = event.translationX;
          const maxRight = isFeedTab ? width * 0.22 : prevRoute ? width : width * 0.14;
          const maxLeft = nextRoute ? -width : -width * 0.14;

          if (!prevRoute && next > 0) {
            next = maxRight * (1 - Math.exp(-Math.abs(next) / (width * 0.45)));
          } else if (!nextRoute && next < 0) {
            next = -Math.abs(maxLeft) * (1 - Math.exp(-Math.abs(next) / (width * 0.45)));
          } else if (isFeedTab && next > 0) {
            next = Math.min(next, maxRight);
          } else {
            next = Math.max(maxLeft, Math.min(maxRight, next));
          }

          translateX.value = next;
        })
        .onEnd((event) => {
          if (isAnimating.value) return;
          runOnJS(handleSwipeEnd)(event.translationX, event.velocityX);
        }),
    [handleSwipeEnd, isAnimating, isFeedTab, nextRoute, prevRoute, translateX, width],
  );

  const sceneStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.round(translateX.value) }],
  }));

  const nextPeekStyle = useAnimatedStyle(() => ({
    opacity: nextRoute ? Math.min(1, Math.abs(translateX.value) / (width * 0.55)) : 0,
  }));

  const prevPeekStyle = useAnimatedStyle(() => ({
    opacity: prevRoute ? Math.min(1, Math.abs(translateX.value) / (width * 0.55)) : 0,
  }));

  if (!swipeEnabled) {
    return children;
  }

  return (
    <View style={[styles.host, { backgroundColor: colors.background }]}>
      {nextRoute ? (
        <Animated.View style={[styles.peekLayer, nextPeekStyle]}>
          <TabPeekPanel route={nextRoute} side="right" width={width} />
        </Animated.View>
      ) : null}
      {prevRoute ? (
        <Animated.View style={[styles.peekLayer, prevPeekStyle]}>
          <TabPeekPanel route={prevRoute} side="left" width={width} />
        </Animated.View>
      ) : null}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.container, sceneStyle, { backgroundColor: colors.background }]} collapsable={false}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    overflow: 'hidden',
  },
  peekLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  container: {
    flex: 1,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  peek: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
  },
  peekContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 28,
    maxWidth: '72%',
  },
  peekContentLeft: {
    alignItems: 'flex-end',
    alignSelf: 'flex-start',
  },
  peekContentRight: {
    alignItems: 'flex-start',
    alignSelf: 'flex-end',
  },
  peekLeft: {
    left: 0,
  },
  peekRight: {
    right: 0,
  },
  peekBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekLabel: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
