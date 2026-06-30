import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { RidePendingRequestCard } from '@/features/rides/components/RidePendingRequestCard';
import {
  formatContribution,
  PAYMENT_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  rideCityName,
  RIDES_ACCENT,
  tripDetailPath,
} from '@/features/rides/constants';
import {
  fetchDriverIncomingReservations,
  fetchPassengerReservations,
  requestRideReservationRefund,
  respondReservation,
} from '@/features/rides/services/reservationData';
import type { RideReservation } from '@/features/rides/types';
import { formatRideDeparture } from '@/features/rides/utils/dateFormat';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type Tab = 'mine' | 'incoming';

function MyReservationCard({ item }: { item: RideReservation }) {
  const trip = item.trip;
  const routeLabel = trip
    ? `${rideCityName(trip.fromCityId)} → ${rideCityName(trip.toCityId)}`
    : 'Yolculuk';
  const dateLabel = trip ? formatRideDeparture(trip.departureDate, trip.departureTime) : null;

  return (
    <Pressable onPress={() => router.push(tripDetailPath(item.tripId) as never)}>
      <GlassCard style={styles.myCard}>
        <Text variant="label" style={{ color: RIDES_ACCENT, fontWeight: '800' }}>
          {routeLabel}
        </Text>
        {dateLabel ? (
          <Text variant="caption" secondary>
            {dateLabel}
          </Text>
        ) : null}
        <Text variant="caption" style={{ marginTop: spacing.xs }}>
          {RESERVATION_STATUS_LABELS[item.status]} · {item.seatCount} koltuk ·{' '}
          {formatContribution(item.amountCents)}
        </Text>
        <Text variant="caption" secondary>
          {PAYMENT_STATUS_LABELS[item.paymentStatus] ?? item.paymentStatus}
        </Text>
      </GlassCard>
    </Pressable>
  );
}

export function MyReservationsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const initialTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const [tab, setTab] = useState<Tab>(initialTab === 'incoming' ? 'incoming' : 'mine');
  const [mine, setMine] = useState<RideReservation[]>([]);
  const [incoming, setIncoming] = useState<RideReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab === 'incoming') setTab('incoming');
  }, [initialTab]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [passengerRows, driverRows] = await Promise.all([
      fetchPassengerReservations(user.id),
      fetchDriverIncomingReservations(user.id),
    ]);
    setMine(passengerRows);
    setIncoming(driverRows);
    if (!initialTab && driverRows.length > 0) {
      setTab('incoming');
    }
    setLoading(false);
  }, [initialTab, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleRespond = async (reservationId: string, approve: boolean) => {
    setActingId(reservationId);
    const { error, needsRefund } = await respondReservation(reservationId, approve);
    if (error) {
      setActingId(null);
      Alert.alert('Hata', error);
      return;
    }
    if (needsRefund) {
      const refund = await requestRideReservationRefund(reservationId);
      setActingId(null);
      if (refund.error) {
        Alert.alert('İade', `${refund.error}\n\nİade admin tarafından tamamlanacak.`);
      } else {
        Alert.alert('Reddedildi', refund.message ?? 'Rezervasyon reddedildi.');
      }
    } else {
      setActingId(null);
      Alert.alert(approve ? 'Onaylandı' : 'Reddedildi', approve ? 'Rezervasyon onaylandı.' : 'Rezervasyon reddedildi.');
    }
    void load();
  };

  const data = tab === 'mine' ? mine : incoming;

  return (
    <GradientBackground>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.page}
        ListHeaderComponent={
          <View>
            <AuthHeader title="Rezervasyonlarım" showBack />
            <View style={styles.tabs}>
              <Pressable
                onPress={() => setTab('mine')}
                style={[
                  styles.tab,
                  { borderColor: colors.border, backgroundColor: tab === 'mine' ? `${RIDES_ACCENT}18` : colors.surface },
                ]}
              >
                <Text variant="caption" style={{ fontWeight: tab === 'mine' ? '700' : '500' }}>
                  Rezervasyonlarım
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTab('incoming')}
                style={[
                  styles.tab,
                  { borderColor: colors.border, backgroundColor: tab === 'incoming' ? `${RIDES_ACCENT}18` : colors.surface },
                ]}
              >
                <Text variant="caption" style={{ fontWeight: tab === 'incoming' ? '700' : '500' }}>
                  Gelen istekler{incoming.length ? ` (${incoming.length})` : ''}
                </Text>
              </Pressable>
            </View>
            {tab === 'incoming' && incoming.length > 0 ? (
              <Text secondary variant="caption" style={styles.incomingHint}>
                Yolculuklarınıza gelen rezervasyon talepleri — onaylayın veya reddedin.
              </Text>
            ) : null}
            {loading ? <ActivityIndicator color={RIDES_ACCENT} style={{ marginVertical: spacing.md }} /> : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <Text secondary style={{ padding: spacing.md }}>
              {tab === 'mine' ? 'Henüz rezervasyonunuz yok.' : 'Bekleyen rezervasyon isteği yok.'}
            </Text>
          ) : null
        }
        renderItem={({ item }) =>
          tab === 'incoming' ? (
            <RidePendingRequestCard
              reservation={item}
              showTripMeta
              acting={actingId === item.id}
              onApprove={() => void handleRespond(item.id, true)}
              onReject={() => void handleRespond(item.id, false)}
            />
          ) : (
            <MyReservationCard item={item} />
          )
        }
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.md, paddingTop: 0, gap: spacing.sm },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  incomingHint: { marginBottom: spacing.sm, lineHeight: 16 },
  myCard: { marginBottom: spacing.sm, borderRadius: radius.lg, gap: spacing.xs },
});
