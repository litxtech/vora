import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { RIDE_REFUND_PAYOUT_NOTE, RIDES_ACCENT } from '@/features/rides/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function RideRefundPayoutNote() {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: `${RIDES_ACCENT}14` }]}>
          <Ionicons name="time-outline" size={18} color={RIDES_ACCENT} />
        </View>
        <View style={styles.copy}>
          <Text variant="label">Hesaba yatış süresi</Text>
          <Text variant="caption" secondary style={styles.body}>
            {RIDE_REFUND_PAYOUT_NOTE}
          </Text>
        </View>
      </View>
      <View style={[styles.hint, { borderColor: colors.border, backgroundColor: `${colors.warning}10` }]}>
        <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
        <Text variant="caption" secondary style={{ flex: 1, lineHeight: 16 }}>
          İade onaylandıktan sonra banka ekstrenizde görünmesi birkaç iş günü sürebilir.
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  body: {
    lineHeight: 18,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
