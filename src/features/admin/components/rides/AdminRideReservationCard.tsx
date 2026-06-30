import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminHeyetChip } from '@/features/heyet/components/AdminHeyetChip';
import { AdminRideStatusBadge } from '@/features/admin/components/rides/AdminRideStatusBadge';
import {
  formatCents,
  PAYMENT_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  rideCityName,
} from '@/features/rides/constants';
import type { AdminRideReservationRow } from '@/features/rides/services/adminRides';
import type { AdminRideTripRow } from '@/features/rides/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  reservation: AdminRideReservationRow;
  trip?: AdminRideTripRow | null;
  onRefund?: () => void;
  actionLoading?: boolean;
};

function reservationTone(status: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'approved':
      return 'primary';
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
    case 'cancelled':
    case 'no_show':
      return 'danger';
    default:
      return 'default';
  }
}

function paymentTone(status: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'held':
      return 'primary';
    case 'released':
      return 'warning';
    case 'refunded':
    case 'failed':
      return 'danger';
    case 'pending':
      return 'warning';
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

export function AdminRideReservationCard({ reservation, trip, onRefund, actionLoading = false }: Props) {
  const { colors } = useTheme();
  const route = trip
    ? `${rideCityName(trip.fromCityId)} → ${rideCityName(trip.toCityId)}`
    : `Yolculuk #${reservation.tripId.slice(0, 8)}`;
  const canRefund = ['held', 'released'].includes(reservation.paymentStatus);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="label" numberOfLines={1}>
            {route}
          </Text>
          <Text secondary variant="caption">
            {reservation.seatCount} koltuk · {new Date(reservation.createdAt).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <View style={styles.badges}>
          <AdminRideStatusBadge
            label={RESERVATION_STATUS_LABELS[reservation.status as keyof typeof RESERVATION_STATUS_LABELS] ?? reservation.status}
            tone={reservationTone(reservation.status)}
          />
          <AdminRideStatusBadge
            label={PAYMENT_STATUS_LABELS[reservation.paymentStatus] ?? reservation.paymentStatus}
            tone={paymentTone(reservation.paymentStatus)}
          />
        </View>
      </View>

      <View style={[styles.moneyBlock, { borderColor: colors.border }]}>
        <MoneyRow label="Katkı payı" value={formatCents(reservation.amountCents)} />
        <MoneyRow label="Komisyon" value={formatCents(reservation.amountCents - reservation.driverPayoutCents)} accent={colors.warning} />
        <MoneyRow label="Sürücü net" value={formatCents(reservation.driverPayoutCents)} accent={colors.success} />
      </View>

      <View style={styles.actions}>
        {canRefund && onRefund ? (
          <AdminActionChip
            label="Stripe iade"
            icon="return-down-back-outline"
            tone="danger"
            compact
            onPress={onRefund}
            loading={actionLoading}
          />
        ) : null}
        <AdminActionChip
          label="Yolculuk"
          icon="open-outline"
          tone="default"
          compact
          onPress={() => router.push(`/detail/rides/${reservation.tripId}` as never)}
        />
        <AdminHeyetChip
          subjectType="ride_reservation"
          subjectId={reservation.id}
          partyALabel="Yolcu"
          partyBLabel="Sürücü"
          compact
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: { gap: spacing.xs },
  headerText: { gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  moneyBlock: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
  },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
