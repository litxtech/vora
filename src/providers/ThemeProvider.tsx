import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, type ThemeMode } from '@/constants/theme';
import { mergeGradients, mergeThemeColors } from '@/features/app-appearance/utils/mergeThemeColors';
import {
  mergeRadius,
  mergeSpacing,
  mergeTypography,
  resolveTabBarAppearance,
} from '@/features/app-appearance/utils/mergeThemeMetrics';
import { useAppearanceOptional } from '@/providers/appearanceContext';
import {
  ThemeContext,
  type ThemeContextValue,
  type ThemePreference,
} from '@/providers/themeContext';

export { useTheme } from '@/providers/themeContext';
export type { ThemeContextValue, ThemePreference } from '@/providers/themeContext';

const THEME_STORAGE_KEY = 'app_theme_preference';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const appearance = useAppearanceOptional();
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (isThemePreference(stored)) {
          setPreference(stored);
        }
      })
      .finally(() => setReady(true));
  }, []);

  const mode: ThemeMode =
    preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

  const setMode = (next: ThemePreference) => {
    setPreference(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  };

  const value = useMemo<ThemeContextValue>(() => {
    const baseColors = colors[mode];
    const config = appearance?.config;
    const overrides = config?.colors[mode] ?? {};
    const gradientOverrides = config?.gradients[mode] ?? {};
    const mergedColors = mergeThemeColors(baseColors, overrides);
    const tabBarOverrides = config?.tab_bar[mode] ?? {};

    return {
      mode,
      colors: mergedColors,
      gradients: mergeGradients(mode, gradientOverrides),
      metrics: {
        spacing: mergeSpacing(config?.spacing ?? {}),
        radius: mergeRadius(config?.radius ?? {}),
        typography: mergeTypography(config?.typography ?? {}),
      },
      tabBar: resolveTabBarAppearance(mode, mergedColors, tabBarOverrides),
      isDark: mode === 'dark',
      preference,
      setMode,
      ready,
    };
  }, [appearance?.config, mode, preference, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function cycleThemePreference(current: ThemePreference): ThemePreference {
  if (current === 'dark') return 'light';
  if (current === 'light') return 'system';
  return 'dark';
}

export function themePreferenceLabel(preference: ThemePreference, mode: ThemeMode): string {
  if (preference === 'dark') return 'Koyu';
  if (preference === 'light') return 'Açık';
  return `Sistem (${mode === 'light' ? 'Açık' : 'Koyu'})`;
}
