import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminRideStatusBadge } from '@/features/admin/components/rides/AdminRideStatusBadge';
import { formatCents, rideCityName, TRIP_STATUS_LABELS } from '@/features/rides/constants';
import type { AdminRideTripRow } from '@/features/rides/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  trip: AdminRideTripRow;
  onCancel?: () => void;
  actionLoading?: boolean;
};

function tripStatusTone(status: AdminRideTripRow['status']): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'published':
    case 'full':
      return 'primary';
    case 'in_progress':
      return 'warning';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'default';
  }
}

function formatDeparture(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AdminRideTripCard({ trip, onCancel, actionLoading = false }: Props) {
  const { colors } = useTheme();
  const route = `${rideCityName(trip.fromCityId)} → ${rideCityName(trip.toCityId)}`;
  const canCancel = trip.status !== 'completed' && trip.status !== 'cancelled';

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="label" numberOfLines={1}>
            {route}
          </Text>
          <Text secondary variant="caption">
            {formatDeparture(trip.departureDate)} · {formatCents(trip.contributionCents)}/kişi
          </Text>
        </View>
        <AdminRideStatusBadge label={TRIP_STATUS_LABELS[trip.status]} tone={tripStatusTone(trip.status)} />
      </View>

      <View style={[styles.meta, { backgroundColor: `${colors.surface}AA` }]}>
        <View style={styles.metaItem}>
          <Ionicons name="people-outline" size={13} color={colors.textMuted} />
          <Text variant="caption">
            {trip.availableSeats}/{trip.seatsTotal} boş koltuk
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text variant="caption" secondary>
            {new Date(trip.createdAt).toLocaleDateString('tr-TR')}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <AdminActionChip
          label="Detay"
          icon="open-outline"
          tone="default"
          compact
          onPress={() => router.push(`/detail/rides/${trip.id}` as never)}
        />
        {canCancel && onCancel ? (
          <AdminActionChip
            label="İptal"
            icon="close-circle-outline"
            tone="danger"
            compact
            onPress={onCancel}
            loading={actionLoading}
          />
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  headerText: { flex: 1, gap: 2 },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
