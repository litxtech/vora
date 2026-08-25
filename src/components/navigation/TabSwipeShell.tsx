import { type ReactElement, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  MAIN_TAB_SWIPE_COMPLETE_MS,
  MAIN_TAB_SWIPE_DISABLED_ROUTES,
  MAIN_TAB_SWIPE_DISTANCE_PX,
  MAIN_TAB_SWIPE_EDGE_RESISTANCE,
  MAIN_TAB_SWIPE_SNAP_RATIO,
  MAIN_TAB_SWIPE_VELOCITY_PX,
  type MainTabRoute,
} from '@/features/navigation/constants';
import { useVisibleMainTabs } from '@/features/navigation/hooks/useVisibleMainTabs';
import {
  mainTabSwipeAnimating,
  mainTabSwipeLandingRoute,
  mainTabSwipeProgress,
  useMainTabSwipeStore,
} from '@/features/navigation/store/mainTabSwipeStore';
import {
  FEED_DRAWER_ACTIVATE_TX_PX,
  FEED_DRAWER_DOMINANCE_RATIO,
  FEED_DRAWER_HAPTIC_PROGRESS,
  FEED_DRAWER_OPEN_PROGRESS,
  FEED_DRAWER_OPEN_VELOCITY_X,
  FEED_DRAWER_WIDTH_RATIO,
} from '@/features/feed/constants/drawer';
import {
  feedDrawerExternallyOwned,
  feedDrawerProgress,
  feedDrawerWidthPx,
} from '@/features/feed/store/feedDrawerProgress';
import { useFeedDrawerStore } from '@/features/feed/store/feedDrawerStore';
import { shouldUseMainTabSwipeGesture } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

const TAB_COMPLETE_EASING = Easing.bezier(0.2, 0.9, 0.2, 1);

const TAB_CANCEL_SPRING = {
  damping: 34,
  stiffness: 440,
  mass: 0.65,
  overshootClamping: true,
};

type TabSwipeNavigation = {
  jumpTo: (routeName: string) => void;
};

type TabSwipeShellProps = {
  routeName: string;
  navigation: TabSwipeNavigation;
  children: ReactElement;
};

function rubberBand(offset: number, limit: number, dimension: number, resistance: number) {
  'worklet';
  const absLimit = Math.abs(limit);
  if (absLimit <= 0) return 0;
  const sign = offset < 0 ? -1 : 1;
  const abs = Math.abs(offset);
  return sign * absLimit * (1 - Math.exp(-abs / (dimension * resistance)));
}

function setFeedListInteractionLocked(locked: boolean) {
  useFeedDrawerStore.getState().setListInteractionLocked(locked);
}

export function TabSwipeShell({ routeName, navigation, children }: TabSwipeShellProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const visibleTabs = useVisibleMainTabs();
  const feedDrawerOpen = useFeedDrawerStore((s) => s.open);
  const activeRoute = useMainTabSwipeStore((s) => s.activeRoute);
  const setActiveRoute = useMainTabSwipeStore((s) => s.setActiveRoute);
  const setWarmRoutes = useMainTabSwipeStore((s) => s.setWarmRoutes);

  const drawerHapticFired = useSharedValue(false);
  const drawerDragActive = useSharedValue(false);
  const hasPrevSv = useSharedValue(0);
  const hasNextSv = useSharedValue(0);
  const isFeedSv = useSharedValue(0);
  const widthSv = useSharedValue(width);
  const isSwipeDriverSv = useSharedValue(0);

  const swipeSharedReady = Boolean(
    mainTabSwipeProgress && mainTabSwipeAnimating && mainTabSwipeLandingRoute,
  );

  const isFeedTab = routeName === 'index';
  // Drawer açıkken jest kapalı olsa da aynı wrapper kalmalı — ağaç değişince
  // feed remount olup hamburger aç/kapa titremesi yaratıyordu.
  const routeSupportsSwipe =
    swipeSharedReady &&
    (shouldUseMainTabSwipeGesture() || isFeedTab) &&
    !MAIN_TAB_SWIPE_DISABLED_ROUTES.has(routeName);

  const swipeEnabled =
    isFocused && routeSupportsSwipe && !(isFeedTab && feedDrawerOpen);

  const currentRoute = routeName as MainTabRoute;
  const currentIndex = visibleTabs.indexOf(currentRoute);
  const activeIndex = activeRoute ? visibleTabs.indexOf(activeRoute) : -1;
  const prevRoute = currentIndex > 0 ? visibleTabs[currentIndex - 1] : null;
  const nextRoute =
    currentIndex >= 0 && currentIndex < visibleTabs.length - 1
      ? visibleTabs[currentIndex + 1]
      : null;

  const neighborSide =
    !isFocused && activeIndex >= 0 && currentIndex >= 0
      ? currentIndex === activeIndex + 1
        ? ('right' as const)
        : currentIndex === activeIndex - 1
          ? ('left' as const)
          : null
      : null;

  const isNeighbor = neighborSide !== null;

  useLayoutEffect(() => {
    isSwipeDriverSv.value = isFocused && routeSupportsSwipe ? 1 : 0;
  }, [isFocused, isSwipeDriverSv, routeSupportsSwipe]);

  useLayoutEffect(() => {
    widthSv.value = width;
  }, [width, widthSv]);

  useLayoutEffect(() => {
    hasPrevSv.value = prevRoute ? 1 : 0;
    hasNextSv.value = nextRoute ? 1 : 0;
    isFeedSv.value = isFeedTab ? 1 : 0;
  }, [hasNextSv, hasPrevSv, isFeedSv, isFeedTab, nextRoute, prevRoute]);

  // Progress sıfırlamayı boyamadan önce yap — finishTabSwitch içinde sıfırlamak
  // eski sekmeyi bir kareliğine geri getirip boş/yanlış flash yaratıyordu.
  useLayoutEffect(() => {
    if (!isFocused) return;
    if (!mainTabSwipeProgress || !mainTabSwipeAnimating || !mainTabSwipeLandingRoute) return;
    setActiveRoute(currentRoute);
    cancelAnimation(mainTabSwipeProgress);
    mainTabSwipeLandingRoute.value = null;
    mainTabSwipeProgress.value = 0;
    mainTabSwipeAnimating.value = false;
  }, [currentRoute, isFocused, setActiveRoute]);

  useEffect(() => {
    if (!isFocused) return;
    const warm: MainTabRoute[] = [];
    if (prevRoute) warm.push(prevRoute);
    if (nextRoute) warm.push(nextRoute);
    setWarmRoutes(warm);
  }, [currentRoute, isFocused, nextRoute, prevRoute, setWarmRoutes]);

  const switchTab = useCallback(
    (direction: 'next' | 'prev') => {
      const idx = visibleTabs.indexOf(routeName as MainTabRoute);
      if (idx < 0) return false;
      const targetIndex = direction === 'next' ? idx + 1 : idx - 1;
      const targetRoute = visibleTabs[targetIndex];
      if (!targetRoute || targetRoute === routeName) return false;

      if (Platform.OS !== 'android') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      // Hedef sekme odaklı render'da progress hâlâ ±width iken kaybolmasın.
      if (mainTabSwipeLandingRoute) {
        mainTabSwipeLandingRoute.value = targetRoute;
      }
      navigation.jumpTo(targetRoute);
      return true;
    },
    [navigation, routeName, visibleTabs],
  );

  const cancelFeedDrawerReveal = useCallback(() => {
    feedDrawerExternallyOwned.value = false;
    useFeedDrawerStore.getState().forceUnlockInteractions();
  }, []);

  const openFeedDrawer = useCallback(() => {
    // Önce store'u aç (externallyOwned hâlâ true) — FeedSideDrawer yeniden
    // withTiming başlatmasın; sonra ownership bırak.
    if (!useFeedDrawerStore.getState().open) {
      useFeedDrawerStore.getState().openDrawer();
    }
    feedDrawerExternallyOwned.value = false;
    if (Platform.OS === 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const fireDrawerHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const finishTabSwitch = useCallback(
    (direction: 'next' | 'prev') => {
      // Animasyon ±width'te kalsın; jumpTo sonrası odaklı sekmenin
      // useLayoutEffect'i boyamadan önce progress'i 0 yapar.
      const switched = switchTab(direction);
      if (!switched) {
        if (mainTabSwipeLandingRoute) mainTabSwipeLandingRoute.value = null;
        if (mainTabSwipeProgress) mainTabSwipeProgress.value = 0;
        if (mainTabSwipeAnimating) mainTabSwipeAnimating.value = false;
      }
    },
    [switchTab],
  );

  const resetDrag = useCallback(() => {
    if (mainTabSwipeLandingRoute) mainTabSwipeLandingRoute.value = null;
    if (mainTabSwipeProgress) mainTabSwipeProgress.value = 0;
    if (mainTabSwipeAnimating) mainTabSwipeAnimating.value = false;
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(swipeEnabled)
        .maxPointers(1)
        // Dikey scroll kazanır: X eşiği yüksek, Y fail eşiği düşük.
        .activeOffsetX([-28, 28])
        .failOffsetY([-14, 14])
        .onStart(() => {
          if (mainTabSwipeAnimating == null || mainTabSwipeProgress == null) return;
          if (mainTabSwipeAnimating.value) {
            cancelAnimation(mainTabSwipeProgress);
            mainTabSwipeAnimating.value = false;
          }
          drawerHapticFired.value = false;
          drawerDragActive.value = false;
        })
        .onUpdate((event) => {
          if (mainTabSwipeAnimating == null || mainTabSwipeProgress == null) return;
          if (mainTabSwipeAnimating.value) return;

          const screenW = widthSv.value;
          const feed = isFeedSv.value === 1;
          const absX = Math.abs(event.translationX);
          const absY = Math.abs(event.translationY);
          const horizontalDominant = absX > absY * FEED_DRAWER_DOMINANCE_RATIO;

          if (feed && event.translationX > 0 && (drawerDragActive.value || horizontalDominant)) {
            if (!drawerDragActive.value && event.translationX < FEED_DRAWER_ACTIVATE_TX_PX) {
              return;
            }

            const drawerWidth = Math.max(
              feedDrawerWidthPx.value,
              screenW * FEED_DRAWER_WIDTH_RATIO,
            );
            let nextProgress = event.translationX / drawerWidth;
            if (nextProgress > 1) {
              nextProgress =
                1 +
                rubberBand(
                  event.translationX - drawerWidth,
                  drawerWidth * 0.1,
                  screenW,
                  0.55,
                ) /
                  drawerWidth;
              nextProgress = Math.min(nextProgress, 1.06);
            }
            nextProgress = Math.max(0, nextProgress);

            if (!drawerDragActive.value) {
              drawerDragActive.value = true;
              feedDrawerExternallyOwned.value = true;
              cancelAnimation(feedDrawerProgress);
              runOnJS(setFeedListInteractionLocked)(true);
            }

            feedDrawerProgress.value = Math.min(nextProgress, 1);
            mainTabSwipeProgress.value = 0;

            if (!drawerHapticFired.value && nextProgress >= FEED_DRAWER_HAPTIC_PROGRESS) {
              drawerHapticFired.value = true;
              runOnJS(fireDrawerHaptic)();
            }
            return;
          }

          if (drawerDragActive.value && event.translationX <= 0) {
            drawerDragActive.value = false;
            feedDrawerExternallyOwned.value = true;
            feedDrawerProgress.value = withTiming(0, {
              duration: 140,
              easing: Easing.out(Easing.cubic),
            });
            runOnJS(cancelFeedDrawerReveal)();
          }

          // Feed'de dikey kaydırma sırasında hafif yatay sapmayı tab swipe sayma.
          if (feed && !horizontalDominant) {
            mainTabSwipeProgress.value = 0;
            return;
          }

          let next = event.translationX;
          const canPrev = hasPrevSv.value === 1;
          const canNext = hasNextSv.value === 1;
          const maxRight = canPrev ? screenW : screenW * 0.12;
          const maxLeft = canNext ? -screenW : -screenW * 0.12;

          if (!canPrev && next > 0) {
            next = rubberBand(next, maxRight, screenW, MAIN_TAB_SWIPE_EDGE_RESISTANCE);
          } else if (!canNext && next < 0) {
            next = rubberBand(next, maxLeft, screenW, MAIN_TAB_SWIPE_EDGE_RESISTANCE);
          } else {
            next = Math.max(maxLeft, Math.min(maxRight, next));
          }

          mainTabSwipeProgress.value = next;
        })
        .onEnd((event) => {
          if (mainTabSwipeAnimating == null || mainTabSwipeProgress == null) return;
          if (mainTabSwipeAnimating.value) return;

          const screenW = widthSv.value;
          const feed = isFeedSv.value === 1;
          const wasDrawer = drawerDragActive.value;
          const tx = event.translationX;
          const vx = event.velocityX;
          const snapDistance = screenW * MAIN_TAB_SWIPE_SNAP_RATIO;

          if (feed && wasDrawer) {
            drawerDragActive.value = false;
            const drawerWidth = Math.max(
              feedDrawerWidthPx.value,
              screenW * FEED_DRAWER_WIDTH_RATIO,
            );
            const progress = Math.min(1, Math.max(0, tx / drawerWidth));
            const shouldOpen =
              progress >= FEED_DRAWER_OPEN_PROGRESS || vx >= FEED_DRAWER_OPEN_VELOCITY_X;

            mainTabSwipeProgress.value = 0;
            mainTabSwipeAnimating.value = false;
            feedDrawerExternallyOwned.value = true;

            if (shouldOpen) {
              const speed = Math.min(Math.abs(vx / drawerWidth), 2.2);
              feedDrawerProgress.value = withTiming(
                1,
                {
                  duration: Math.max(180, 280 - speed * 40),
                  easing: TAB_COMPLETE_EASING,
                },
                (finished) => {
                  if (!finished) return;
                  runOnJS(openFeedDrawer)();
                },
              );
            } else {
              feedDrawerProgress.value = withTiming(
                0,
                {
                  duration: Math.max(160, 240 - Math.min(Math.abs(vx / drawerWidth), 2) * 35),
                  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                },
                (finished) => {
                  if (!finished) return;
                  runOnJS(cancelFeedDrawerReveal)();
                },
              );
            }
            return;
          }

          const swipedLeft = tx <= -snapDistance || vx <= -MAIN_TAB_SWIPE_VELOCITY_PX;
          const swipedRight = tx >= MAIN_TAB_SWIPE_DISTANCE_PX || vx >= MAIN_TAB_SWIPE_VELOCITY_PX;
          const canNext = hasNextSv.value === 1;
          const canPrev = hasPrevSv.value === 1;

          if (swipedLeft && canNext) {
            mainTabSwipeAnimating.value = true;
            const speed = Math.min(Math.abs(vx) / screenW, 2.8);
            mainTabSwipeProgress.value = withTiming(
              -screenW,
              {
                duration: Math.max(170, MAIN_TAB_SWIPE_COMPLETE_MS - speed * 40),
                easing: TAB_COMPLETE_EASING,
              },
              (finished) => {
                if (!finished) return;
                runOnJS(finishTabSwitch)('next');
              },
            );
            return;
          }

          if (swipedRight && canPrev) {
            mainTabSwipeAnimating.value = true;
            const speed = Math.min(Math.abs(vx) / screenW, 2.8);
            mainTabSwipeProgress.value = withTiming(
              screenW,
              {
                duration: Math.max(170, MAIN_TAB_SWIPE_COMPLETE_MS - speed * 40),
                easing: TAB_COMPLETE_EASING,
              },
              (finished) => {
                if (!finished) return;
                runOnJS(finishTabSwitch)('prev');
              },
            );
            return;
          }

          mainTabSwipeAnimating.value = true;
          mainTabSwipeProgress.value = withSpring(
            0,
            { ...TAB_CANCEL_SPRING, velocity: vx },
            (finished) => {
              if (!finished) return;
              mainTabSwipeAnimating.value = false;
              runOnJS(resetDrag)();
            },
          );
        })
        .onFinalize((_, success) => {
          if (success) return;
          if (!drawerDragActive.value) return;
          drawerDragActive.value = false;
          feedDrawerExternallyOwned.value = true;
          feedDrawerProgress.value = withTiming(
            0,
            { duration: 220, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
            (finished) => {
              if (!finished) return;
              runOnJS(cancelFeedDrawerReveal)();
            },
          );
        }),
    [
      cancelFeedDrawerReveal,
      finishTabSwitch,
      fireDrawerHaptic,
      openFeedDrawer,
      resetDrag,
      swipeEnabled,
    ],
  );

  const sceneStyle = useAnimatedStyle(() => {
    const progressSv = mainTabSwipeProgress;
    const landingSv = mainTabSwipeLandingRoute;
    if (progressSv == null) return {};
    const progress = progressSv.value;
    if (isNeighbor && neighborSide === 'right') {
      return { transform: [{ translateX: progress + width }] };
    }
    if (isNeighbor && neighborSide === 'left') {
      return { transform: [{ translateX: progress - width }] };
    }
    // Drawer açıkken jest kapalı olsa da aynı transform stilini tut —
    // {} dönüşü önceki translate'i bozup titreme yapabiliyordu.
    if (isSwipeDriverSv.value === 1) {
      if (landingSv != null && landingSv.value === routeName) {
        return { transform: [{ translateX: 0 }] };
      }
      return { transform: [{ translateX: progress }] };
    }
    return { transform: [{ translateX: 0 }] };
  }, [isNeighbor, neighborSide, routeName, width]);

  // Ağaç her durumda aynı kalsın — odak/komşu geçişinde GestureDetector
  // eklenip çıkarılınca children remount olup içerikler sonradan geliyordu.
  // activeRoute === routeName: kök stack'te detay açılınca sekme blur olur ama
  // hâlâ seçili sekmedir. opacity:0 yapılmazsa geri kaydırırken boş flash olmaz.
  const showScene = isFocused || isNeighbor || activeRoute === routeName;
  const keepSwipeShell = isFocused && routeSupportsSwipe;

  return (
    <View
      style={[
        styles.host,
        { backgroundColor: colors.background },
        !showScene ? styles.hiddenInactive : null,
      ]}
      pointerEvents={isFocused ? 'auto' : 'none'}
      collapsable={false}
    >
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            isNeighbor ? styles.partnerLayer : styles.container,
            sceneStyle,
            { backgroundColor: colors.background },
            keepSwipeShell ? styles.driverLayer : null,
          ]}
          collapsable={false}
          pointerEvents={isNeighbor || !isFocused ? 'none' : 'auto'}
        >
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
  hiddenInactive: {
    opacity: 0,
  },
});
