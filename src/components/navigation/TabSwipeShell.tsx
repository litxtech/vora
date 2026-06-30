import { type ReactElement, useCallback, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  MAIN_TAB_SWIPE_DISABLED_ROUTES,
  MAIN_TAB_SWIPE_DISTANCE_PX,
  MAIN_TAB_SWIPE_VELOCITY_PX,
  type MainTabRoute,
} from '@/features/navigation/constants';
import { useVisibleMainTabs } from '@/features/navigation/hooks/useVisibleMainTabs';
import { useFeedDrawerStore } from '@/features/feed/store/feedDrawerStore';
import { shouldUseMainTabSwipeGesture } from '@/lib/device/androidPerfProfile';

type TabSwipeShellProps = {
  routeName: string;
  navigation: NavigationProp<ParamListBase>;
  children: ReactElement;
};

export function TabSwipeShell({ routeName, navigation, children }: TabSwipeShellProps) {
  const visibleTabs = useVisibleMainTabs();
  const feedDrawerOpen = useFeedDrawerStore((s) => s.open);
  const swipeEnabled =
    shouldUseMainTabSwipeGesture() &&
    !MAIN_TAB_SWIPE_DISABLED_ROUTES.has(routeName) &&
    !(routeName === 'index' && feedDrawerOpen);

  const switchTab = useCallback(
    (direction: 'next' | 'prev') => {
      const currentRoute = routeName as MainTabRoute;
      const currentIndex = visibleTabs.indexOf(currentRoute);
      if (currentIndex < 0) return;

      const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      const targetRoute = visibleTabs[targetIndex];
      if (!targetRoute || targetRoute === currentRoute) return;

      if (Platform.OS !== 'android') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      navigation.jumpTo(targetRoute);
    },
    [navigation, routeName, visibleTabs],
  );

  const handleSwipeEnd = useCallback(
    (translationX: number, velocityX: number) => {
      const swipedLeft =
        translationX <= -MAIN_TAB_SWIPE_DISTANCE_PX || velocityX <= -MAIN_TAB_SWIPE_VELOCITY_PX;
      const swipedRight =
        translationX >= MAIN_TAB_SWIPE_DISTANCE_PX || velocityX >= MAIN_TAB_SWIPE_VELOCITY_PX;

      if (swipedLeft) {
        switchTab('next');
        return;
      }
      if (swipedRight) {
        switchTab('prev');
      }
    },
    [switchTab],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .activeOffsetX([-28, 28])
        .failOffsetY([-18, 18])
        .onEnd((event) => {
          runOnJS(handleSwipeEnd)(event.translationX, event.velocityX);
        }),
    [handleSwipeEnd],
  );

  if (!swipeEnabled) {
    return children;
  }

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
