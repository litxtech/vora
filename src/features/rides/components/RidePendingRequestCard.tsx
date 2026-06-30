import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import {
  formatContribution,
  rideCityName,
  RIDES_ACCENT,
} from '@/features/rides/constants';
import {
  ridePassengerDisplayName,
  ridePassengerMetaLine,
} from '@/features/rides/utils/passengerDetails';
import { formatRideDeparture } from '@/features/rides/utils/dateFormat';
import type { RideReservation } from '@/features/rides/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function openPassengerProfile(reservation: RideReservation) {
  if (reservation.passengerUsername) {
    router.push(`/u/${reservation.passengerUsername}` as never);
    return;
  }
  if (reservation.passengerId) {
    router.push(`/user/${reservation.passengerId}` as never);
  }
}

type Props = {
  reservation: RideReservation;
  onApprove: () => void;
  onReject: () => void;
  acting?: boolean;
  showTripMeta?: boolean;
};

export function RidePendingRequestCard({
  reservation,
  onApprove,
  onReject,
  acting = false,
  showTripMeta = false,
}: Props) {
  const { colors } = useTheme();
  const passenger = ridePassengerDisplayName(reservation);
  const passengerMeta = ridePassengerMetaLine(reservation);
  const trip = reservation.trip;
  const canOpenProfile = Boolean(reservation.passengerUsername || reservation.passengerId);

  return (
    <View style={[styles.card, { borderColor: `${RIDES_ACCENT}44`, backgroundColor: `${RIDES_ACCENT}0C` }]}>
      <Pressable
        onPress={canOpenProfile ? () => openPassengerProfile(reservation) : undefined}
        disabled={!canOpenProfile}
        style={styles.topRow}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${RIDES_ACCENT}1A` }]}>
          <Ionicons name="person-add-outline" size={15} color={RIDES_ACCENT} />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text
              variant="label"
              style={[styles.name, canOpenProfile && { color: RIDES_ACCENT }]}
              numberOfLines={1}
            >
              {passenger}
            </Text>
            <View style={[styles.badge, { backgroundColor: `${colors.warning}20` }]}>
              <Text variant="caption" style={[styles.badgeText, { color: colors.warning }]}>
                Onay bekliyor
              </Text>
            </View>
          </View>
          {showTripMeta && trip ? (
            <Text variant="caption" secondary numberOfLines={1}>
              {rideCityName(trip.fromCityId)} → {rideCityName(trip.toCityId)} ·{' '}
              {formatRideDeparture(trip.departureDate, trip.departureTime)}
            </Text>
          ) : null}
          <Text variant="caption" secondary>
            {reservation.seatCount} koltuk · {formatContribution(reservation.amountCents)}
          </Text>
          {passengerMeta ? (
            <Text variant="caption" secondary numberOfLines={1}>
              {passengerMeta}
            </Text>
          ) : null}
          {reservation.passengerNote ? (
            <Text variant="caption" secondary numberOfLines={1} style={styles.note}>
              «{reservation.passengerNote}»
            </Text>
          ) : null}
          {canOpenProfile ? (
            <Text variant="caption" style={{ color: RIDES_ACCENT, fontSize: 11, marginTop: 2 }}>
              Profile git →
            </Text>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Button title="Onayla" size="compact" loading={acting} onPress={onApprove} style={styles.btn} />
        <Button title="Reddet" size="compact" variant="outline" loading={acting} onPress={onReject} style={styles.btn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  topRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { flex: 1, fontSize: 13, fontWeight: '700' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  note: { fontStyle: 'italic', marginTop: 1 },
  actions: { flexDirection: 'row', gap: spacing.xs },
  btn: { flex: 1 },
});
