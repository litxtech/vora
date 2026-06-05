import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';

type GradientBackgroundProps = ViewProps & {
  children: React.ReactNode;
  variant?: 'default' | 'karadeniz';
};

export function GradientBackground({ children, style, variant = 'karadeniz', ...props }: GradientBackgroundProps) {
  const gradientColors =
    variant === 'karadeniz'
      ? (['#050810', '#0A1220', '#0D1B2E', '#0A0E14'] as const)
      : (['#0B1220', '#141C2B', '#1A2236', '#0A0E14'] as const);

  return (
    <View style={[styles.root, style]} {...props}>
      <LinearGradient colors={gradientColors} locations={[0, 0.3, 0.65, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.waveAccent} />
      <BlurView intensity={12} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0E14',
  },
  waveAccent: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(30, 136, 229, 0.08)',
  },
  content: {
    flex: 1,
  },
});
