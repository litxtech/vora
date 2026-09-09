import { useCallback, useRef } from 'react';
import {
  Platform,
  Pressable,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useNavigation } from 'expo-router';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import {
  MAIN_TAB_HOLD_SWITCH_DELAY_MS,
  MAIN_TAB_HOLD_SWITCH_INTERVAL_MS,
  type MainTabRoute,
} from '@/features/navigation/constants';
import { useVisibleMainTabs } from '@/features/navigation/hooks/useVisibleMainTabs';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';

type TabJumpNavigation = {
  jumpTo: (name: string) => void;
  getState: () => { index: number; routes: { name: string }[] } | undefined;
};

function resolveCurrentRoute(navigation: TabJumpNavigation): string | null {
  const state = navigation.getState();
  if (!state?.routes?.length) return null;
  return state.routes[state.index]?.name ?? null;
}

function resolveNextRoute(
  current: string | null,
  visibleTabs: MainTabRoute[],
): MainTabRoute | null {
  if (!current || visibleTabs.length < 2) return null;
  const idx = visibleTabs.indexOf(current as MainTabRoute);
  if (idx < 0) return visibleTabs[0] ?? null;
  return visibleTabs[(idx + 1) % visibleTabs.length] ?? null;
}

/**
 * Kısa basılı tutunca (aktif sekmede) sıradaki ana sekmeye geçer.
 * Basılı tutmaya devam edilirse sekmeler arasında sırayla gezer.
 */
export function HoldToSwitchTabButton({
  onPress,
  onLongPress: _onLongPress,
  accessibilityState,
  style,
  children,
  ...rest
}: BottomTabBarButtonProps) {
  const navigation = useNavigation() as unknown as TabJumpNavigation;
  const visibleTabs = useVisibleMainTabs();
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focused = accessibilityState?.selected ?? false;

  const clearHold = useCallback(() => {
    if (holdIntervalRef.current == null) return;
    clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = null;
  }, []);

  const cycleNext = useCallback(() => {
    const current = resolveCurrentRoute(navigation);
    const next = resolveNextRoute(current, visibleTabs);
    if (!next || next === current) return;

    if (Platform.OS !== 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      void Haptics.selectionAsync();
    }
    navigation.jumpTo(next);
  }, [navigation, visibleTabs]);

  const handleLongPress = useCallback(
    (event: GestureResponderEvent) => {
      if (!focused) {
        onPress?.(event);
        return;
      }
      cycleNext();
      clearHold();
      holdIntervalRef.current = setInterval(cycleNext, MAIN_TAB_HOLD_SWITCH_INTERVAL_MS);
    },
    [clearHold, cycleNext, focused, onPress],
  );

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityHint={focused ? 'Basılı tutarak sonraki sekmeye geç' : undefined}
      onPress={onPress}
      onLongPress={handleLongPress}
      onPressOut={clearHold}
      delayLongPress={MAIN_TAB_HOLD_SWITCH_DELAY_MS}
      style={style as StyleProp<ViewStyle>}
      {...getAndroidInstantPressableProps()}
    >
      {children}
    </Pressable>
  );
}
