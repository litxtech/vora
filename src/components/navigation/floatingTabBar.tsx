import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  FLOATING_TAB_BAR_BOTTOM_GAP,
  FLOATING_TAB_BAR_SIDE_MARGIN,
  TAB_BAR_CONTENT_HEIGHT,
} from '@/constants/tabBar';
import { glassSurface, radius, type ThemeMode } from '@/constants/theme';
import {
  getAndroidTabBarElevation,
  shouldSkipUiBlur,
  shouldUseSolidAndroidTabBar,
} from '@/lib/device/androidPerfProfile';
import { useTheme, type ThemeContextValue } from '@/providers/themeContext';

type TabBarVariant = 'default' | 'reels';

type TabBarBackgroundProps = {
  variant?: TabBarVariant;
  isDark: boolean;
  mode: ThemeMode;
};

/** Tab navigator tabBarBackground — hook kullanmaz (context dışı render güvenli). */
export function TabBarBackgroundView({ variant = 'default', isDark, mode }: TabBarBackgroundProps) {
  const clip = Platform.OS === 'web' ? styles.webClip : styles.backgroundClip;

  if (variant === 'reels') {
    return <View style={[StyleSheet.absoluteFill, clip, styles.reelsFill]} />;
  }

  if (!isDark) {
    return <View style={[StyleSheet.absoluteFill, clip, styles.lightFill]} />;
  }

  const surface = glassSurface[mode];

  if (shouldSkipUiBlur()) {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          clip,
          { backgroundColor: surface.background },
        ]}
      />
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, clip]}>
      <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: surface.background }]} />
    </View>
  );
}

export function FloatingTabBarBackground({ variant = 'default' }: { variant?: TabBarVariant }) {
  const { isDark, mode } = useTheme();
  return <TabBarBackgroundView variant={variant} isDark={isDark} mode={mode} />;
}

export function createFloatingTabBarStyle({
  bottomInset,
  variant = 'default',
  colors,
  isDark,
  mode = 'dark',
  tabBar,
  radiusFull,
}: {
  bottomInset: number;
  variant?: TabBarVariant;
  colors: ThemeContextValue['colors'];
  isDark: boolean;
  mode?: ThemeContextValue['mode'];
  tabBar?: { background?: string; border: string };
  radiusFull?: number;
}) {
  const isReels = variant === 'reels';
  const pillRadius = radiusFull ?? radius.full;

  const solidBackground = tabBar?.background
    ? tabBar.background
    : isReels
      ? 'rgba(6, 8, 12, 0.96)'
      : !isDark
        ? 'rgba(255, 255, 255, 0.96)'
        : glassSurface[mode].background;

  if (Platform.OS === 'web') {
    return {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      height: TAB_BAR_CONTENT_HEIGHT,
      borderRadius: 0,
      overflow: 'hidden' as const,
      backgroundColor: solidBackground,
      borderTopWidth: 1,
      borderWidth: 0,
      borderColor: isReels
        ? 'rgba(255, 255, 255, 0.14)'
        : tabBar?.border ?? (isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border),
      paddingTop: 6,
      paddingBottom: 6,
      elevation: 0,
    };
  }

  return {
    position: 'absolute' as const,
    left: FLOATING_TAB_BAR_SIDE_MARGIN,
    right: FLOATING_TAB_BAR_SIDE_MARGIN,
    bottom: bottomInset + FLOATING_TAB_BAR_BOTTOM_GAP,
    height: TAB_BAR_CONTENT_HEIGHT,
    borderRadius: pillRadius,
    overflow: 'visible' as const,
    backgroundColor: shouldUseSolidAndroidTabBar() ? solidBackground : 'transparent',
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: isReels
      ? 'rgba(255, 255, 255, 0.14)'
      : tabBar?.border ?? (isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border),
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'android' ? 0 : 10 },
    shadowOpacity: Platform.OS === 'android' ? 0 : isDark ? 0.38 : 0.14,
    shadowRadius: Platform.OS === 'android' ? 0 : 18,
    elevation: Platform.OS === 'android' ? getAndroidTabBarElevation() : 0,
  };
}

const styles = StyleSheet.create({
  backgroundClip: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  webClip: {
    overflow: 'hidden',
  },
  lightFill: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  reelsFill: {
    backgroundColor: 'rgba(6, 8, 12, 0.9)',
  },
});
