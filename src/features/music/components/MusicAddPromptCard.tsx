import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicAddPromptCardProps = {
  onPress: () => void;
};

export function MusicAddPromptCard({ onPress }: MusicAddPromptCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <LinearGradient
        colors={[`${colors.primary}28`, `${colors.accent}18`, `${colors.textMuted}08`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: `${colors.primary}33` }]}
      >
        <View style={[styles.iconOrb, { backgroundColor: `${colors.primary}22` }]}>
          <Ionicons name="musical-notes" size={22} color={colors.primary} />
        </View>

        <View style={styles.copy}>
          <Text variant="label" style={styles.title}>
            Müzik ekle
          </Text>
          <Text secondary variant="caption" style={styles.subtitle}>
            Listeden dinle, beğendiğini gönderine ekle.
          </Text>
        </View>

        <View style={[styles.cta, { backgroundColor: colors.primary }]}>
          <Ionicons name="headset-outline" size={16} color="#fff" />
          <Text variant="caption" style={styles.ctaText}>
            Kütüphaneyi aç
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#fff" />
        </View>

        <View style={styles.badges}>
          <Badge icon="flame-outline" label="Trend" colors={colors} />
          <Badge icon="time-outline" label="Son" colors={colors} />
          <Badge icon="sparkles-outline" label="Yeni" colors={colors} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function Badge({
  icon,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.badge, { backgroundColor: `${colors.textMuted}12` }]}>
      <Ionicons name={icon} size={11} color={colors.textSecondary} />
      <Text variant="caption" secondary style={{ fontSize: 10 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: 4 },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { lineHeight: 18, fontSize: 12 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
