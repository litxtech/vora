import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useStableTabBarInset } from '@/hooks/useStableTabBarInset';
import { createFloatingTabBarStyle, TabBarBackgroundView } from '@/components/navigation/floatingTabBar';
import { useTheme } from '@/providers/ThemeProvider';

/** Harita sekmesinde alt tab menüyü gizler; çıkınca geri yükler. */
export function useHideMapTabBar() {
  const navigation = useNavigation();
  const { colors, isDark, mode } = useTheme();
  const tabBarBottomInset = useStableTabBarInset();

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      if (!parent) return undefined;

      parent.setOptions({ tabBarStyle: { display: 'none' } });

      return () => {
        parent.setOptions({
          tabBarStyle: createFloatingTabBarStyle({
            bottomInset: tabBarBottomInset,
            colors,
            isDark,
            mode,
          }),
          tabBarBackground: () => <TabBarBackgroundView isDark={isDark} mode={mode} />,
        });
      };
    }, [navigation, colors, isDark, mode, tabBarBottomInset]),
  );
}
