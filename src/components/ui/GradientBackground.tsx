import { StyleSheet, View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { shouldSkipUiBlur, shouldUsePlainScreenBackground } from '@/lib/device/androidPerfProfile';
import { asGradientColors } from '@/lib/ui/gradientColors';
import { useTheme } from '@/providers/ThemeProvider';

type GradientBackgroundProps = ViewProps & {
  children: React.ReactNode;
  variant?: 'default' | 'karadeniz';
};

export function GradientBackground({ children, style, variant = 'karadeniz', ...props }: GradientBackgroundProps) {
  const { colors, isDark, gradients: palette } = useTheme();

  if (!isDark || shouldUsePlainScreenBackground()) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }, style]} {...props}>
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  const gradientColors = asGradientColors(
    variant === 'karadeniz' ? [...palette.karadeniz] : [...palette.default],
    4,
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }, style]} {...props}>
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.3, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.waveAccent, { backgroundColor: palette.waveAccent }]} />
      {shouldSkipUiBlur() ? null : (
        <BlurView intensity={12} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  waveAccent: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  content: {
    flex: 1,
  },
});
