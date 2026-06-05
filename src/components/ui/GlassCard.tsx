import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

type GlassCardProps = ViewProps & {
  children: React.ReactNode;
  padded?: boolean;
};

export function GlassCard({ children, style, padded = true, ...props }: GlassCardProps) {
  const { isDark } = useTheme();

  return (
    <View style={[styles.wrapper, style]} {...props}>
      <BlurView intensity={isDark ? 24 : 40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[styles.overlay, padded && styles.padded]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  overlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  padded: {
    padding: spacing.lg,
  },
});
