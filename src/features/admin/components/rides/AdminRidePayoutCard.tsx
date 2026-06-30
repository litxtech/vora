import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminRideStatusBadge } from '@/features/admin/components/rides/AdminRideStatusBadge';
import { formatCents, rideCityName } from '@/features/rides/constants';
import type { AdminRideReservationRow } from '@/features/rides/services/adminRides';
import type { AdminRideTripRow } from '@/features/rides/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  reservation: AdminRideReservationRow;
  trip?: AdminRideTripRow | null;
  payoutRef: string;
  onPayoutRefChange: (value: string) => void;
  onMarkPaid: () => void;
  actionLoading?: boolean;
};

function payoutDaysRemaining(payoutDueAt: string | null): number | null {
  if (!payoutDueAt) return null;
  const ms = new Date(payoutDueAt).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
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

export function AdminRidePayoutCard({
  reservation,
  trip,
  payoutRef,
  onPayoutRefChange,
  onMarkPaid,
  actionLoading = false,
}: Props) {
  const { colors } = useTheme();
  const route = trip
    ? `${rideCityName(trip.fromCityId)} → ${rideCityName(trip.toCityId)}`
    : `Yolculuk #${reservation.tripId.slice(0, 8)}`;
  const daysLeft = payoutDaysRemaining(reservation.payoutDueAt);
  const overdue = daysLeft != null && daysLeft < 0;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="label" numberOfLines={1}>
            {route}
          </Text>
          <Text secondary variant="caption">
            {reservation.seatCount} koltuk · sürücü transferi
          </Text>
        </View>
        <AdminRideStatusBadge
          label={overdue ? 'Gecikmiş' : daysLeft === 0 ? 'Bugün' : daysLeft != null ? `${daysLeft} gün` : 'Planlandı'}
          tone={overdue ? 'danger' : daysLeft != null && daysLeft <= 2 ? 'warning' : 'primary'}
        />
      </View>

      <View style={[styles.moneyBlock, { borderColor: colors.border }]}>
        <MoneyRow label="Sürücü net" value={formatCents(reservation.driverPayoutCents)} accent={colors.success} />
        <MoneyRow label="Vade" value={reservation.payoutDueAt ? new Date(reservation.payoutDueAt).toLocaleDateString('tr-TR') : '—'} />
      </View>

      <Input
        label="Transfer referansı"
        value={payoutRef}
        onChangeText={onPayoutRefChange}
        placeholder="Banka dekont / EFT referansı"
      />

      <View style={styles.actions}>
        <AdminActionChip
          label="Ödeme yapıldı"
          icon="wallet-outline"
          tone="success"
          compact
          onPress={onMarkPaid}
          loading={actionLoading}
        />
        <AdminActionChip
          label="Yolculuk"
          icon="open-outline"
          tone="default"
          compact
          onPress={() => router.push(`/detail/rides/${reservation.tripId}` as never)}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  headerText: { flex: 1, gap: 2 },
  moneyBlock: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
  },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
