import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  stat?: string;
  onPress: () => void;
  accent?: string;
};

export function MarketplaceHubCard({ icon, title, subtitle, stat, onPress, accent }: Props) {
  const { colors } = useTheme();
  const tone = accent ?? MARKETPLACE_ACCENT;

  return (
    <Pressable onPress={onPress}>
      <GlassCard style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: `${tone}18` }]}>
          <Ionicons name={icon} size={22} color={tone} />
        </View>
        <View style={styles.body}>
          <Text variant="label">{title}</Text>
          <Text secondary variant="caption">
            {subtitle}
          </Text>
          {stat ? (
            <Text variant="caption" style={{ color: tone, fontWeight: '700', marginTop: 2 }}>
              {stat}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
});
