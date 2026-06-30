import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';

type Props = {
  title: string;
  subtitle: string;
  accent: string;
};

export function CentersHeroBanner({ title, subtitle, accent }: Props) {
  return (
    <LinearGradient
      colors={[`${accent}E8`, `${accent}99`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.decorGlow} />
      <View style={styles.heroCopy}>
        <Text variant="h2" style={styles.heroTitle}>
          {title}
        </Text>
        <Text variant="body" style={styles.heroSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 4,
    overflow: 'hidden',
    position: 'relative',
  },
  decorGlow: {
    position: 'absolute',
    top: -24,
    right: -24,
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroCopy: { gap: spacing.xs },
  heroTitle: { color: '#fff', fontWeight: '800', letterSpacing: -0.3, fontSize: 24 },
  heroSubtitle: { color: 'rgba(255,255,255,0.88)', lineHeight: 20, fontSize: 14 },
});
