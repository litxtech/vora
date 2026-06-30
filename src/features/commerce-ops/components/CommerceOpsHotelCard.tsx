import { StyleSheet, View } from 'react-native';
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
import { formatCommerceShortDate } from '@/features/commerce-ops/constants';
import type { AdminHotelReservationRow } from '@/features/commerce-ops/types';
import { HOTEL_ACCENT, HOTEL_RESERVATION_STATUS_LABELS } from '@/features/hotel-center/constants';
import { spacing } from '@/constants/theme';

type Props = {
  reservation: AdminHotelReservationRow;
  onCancel?: () => void;
  onRefund?: () => void;
  onPayout?: () => void;
  actionLoading?: boolean;
};

function hotelStatusTone(status: string, payoutCompletedAt: string | null, payoutDueAt: string | null): StatusTone {
  if (payoutCompletedAt) return 'success';
  if (status === 'confirmed') return 'warning';
  if (status === 'completed' && payoutDueAt && new Date(payoutDueAt) < new Date()) return 'danger';
  if (status === 'completed') return 'primary';
  if (['cancelled', 'refunded'].includes(status)) return 'danger';
  if (status === 'pending_payment') return 'warning';
  return 'default';
}

function payoutHint(reservation: AdminHotelReservationRow): { text: string; tone: StatusTone } | null {
  if (reservation.payoutCompletedAt) {
    return { text: `Ödendi · ${formatCommerceShortDate(reservation.payoutCompletedAt)}`, tone: 'success' };
  }
  if (reservation.status !== 'completed' || !reservation.payoutDueAt) return null;

  const due = new Date(reservation.payoutDueAt);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `Ödeme ${Math.abs(diffDays)} gün gecikmiş`, tone: 'danger' };
  }
  if (diffDays === 0) return { text: 'Bugün sahip ödemesi', tone: 'warning' };
  return { text: `${diffDays} gün içinde ödeme`, tone: 'primary' };
}

export function CommerceOpsHotelCard({ reservation, onCancel, onRefund, onPayout, actionLoading }: Props) {
  const statusLabel =
    HOTEL_RESERVATION_STATUS_LABELS[reservation.status as keyof typeof HOTEL_RESERVATION_STATUS_LABELS] ??
    reservation.status;
  const canCancel = ['pending_payment', 'confirmed'].includes(reservation.status);
  const canRefund = reservation.status === 'confirmed';
  const canPayout = reservation.status === 'completed' && !reservation.payoutCompletedAt;
  const payout = payoutHint(reservation);
  const staySubtitle = `${reservation.checkIn} → ${reservation.checkOut} · ${reservation.nights} gece · ${reservation.guestsCount} kişi`;

  return (
    <GlassCard style={styles.card} padded={false}>
      <CommerceOpsCardAccent accent={HOTEL_ACCENT} />
      <View style={styles.body}>
        <CommerceOpsModuleHeader
          accent={HOTEL_ACCENT}
          icon="bed-outline"
          moduleLabel="Otel rezervasyonu"
          title={reservation.hotelName}
          subtitle={reservation.reservationCode}
          statusLabel={statusLabel}
          statusTone={hotelStatusTone(reservation.status, reservation.payoutCompletedAt, reservation.payoutDueAt)}
        />

        <CommerceOpsPartyRow
          fromLabel="Misafir"
          fromName={reservation.guestName}
          toLabel="Otel sahibi"
          toName={reservation.ownerName}
        />

        <CommerceOpsMoneyBlock
          grossCents={reservation.grossAmountCents}
          commissionCents={reservation.commissionCents}
          netCents={reservation.ownerPayoutCents}
          netLabel="Sahip net"
        />

        <CommerceOpsMetaRow
          left={`Konaklama · ${staySubtitle}`}
          right={payout?.text}
          rightTone={payout?.tone}
        />

        <CommerceOpsActionFooter>
          <AdminActionChip
            label="Misafir"
            icon="person-outline"
            compact
            onPress={() => router.push(`/admin/users/${reservation.guestId}` as never)}
          />
          <AdminActionChip
            label="Sahip"
            icon="business-outline"
            compact
            onPress={() => router.push(`/admin/users/${reservation.ownerId}` as never)}
          />
          {canCancel && onCancel ? (
            <AdminActionChip label="İptal" icon="close-outline" tone="danger" compact loading={actionLoading} onPress={onCancel} />
          ) : null}
          {canRefund && onRefund ? (
            <AdminActionChip label="İade" icon="return-down-back-outline" tone="warning" compact loading={actionLoading} onPress={onRefund} />
          ) : null}
          {canPayout && onPayout ? (
            <AdminActionChip label="Sahibe öde" icon="cash-outline" tone="success" compact loading={actionLoading} onPress={onPayout} />
          ) : null}
          <AdminHeyetChip
            subjectType="hotel_reservation"
            subjectId={reservation.id}
            partyALabel={reservation.guestName}
            partyBLabel={reservation.ownerName}
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
