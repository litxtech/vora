import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { HotelOwnerEarningsPanel } from '@/features/hotel-center/components/HotelOwnerEarningsPanel';
import { HOTEL_ACCENT, formatHotelCents } from '@/features/hotel-center/constants';
import {
  fetchHotelOwnerEarnings,
  hotelEarningPayoutLabel,
} from '@/features/hotel-center/services/ownerEarnings';
import type { HotelOwnerEarningRow, HotelOwnerEarningsSummary } from '@/features/hotel-center/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

const EMPTY_SUMMARY: HotelOwnerEarningsSummary = {
  reservationCount: 0,
  grossCents: 0,
  commissionCents: 0,
  netCents: 0,
  totalPaidCents: 0,
  scheduledPayoutCents: 0,
  pendingEscrowCents: 0,
  rows: [],
};

function EarningRow({ row }: { row: HotelOwnerEarningRow }) {
  const payoutLabel = hotelEarningPayoutLabel(row);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.cardHead}>
        <Text variant="label" numberOfLines={1}>
          {row.hotelName}
        </Text>
        <Text variant="caption" secondary>
          {row.reservationCode}
        </Text>
      </View>
      <Text variant="caption" secondary>
        {row.checkIn} → {row.checkOut} · {row.nights} gece
      </Text>
      <View style={styles.amountRow}>
        <Text variant="label" style={{ color: HOTEL_ACCENT }}>
          Net {formatHotelCents(row.ownerPayoutCents)}
        </Text>
        <Text variant="caption" secondary>
          Brüt {formatHotelCents(row.grossCents)} · −{formatHotelCents(row.commissionCents)}
        </Text>
      </View>
      <View style={styles.payoutRow}>
        <Ionicons
          name={row.payoutCompletedAt ? 'checkmark-circle' : 'time-outline'}
          size={13}
          color={row.payoutCompletedAt ? '#43A047' : HOTEL_ACCENT}
        />
        <Text variant="caption" style={{ color: row.payoutCompletedAt ? '#43A047' : HOTEL_ACCENT, fontWeight: '600' }}>
          {payoutLabel}
        </Text>
      </View>
    </GlassCard>
  );
}

export function HotelOwnerEarningsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [summary, setSummary] = useState<HotelOwnerEarningsSummary>(EMPTY_SUMMARY);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      void fetchHotelOwnerEarnings(user.id).then(setSummary);
    }, [user?.id]),
  );

  return (
    <GradientBackground>
      <FlatList
        data={summary.rows}
        keyExtractor={(item) => item.reservationId}
        contentContainerStyle={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl }]}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <AuthHeader
              title="Otel Kazançlarım"
              subtitle="Rezervasyon bazında net gelir ve ödeme planı"
              showBack
            />
            <HotelOwnerEarningsPanel summary={summary} />
            {summary.rows.length > 0 ? (
              <Text variant="label">Rezervasyon bazında</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text secondary style={{ padding: spacing.md, textAlign: 'center' }}>
            Henüz onaylı rezervasyon kazancı yok.
          </Text>
        }
        renderItem={({ item }) => <EarningRow row={item} />}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.md },
  card: { marginBottom: spacing.sm, gap: spacing.xs },
  cardHead: { gap: 2 },
  amountRow: { gap: 2, marginTop: spacing.xs },
  payoutRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
