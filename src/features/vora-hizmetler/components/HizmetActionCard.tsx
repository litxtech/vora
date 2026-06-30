import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type HizmetActionCardProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
  onPress: () => void;
  badge?: string;
};

export function HizmetActionCard({
  title,
  subtitle,
  icon,
  accent = VORA_HIZMETLER_ACCENT,
  onPress,
  badge,
}: HizmetActionCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
      <GlassCard style={styles.card} padded={false}>
        <LinearGradient colors={[`${accent}18`, `${accent}04`]} style={styles.cardBg} />
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <View style={styles.inner}>
          <LinearGradient colors={[`${accent}30`, `${accent}12`]} style={styles.iconWrap}>
            <Ionicons name={icon} size={24} color={accent} />
          </LinearGradient>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text variant="label" numberOfLines={1}>
                {title}
              </Text>
              {badge ? (
                <View style={[styles.badge, { backgroundColor: accent }]}>
                  <Text variant="caption" style={styles.badgeText}>
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text secondary variant="caption" numberOfLines={2} style={styles.subtitle}>
              {subtitle}
            </Text>
          </View>
          <View style={[styles.chevron, { backgroundColor: `${colors.textSecondary}10` }]}>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardBg: {
    ...StyleSheet.absoluteFillObject,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingLeft: spacing.lg + 4,
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtitle: {
    lineHeight: 17,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
