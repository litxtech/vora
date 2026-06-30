import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminHeyetChip } from '@/features/heyet/components/AdminHeyetChip';
import {
  CommerceOpsActionFooter,
  CommerceOpsCardAccent,
  CommerceOpsMetaRow,
  CommerceOpsModuleHeader,
  CommerceOpsMoneyBlock,
  CommerceOpsPartyRow,
  type StatusTone,
} from '@/features/commerce-ops/components/CommerceOpsCardParts';
import {
  formatCommerceDate,
  MODULE_ACCENTS,
  MODULE_ICONS,
  MODULE_LABELS,
} from '@/features/commerce-ops/constants';
import type { CommerceTransactionRow } from '@/features/commerce-ops/types';
import { HOTEL_RESERVATION_STATUS_LABELS } from '@/features/hotel-center/constants';
import { ORDER_STATUS_LABELS } from '@/features/marketplace/constants';
import type { MarketplaceOrderStatus } from '@/features/marketplace/types';
import { PAYMENT_STATUS_LABELS, RESERVATION_STATUS_LABELS } from '@/features/rides/constants';
import { spacing } from '@/constants/theme';

type Props = {
  item: CommerceTransactionRow;
  onApprove?: () => void;
  onRefund?: () => void;
  onCancel?: () => void;
  actionLoading?: boolean;
};

const PARTY_LABELS: Record<
  CommerceTransactionRow['module'],
  { from: string; to: string; net: string }
> = {
  hotel: { from: 'Misafir', to: 'Otel sahibi', net: 'Sahip net' },
  marketplace: { from: 'Alıcı', to: 'Satıcı', net: 'Satıcı net' },
  rides: { from: 'Yolcu', to: 'Sürücü', net: 'Sürücü net' },
};

function statusLabel(item: CommerceTransactionRow): string {
  if (item.module === 'hotel') {
    return HOTEL_RESERVATION_STATUS_LABELS[item.status as keyof typeof HOTEL_RESERVATION_STATUS_LABELS] ?? item.status;
  }
  if (item.module === 'marketplace') {
    return ORDER_STATUS_LABELS[item.status as MarketplaceOrderStatus] ?? item.status;
  }
  const resLabel = RESERVATION_STATUS_LABELS[item.status as keyof typeof RESERVATION_STATUS_LABELS];
  const payLabel = item.paymentStatus
    ? PAYMENT_STATUS_LABELS[item.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS] ?? item.paymentStatus
    : null;
  return payLabel ? `${resLabel ?? item.status} · ${payLabel}` : resLabel ?? item.status;
}

function statusTone(item: CommerceTransactionRow): StatusTone {
  const status = item.status;
  const pay = item.paymentStatus;

  if (item.module === 'marketplace') {
    if (status === 'buyer_confirmed') return 'warning';
    if (status === 'payout_scheduled') return 'primary';
    if (['payout_completed', 'closed'].includes(status)) return 'success';
    if (['disputed', 'refund_pending', 'cancelled'].includes(status)) return 'danger';
    return 'default';
  }

  if (item.module === 'rides') {
    if (pay === 'held') return 'primary';
    if (pay === 'released') return 'success';
    if (pay === 'refunded') return 'danger';
    if (status === 'pending') return 'warning';
    return 'default';
  }

  if (status === 'confirmed') return 'warning';
  if (status === 'completed') return 'success';
  if (['cancelled', 'refunded'].includes(status)) return 'danger';
  if (status === 'pending_payment') return 'warning';
  return 'default';
}

export function CommerceOpsItemCard({
  item,
  onApprove,
  onRefund,
  onCancel,
  actionLoading = false,
}: Props) {
  const accent = MODULE_ACCENTS[item.module];
  const icon = MODULE_ICONS[item.module] as keyof typeof Ionicons.glyphMap;
  const parties = PARTY_LABELS[item.module];
  const label = statusLabel(item);
  const tone = statusTone(item);

  return (
    <GlassCard style={styles.card} padded={false}>
      <CommerceOpsCardAccent accent={accent} />
      <View style={styles.body}>
        <CommerceOpsModuleHeader
          accent={accent}
          icon={icon}
          moduleLabel={MODULE_LABELS[item.module]}
          title={item.title}
          subtitle={item.referenceCode}
          statusLabel={label}
          statusTone={tone}
        />

        <CommerceOpsPartyRow
          fromLabel={parties.from}
          fromName={item.fromPartyName}
          toLabel={parties.to}
          toName={item.toPartyName}
        />

        <CommerceOpsMoneyBlock
          grossCents={item.grossCents}
          commissionCents={item.commissionCents}
          netCents={item.netCents}
          netLabel={parties.net}
        />

        <CommerceOpsMetaRow
          left={`Oluşturuldu · ${formatCommerceDate(item.createdAt)}`}
          right={item.regionId ?? undefined}
        />

        <CommerceOpsActionFooter>
          <AdminActionChip
            label={parties.from}
            icon="person-outline"
            compact
            onPress={() => router.push(`/admin/users/${item.fromPartyId}` as never)}
          />
          <AdminActionChip
            label={parties.to}
            icon="business-outline"
            compact
            onPress={() => router.push(`/admin/users/${item.toPartyId}` as never)}
          />
          {onApprove ? (
            <AdminActionChip
              label="Onayla"
              icon="checkmark-circle-outline"
              tone="primary"
              compact
              loading={actionLoading}
              onPress={onApprove}
            />
          ) : null}
          {onCancel ? (
            <AdminActionChip label="İptal" icon="close-outline" tone="danger" compact loading={actionLoading} onPress={onCancel} />
          ) : null}
          {onRefund ? (
            <AdminActionChip label="İade" icon="return-down-back-outline" tone="warning" compact loading={actionLoading} onPress={onRefund} />
          ) : null}
          <AdminHeyetChip
            subjectType={
              item.module === 'rides'
                ? 'ride_reservation'
                : item.module === 'marketplace'
                  ? 'marketplace_order'
                  : 'hotel_reservation'
            }
            subjectId={item.id}
            partyALabel={item.fromPartyName}
            partyBLabel={item.toPartyName}
            compact
          />
        </CommerceOpsActionFooter>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', marginBottom: spacing.sm },
  body: { padding: spacing.md, paddingLeft: spacing.md + 4, gap: spacing.sm },
});
