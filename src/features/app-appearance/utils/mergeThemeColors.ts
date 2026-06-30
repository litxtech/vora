import type { ThemeColors, ThemeMode } from '@/constants/theme';
import type { GradientOverrides, ThemeColorOverrides } from '@/features/app-appearance/types';
import { gradients as defaultGradients } from '@/constants/theme';

export function mergeThemeColors(base: ThemeColors, overrides: ThemeColorOverrides): ThemeColors {
  if (Object.keys(overrides).length === 0) return base;
  return { ...base, ...overrides } as ThemeColors;
}

export function mergeGradients(mode: ThemeMode, overrides: GradientOverrides) {
  const base = defaultGradients[mode];
  return {
    karadeniz: overrides.karadeniz?.length ? overrides.karadeniz : base.karadeniz,
    default: base.default,
    waveAccent: overrides.waveAccent ?? base.waveAccent,
  };
}
