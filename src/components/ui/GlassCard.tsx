import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { shouldSkipUiBlur } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';
import { glassSurface, radius, spacing } from '@/constants/theme';

type GlassCardProps = ViewProps & {
  children: React.ReactNode;
  padded?: boolean;
};

export function GlassCard({ children, style, padded = true, ...props }: GlassCardProps) {
  const { isDark, mode, colors } = useTheme();

  if (!isDark) {
    return (
      <View
        style={[
          styles.wrapper,
          styles.lightCard,
          { borderColor: colors.border, backgroundColor: colors.surface },
          style,
        ]}
        {...props}
      >
        <View style={padded ? styles.padded : undefined}>{children}</View>
      </View>
    );
  }

  const surface = glassSurface[mode];

  return (
    <View
      style={[
        styles.wrapper,
        { borderColor: surface.border, backgroundColor: surface.background },
        style,
      ]}
      {...props}
    >
      {shouldSkipUiBlur() ? null : (
        <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      )}
      <View style={[styles.overlay, { backgroundColor: surface.overlay }, padded && styles.padded]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  lightCard: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  overlay: {},
  padded: {
    padding: spacing.lg,
  },
});
