import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminHeyetChip } from '@/features/heyet/components/AdminHeyetChip';
import { AdminMarketplaceStatusBadge } from '@/features/admin/components/marketplace/AdminMarketplaceStatusBadge';
import {
  formatCents,
  formatMarketplaceDate,
  ORDER_STATUS_LABELS,
  payoutDaysRemaining,
} from '@/features/marketplace/constants';
import type { AdminMarketplaceOrderRow } from '@/features/marketplace/services/adminMarketplace';
import type { MarketplaceOrderStatus } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminMarketplaceOrderCardProps = {
  order: AdminMarketplaceOrderRow;
  payoutRef: string;
  onPayoutRefChange: (value: string) => void;
  onApprove: () => void;
  onMarkPaid: () => void;
  onRefund: () => void;
  actionLoading?: boolean;
};

function orderStatusTone(status: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'buyer_confirmed':
      return 'warning';
    case 'payout_scheduled':
      return 'primary';
    case 'payout_completed':
    case 'closed':
      return 'success';
    case 'disputed':
    case 'refund_pending':
      return 'danger';
    default:
      return 'default';
  }
}

function MoneyRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.moneyRow}>
      <Text secondary variant="caption">
        {label}
      </Text>
      <Text variant="caption" style={{ fontWeight: '700', color: accent ?? colors.text }}>
        {value}
      </Text>
    </View>
  );
}

export function AdminMarketplaceOrderCard({
  order,
  payoutRef,
  onPayoutRefChange,
  onApprove,
  onMarkPaid,
  onRefund,
  actionLoading = false,
}: AdminMarketplaceOrderCardProps) {
  const { colors } = useTheme();
  const statusLabel = ORDER_STATUS_LABELS[order.status as MarketplaceOrderStatus] ?? order.status;
  const daysLeft = payoutDaysRemaining(order.payout_due_at);
  const showPayoutInput = order.status === 'payout_scheduled';
  const canApprove = order.status === 'buyer_confirmed';
  const canRefund = ['paid_escrow', 'seller_shipped', 'disputed', 'buyer_confirmed'].includes(order.status);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="label">{order.order_number}</Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {order.listing_title}
          </Text>
        </View>
        <AdminMarketplaceStatusBadge label={statusLabel} tone={orderStatusTone(order.status)} />
      </View>

      <View style={[styles.parties, { backgroundColor: `${colors.surface}AA` }]}>
        <View style={styles.party}>
          <Ionicons name="person-outline" size={14} color={colors.textMuted} />
          <Text variant="caption" numberOfLines={1}>
            {order.buyer_name}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
        <View style={styles.party}>
          <Ionicons name="storefront-outline" size={14} color={colors.textMuted} />
          <Text variant="caption" numberOfLines={1}>
            {order.seller_name}
          </Text>
        </View>
      </View>

      <View style={[styles.moneyBlock, { borderColor: colors.border }]}>
        <MoneyRow label="Brüt" value={formatCents(order.gross_amount_cents)} />
        <MoneyRow label="Komisyon" value={formatCents(order.commission_cents)} accent={colors.warning} />
        <MoneyRow label="Satıcı net" value={formatCents(order.seller_net_cents)} accent={colors.success} />
      </View>

      <View style={styles.meta}>
        <Text secondary variant="caption">
          Oluşturuldu: {formatMarketplaceDate(order.created_at)}
        </Text>
        {order.payout_due_at ? (
          <Text
            variant="caption"
            style={{
              color: daysLeft != null && daysLeft < 0 ? colors.danger : daysLeft != null && daysLeft <= 3 ? colors.warning : colors.textSecondary,
              fontWeight: '600',
            }}
          >
            {daysLeft == null
              ? ''
              : daysLeft < 0
                ? `${Math.abs(daysLeft)} gün gecikmiş`
                : daysLeft === 0
                  ? 'Bugün ödeme günü'
                  : `${daysLeft} gün kaldı`}
          </Text>
        ) : null}
      </View>

      {showPayoutInput ? (
        <Input
          label="Transfer referansı"
          value={payoutRef}
          onChangeText={onPayoutRefChange}
          placeholder="Banka dekont / EFT referansı"
        />
      ) : null}

      <View style={styles.actions}>
        {canApprove ? (
          <AdminActionChip
            label="Platform onayı"
            icon="checkmark-circle-outline"
            tone="primary"
            onPress={onApprove}
            loading={actionLoading}
            compact
          />
        ) : null}
        {showPayoutInput ? (
          <AdminActionChip
            label="Ödeme yapıldı"
            icon="wallet-outline"
            tone="success"
            onPress={onMarkPaid}
            loading={actionLoading}
            compact
          />
        ) : null}
        {canRefund ? (
          <AdminActionChip
            label="İade"
            icon="return-down-back-outline"
            tone="danger"
            onPress={onRefund}
            loading={actionLoading}
            compact
          />
        ) : null}
        <AdminActionChip
          label="Detay"
          icon="open-outline"
          tone="default"
          onPress={() => router.push(`/marketplace-center/order/${order.id}` as never)}
          compact
        />
        <AdminHeyetChip
          subjectType="marketplace_order"
          subjectId={order.id}
          partyALabel={order.buyer_name}
          partyBLabel={order.seller_name}
          compact
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  headerText: { flex: 1, gap: 2 },
  parties: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  party: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  moneyBlock: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
  },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
