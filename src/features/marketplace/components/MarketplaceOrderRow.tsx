import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatCents, formatMarketplaceDate, MARKETPLACE_ACCENT, ORDER_STATUS_LABELS } from '@/features/marketplace/constants';
import { PayoutCountdownBar } from '@/features/marketplace/components/PayoutCountdownBar';
import type { MarketplaceOrder } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  order: MarketplaceOrder;
  mode: 'buyer' | 'seller';
  onPress: () => void;
};

export function MarketplaceOrderRow({ order, mode, onPress }: Props) {
  const { colors } = useTheme();
  const dateLabel = formatMarketplaceDate(order.paidAt ?? order.createdAt);
  const counterparty = mode === 'seller' ? order.buyerName : order.sellerName;
  const counterpartyLabel = mode === 'seller' ? 'Alıcı' : 'Satıcı';

  return (
    <Pressable onPress={onPress}>
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          {order.listingCoverUrl ? (
            <Image source={{ uri: order.listingCoverUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: `${MARKETPLACE_ACCENT}18` }]}>
              <Ionicons name="image-outline" size={20} color={MARKETPLACE_ACCENT} />
            </View>
          )}
          <View style={styles.meta}>
            <Text variant="label" numberOfLines={2}>
              {order.listingTitle}
            </Text>
            {mode === 'seller' ? (
              <View style={[styles.earningsBlock, { backgroundColor: `${colors.surface}99`, borderColor: colors.border }]}>
                <EarningsLine label="Brüt" value={formatCents(order.grossAmountCents)} />
                <EarningsLine
                  label="Komisyon"
                  value={`−${formatCents(order.commissionCents)}`}
                  deduction
                />
                <EarningsLine label="Net" value={formatCents(order.sellerNetCents)} highlight />
              </View>
            ) : (
              <Text variant="caption" style={styles.amount}>
                {formatCents(order.grossAmountCents)} ödediniz
              </Text>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
              <Text secondary variant="caption">
                {dateLabel}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={11} color={colors.textMuted} />
              <Text secondary variant="caption">
                {counterpartyLabel}: {counterparty ?? '—'}
              </Text>
            </View>
            <Text secondary variant="caption">
              {ORDER_STATUS_LABELS[order.status]} · {order.orderNumber}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
        {mode === 'seller' ? (
          <PayoutCountdownBar payoutDueAt={order.payoutDueAt} payoutCompletedAt={order.payoutCompletedAt} />
        ) : null}
      </GlassCard>
    </Pressable>
  );
}

function EarningsLine({
  label,
  value,
  deduction,
  highlight,
}: {
  label: string;
  value: string;
  deduction?: boolean;
  highlight?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.earningsLine}>
      <Text secondary variant="caption">
        {label}
      </Text>
      <Text
        variant="caption"
        style={{
          fontWeight: highlight ? '800' : '600',
          color: highlight ? '#43A047' : deduction ? colors.danger : colors.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, gap: 3 },
  amount: { fontWeight: '700', color: MARKETPLACE_ACCENT },
  earningsBlock: {
    gap: 2,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  earningsLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
