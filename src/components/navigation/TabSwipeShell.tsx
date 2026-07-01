import { type ReactElement, useCallback, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  MAIN_TAB_SWIPE_COMPLETE_MS,
  MAIN_TAB_SWIPE_DISABLED_ROUTES,
  MAIN_TAB_SWIPE_DISTANCE_PX,
  MAIN_TAB_SWIPE_SNAP_RATIO,
  MAIN_TAB_SWIPE_VELOCITY_PX,
  type MainTabRoute,
} from '@/features/navigation/constants';
import { useVisibleMainTabs } from '@/features/navigation/hooks/useVisibleMainTabs';
import {
  mainTabSwipeAnimating,
  mainTabSwipeProgress,
  useMainTabSwipeStore,
} from '@/features/navigation/store/mainTabSwipeStore';
import { useFeedDrawerStore } from '@/features/feed/store/feedDrawerStore';
import { shouldUseMainTabSwipeGesture } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

const TAB_SWIPE_TIMING = {
  duration: MAIN_TAB_SWIPE_COMPLETE_MS,
  easing: Easing.bezier(0.33, 1, 0.68, 1),
};

type TabSwipeShellProps = {
  routeName: string;
  navigation: NavigationProp<ParamListBase>;
  children: ReactElement;
};

export function TabSwipeShell({ routeName, navigation, children }: TabSwipeShellProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const visibleTabs = useVisibleMainTabs();
  const feedDrawerOpen = useFeedDrawerStore((s) => s.open);
  const partnerRoute = useMainTabSwipeStore((s) => s.partnerRoute);
  const partnerSide = useMainTabSwipeStore((s) => s.partnerSide);
  const setPartner = useMainTabSwipeStore((s) => s.setPartner);
  const clearPartner = useMainTabSwipeStore((s) => s.clearPartner);

  const isFeedTab = routeName === 'index';
  const swipeEnabled =
    isFocused &&
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

  const isPartner = partnerRoute === currentRoute;
  const isSwipeDriver = swipeEnabled;

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
      mainTabSwipeProgress.value = 0;
      mainTabSwipeAnimating.value = false;
      clearPartner();
      switchTab(direction);
    },
    [clearPartner, switchTab],
  );

  const resetDrag = useCallback(() => {
    mainTabSwipeProgress.value = 0;
    mainTabSwipeAnimating.value = false;
    clearPartner();
  }, [clearPartner]);

  const syncPartner = useCallback(
    (translationX: number) => {
      if (translationX <= -10 && nextRoute) {
        setPartner(nextRoute, 'right');
        return;
      }
      if (translationX >= 10 && prevRoute) {
        setPartner(prevRoute, 'left');
        return;
      }
      if (Math.abs(translationX) < 6) {
        clearPartner();
      }
    },
    [clearPartner, nextRoute, prevRoute, setPartner],
  );

  const handleSwipeEnd = useCallback(
    (translationX: number, velocityX: number) => {
      const snapDistance = width * MAIN_TAB_SWIPE_SNAP_RATIO;
      const swipedLeft =
        translationX <= -snapDistance || velocityX <= -MAIN_TAB_SWIPE_VELOCITY_PX;
      const swipedRight =
        translationX >= MAIN_TAB_SWIPE_DISTANCE_PX || velocityX >= MAIN_TAB_SWIPE_VELOCITY_PX;

      if (isFeedTab) {
        if (swipedRight) {
          mainTabSwipeAnimating.value = true;
          mainTabSwipeProgress.value = withTiming(0, TAB_SWIPE_TIMING, () => {
            runOnJS(openFeedDrawer)();
            runOnJS(resetDrag)();
          });
          return;
        }
        if (swipedLeft && nextRoute) {
          mainTabSwipeAnimating.value = true;
          mainTabSwipeProgress.value = withTiming(-width, TAB_SWIPE_TIMING, (finished) => {
            if (!finished) return;
            runOnJS(finishTabSwitch)('next');
          });
          return;
        }
        mainTabSwipeAnimating.value = true;
        mainTabSwipeProgress.value = withTiming(0, TAB_SWIPE_TIMING, () => {
          runOnJS(resetDrag)();
        });
        return;
      }

      if (swipedLeft && nextRoute) {
        mainTabSwipeAnimating.value = true;
        mainTabSwipeProgress.value = withTiming(-width, TAB_SWIPE_TIMING, (finished) => {
          if (!finished) return;
          runOnJS(finishTabSwitch)('next');
        });
        return;
      }

      if (swipedRight && prevRoute) {
        mainTabSwipeAnimating.value = true;
        mainTabSwipeProgress.value = withTiming(width, TAB_SWIPE_TIMING, (finished) => {
          if (!finished) return;
          runOnJS(finishTabSwitch)('prev');
        });
        return;
      }

      mainTabSwipeAnimating.value = true;
      mainTabSwipeProgress.value = withTiming(0, TAB_SWIPE_TIMING, () => {
        runOnJS(resetDrag)();
      });
    },
    [
      finishTabSwitch,
      isFeedTab,
      nextRoute,
      openFeedDrawer,
      prevRoute,
      resetDrag,
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
          if (mainTabSwipeAnimating.value) return;
          cancelAnimation(mainTabSwipeProgress);
          if (isFeedTab && nextRoute) {
            runOnJS(setPartner)(nextRoute, 'right');
          }
        })
        .onUpdate((event) => {
          if (mainTabSwipeAnimating.value) return;

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

          mainTabSwipeProgress.value = next;
          runOnJS(syncPartner)(next);
        })
        .onEnd((event) => {
          if (mainTabSwipeAnimating.value) return;
          runOnJS(handleSwipeEnd)(event.translationX, event.velocityX);
        }),
    [handleSwipeEnd, isFeedTab, nextRoute, prevRoute, setPartner, syncPartner, width],
  );

  const sceneStyle = useAnimatedStyle(() => {
    if (isPartner && partnerSide === 'right') {
      return {
        transform: [{ translateX: Math.round(mainTabSwipeProgress.value + width) }],
      };
    }
    if (isPartner && partnerSide === 'left') {
      return {
        transform: [{ translateX: Math.round(mainTabSwipeProgress.value - width) }],
      };
    }
    if (isSwipeDriver) {
      return {
        transform: [{ translateX: Math.round(mainTabSwipeProgress.value) }],
      };
    }
    return {};
  });

  const showPartnerLayer = isPartner && partnerSide !== null;

  if (!swipeEnabled && !showPartnerLayer) {
    return children;
  }

  const content = (
    <Animated.View
      style={[
        showPartnerLayer ? styles.partnerLayer : styles.container,
        sceneStyle,
        { backgroundColor: colors.background },
        isSwipeDriver ? styles.driverLayer : null,
      ]}
      collapsable={false}
      pointerEvents={showPartnerLayer ? 'none' : 'auto'}
    >
      {children}
    </Animated.View>
  );

  if (!isSwipeDriver) {
    return <View style={styles.host}>{content}</View>;
  }

  return (
    <View style={[styles.host, { backgroundColor: colors.background }]}>
      <GestureDetector gesture={pan}>{content}</GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
  },
  driverLayer: {
    zIndex: 2,
  },
  partnerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
