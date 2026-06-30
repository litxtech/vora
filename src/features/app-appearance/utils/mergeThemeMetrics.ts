import { radius as baseRadius, spacing as baseSpacing, typography as baseTypography } from '@/constants/theme';
import type {
  RadiusOverrides,
  SpacingOverrides,
  TabBarAppearance,
  TypographyOverrides,
} from '@/features/app-appearance/types';
import type { ThemeMode } from '@/constants/theme';

export function mergeSpacing(overrides: SpacingOverrides) {
  return { ...baseSpacing, ...overrides };
}

export function mergeRadius(overrides: RadiusOverrides) {
  return { ...baseRadius, ...overrides };
}

export function mergeTypography(overrides: TypographyOverrides) {
  const result = { ...baseTypography };
  for (const key of Object.keys(overrides) as (keyof typeof baseTypography)[]) {
    const patch = overrides[key];
    if (!patch) continue;
    result[key] = { ...result[key], ...patch };
  }
  return result;
}

export function resolveTabBarAppearance(
  mode: ThemeMode,
  colors: { primary: string; textMuted: string; border: string; surface: string },
  overrides: TabBarAppearance,
) {
  return {
    activeTint: overrides.activeTint ?? colors.primary,
    inactiveTint: overrides.inactiveTint ?? colors.textMuted,
    background: overrides.background,
    border: overrides.border ?? colors.border,
  };
}
