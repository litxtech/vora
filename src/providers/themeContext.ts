import { createContext, useContext } from 'react';
import type { ThemeColors, ThemeMode } from '@/constants/theme';
import { radius, spacing, typography } from '@/constants/theme';
import type { mergeGradients } from '@/features/app-appearance/utils/mergeThemeColors';

export type ThemePreference = ThemeMode | 'system';

export type ThemeGradients = ReturnType<typeof mergeGradients>;

export type ThemeMetrics = {
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

export type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  gradients: ThemeGradients;
  metrics: ThemeMetrics;
  tabBar: {
    activeTint: string;
    inactiveTint: string;
    background?: string;
    border: string;
  };
  isDark: boolean;
  setMode: (mode: ThemePreference) => void;
  preference: ThemePreference;
  ready: boolean;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme ThemeProvider içinde kullanılmalı.');
  }
  return context;
}
