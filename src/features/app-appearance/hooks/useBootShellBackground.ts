import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { colors } from '@/constants/theme';
import { useAppearanceOptional } from '@/providers/appearanceContext';

/** Native splash → JS geçişinde arka plan rengini canlı config ile hizalar. */
export function useBootShellBackgroundColor(): string {
  const appearance = useAppearanceOptional();
  const scheme = Appearance.getColorScheme();
  const isDark = scheme === 'dark';
  const branding = appearance?.config.branding;

  if (isDark && branding?.shell_background_dark) return branding.shell_background_dark;
  if (!isDark && branding?.shell_background_light) return branding.shell_background_light;
  return isDark ? colors.dark.background : colors.light.background;
}

export function BootShellBackgroundSync({
  onColor,
}: {
  onColor: (color: string) => void;
}) {
  const color = useBootShellBackgroundColor();

  useEffect(() => {
    onColor(color);
  }, [color, onColor]);

  return null;
}
