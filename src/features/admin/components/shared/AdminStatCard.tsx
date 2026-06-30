import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
  onPress?: () => void;
};

export function AdminStatCard({ label, value, icon, accent, onPress }: Props) {
  const { colors } = useTheme();
  const color = accent ?? colors.primary;
  const isInteractive = Boolean(onPress);

  const card = (
    <GlassCard style={[styles.card, isInteractive && { borderColor: `${color}33` }]} padded={false}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text secondary variant="body" style={styles.label}>
          {label}
        </Text>
        <Text variant="label" style={[styles.value, { color }]}>
          {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
        </Text>
        {isInteractive ? <Ionicons name="chevron-forward" size={14} color={colors.textMuted} /> : null}
      </View>
    </GlassCard>
  );

  if (!isInteractive) return card;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}>
      {card}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: radius.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontWeight: '500', minWidth: 0 },
  value: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, flexShrink: 0 },
});
