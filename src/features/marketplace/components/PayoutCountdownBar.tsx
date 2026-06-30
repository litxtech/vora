import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { payoutDaysRemaining } from '@/features/marketplace/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  payoutDueAt: string | null;
  payoutCompletedAt: string | null;
};

export function PayoutCountdownBar({ payoutDueAt, payoutCompletedAt }: Props) {
  const { colors } = useTheme();

  if (payoutCompletedAt) {
    return (
      <View style={[styles.box, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}44` }]}>
        <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
          ✓ Ödeme yatırıldı
        </Text>
      </View>
    );
  }

  if (!payoutDueAt) return null;

  const days = payoutDaysRemaining(payoutDueAt);
  const overdue = days != null && days < 0;
  const urgent = days != null && days >= 0 && days <= 3;
  const tone = overdue ? colors.danger : urgent ? colors.warning : colors.primary;
  const total = 9;
  const remaining = days != null ? Math.max(0, Math.min(days, total)) : 0;
  const progress = (total - remaining) / total;

  return (
    <View style={[styles.box, { borderColor: `${tone}44`, backgroundColor: `${tone}12` }]}>
      <View style={styles.row}>
        <Text variant="caption" style={{ color: tone, fontWeight: '700' }}>
          {overdue
            ? 'Ödeme gecikmiş — platform işliyor'
            : days === 0
              ? 'Bugün yatırılması gerekiyor'
              : `${days} gün kaldı`}
        </Text>
        <Text secondary variant="caption">
          {new Date(payoutDueAt).toLocaleDateString('tr-TR')}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: `${tone}22` }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: tone }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
});
