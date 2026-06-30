import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  formatContribution,
  formatRideReservationRef,
  PAYMENT_STATUS_LABELS,
  rideCityName,
  RIDES_ACCENT,
} from '@/features/rides/constants';
import type { RideReservation } from '@/features/rides/types';
import { formatRideDeparture } from '@/features/rides/utils/dateFormat';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type RideRefundReservationPickerProps = {
  reservations: RideReservation[];
  selectedId: string | null;
  loading?: boolean;
  onSelect: (reservation: RideReservation) => void;
};

export function RideRefundReservationPicker({
  reservations,
  selectedId,
  loading = false,
  onSelect,
}: RideRefundReservationPickerProps) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.wrap, { borderBottomColor: colors.border }]}>
        <ActivityIndicator color={RIDES_ACCENT} size="small" />
        <Text secondary variant="caption">
          Rezervasyonlar yükleniyor…
        </Text>
      </View>
    );
  }

  if (reservations.length === 0) {
    return (
      <View style={[styles.wrap, styles.empty, { borderBottomColor: colors.border }]}>
        <Ionicons name="car-outline" size={18} color={colors.textMuted} />
        <Text secondary variant="caption" style={styles.emptyText}>
          İade veya destek için uygun rezervasyon bulunamadı. Önce bir yolculuk rezervasyonu yapın.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.border }]}>
      <Text variant="caption" secondary style={styles.label}>
        Rezervasyon seçin
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.row}
      >
        {reservations.map((item) => {
          const active = item.id === selectedId;
          const trip = item.trip;
          const route = trip
            ? `${rideCityName(trip.fromCityId)} → ${rideCityName(trip.toCityId)}`
            : 'Yolculuk';
          const dateLabel = trip ? formatRideDeparture(trip.departureDate, trip.departureTime) : null;

          return (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item)}
              style={[
                styles.chip,
                {
                  borderColor: active ? RIDES_ACCENT : colors.border,
                  backgroundColor: active ? `${RIDES_ACCENT}14` : colors.surfaceElevated,
                },
              ]}
            >
              <Text variant="caption" style={{ color: active ? RIDES_ACCENT : colors.text, fontWeight: '700' }}>
                {formatRideReservationRef(item.id)}
              </Text>
              <Text variant="caption" secondary numberOfLines={1}>
                {route}
              </Text>
              {dateLabel ? (
                <Text variant="caption" secondary numberOfLines={1}>
                  {dateLabel}
                </Text>
              ) : null}
              <Text variant="caption" secondary numberOfLines={1}>
                {formatContribution(item.amountCents)} ·{' '}
                {PAYMENT_STATUS_LABELS[item.paymentStatus] ?? item.paymentStatus}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  emptyText: {
    flex: 1,
    lineHeight: 17,
  },
  label: {
    fontWeight: '600',
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    width: 168,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
});
