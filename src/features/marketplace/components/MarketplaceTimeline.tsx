import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { formatMarketplaceDate } from '@/features/marketplace/constants';
import type { MarketplaceOrderEvent, MarketplaceOrderStatus } from '@/features/marketplace/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const STEPS: { status: MarketplaceOrderStatus; label: string }[] = [
  { status: 'paid_escrow', label: 'Ödeme alındı' },
  { status: 'seller_shipped', label: 'Satıcı teslim etti' },
  { status: 'buyer_confirmed', label: 'Alıcı onayladı' },
  { status: 'payout_scheduled', label: 'Platform onayı' },
  { status: 'payout_completed', label: 'Satıcıya ödeme' },
];

const STATUS_ORDER: MarketplaceOrderStatus[] = [
  'pending_payment',
  'paid_escrow',
  'seller_shipped',
  'buyer_confirmed',
  'platform_approved',
  'payout_scheduled',
  'payout_completed',
  'closed',
];

type Props = {
  currentStatus: MarketplaceOrderStatus;
  events?: MarketplaceOrderEvent[];
  paidAt?: string | null;
  sellerShippedAt?: string | null;
  buyerConfirmedAt?: string | null;
  platformApprovedAt?: string | null;
  payoutCompletedAt?: string | null;
};

function stepTime(
  step: (typeof STEPS)[number]['status'],
  props: Props,
): string | null {
  switch (step) {
    case 'paid_escrow':
      return props.paidAt ?? null;
    case 'seller_shipped':
      return props.sellerShippedAt ?? null;
    case 'buyer_confirmed':
      return props.buyerConfirmedAt ?? null;
    case 'payout_scheduled':
      return props.platformApprovedAt ?? null;
    case 'payout_completed':
      return props.payoutCompletedAt ?? null;
    default:
      return null;
  }
}

function isStepDone(stepStatus: MarketplaceOrderStatus, current: MarketplaceOrderStatus): boolean {
  const cur = STATUS_ORDER.indexOf(current);
  const step = STATUS_ORDER.indexOf(stepStatus);
  if (cur === -1 || step === -1) return false;
  return cur >= step;
}

export function MarketplaceTimeline(props: Props) {
  const { colors } = useTheme();
  const { currentStatus } = props;

  return (
    <View style={styles.wrap}>
      {STEPS.map((step, index) => {
        const done = isStepDone(step.status, currentStatus);
        const time = stepTime(step.status, props);
        const isCurrent =
          !done &&
          (index === 0 ||
            isStepDone(STEPS[index - 1]!.status, currentStatus));

        return (
          <View key={step.status} style={styles.row}>
            <View style={styles.iconCol}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done ? colors.success : isCurrent ? colors.primary : colors.border,
                  },
                ]}
              >
                {done ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
              </View>
              {index < STEPS.length - 1 ? (
                <View style={[styles.line, { backgroundColor: done ? colors.success : colors.border }]} />
              ) : null}
            </View>
            <View style={styles.textCol}>
              <Text variant="caption" style={{ fontWeight: done || isCurrent ? '700' : '400' }}>
                {step.label}
              </Text>
              {time ? (
                <Text secondary variant="caption">
                  {formatMarketplaceDate(time)}
                </Text>
              ) : isCurrent ? (
                <Text variant="caption" style={{ color: colors.primary }}>
                  Bekleniyor
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  iconCol: { alignItems: 'center', width: 24 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 16,
    marginVertical: 2,
  },
  textCol: { flex: 1, paddingBottom: spacing.sm },
});
