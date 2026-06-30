import { View, type ViewStyle } from 'react-native';
import { LinearGradient, type LinearGradientProps } from 'expo-linear-gradient';
import { shouldUsePlainScreenBackground } from '@/lib/device/androidPerfProfile';
import { asGradientColors } from '@/lib/ui/gradientColors';

function normalizeLocations(
  colorCount: number,
  locations?: LinearGradientProps['locations'],
): number[] | undefined {
  if (!locations?.length) return undefined;

  const out: number[] = [];
  for (let i = 0; i < colorCount; i++) {
    const loc = locations[i];
    out.push(typeof loc === 'number' && Number.isFinite(loc) ? loc : i / Math.max(colorCount - 1, 1));
  }
  return out;
}

function resolvePlainBackground(colors: string[]): string {
  for (let i = colors.length - 1; i >= 0; i--) {
    const color = colors[i];
    if (color && color !== 'transparent') return color;
  }
  return colors[0] ?? '#6366F1';
}

/** expo-linear-gradient Android — geçersiz renk/locations NPE yapar. */
export function SafeLinearGradient({
  colors,
  locations,
  style,
  children,
  ...rest
}: LinearGradientProps) {
  const safeColors = asGradientColors(Array.isArray(colors) ? colors : [], 2);

  if (shouldUsePlainScreenBackground()) {
    return (
      <View style={[style as ViewStyle, { backgroundColor: resolvePlainBackground(safeColors) }]}>
        {children}
      </View>
    );
  }

  const safeLocations = normalizeLocations(safeColors.length, locations);

  return (
    <LinearGradient
      {...rest}
      style={style}
      colors={safeColors as LinearGradientProps['colors']}
      {...(safeLocations ? { locations: safeLocations } : {})}
    >
      {children}
    </LinearGradient>
  );
}
