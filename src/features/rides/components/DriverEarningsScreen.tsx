import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { formatCents, PAYMENT_STATUS_LABELS, RIDES_ACCENT } from '@/features/rides/constants';
import { fetchDriverEarnings, type DriverEarningRow } from '@/features/rides/services/earningsData';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

function EarningRow({ row }: { row: DriverEarningRow }) {
  const payoutLabel = row.payoutCompletedAt
    ? 'Ödendi'
    : row.paymentStatus === 'released'
      ? row.payoutDueAt
        ? `Planlandı · ${new Date(row.payoutDueAt).toLocaleDateString('tr-TR')}`
        : 'Aktarım bekliyor'
      : PAYMENT_STATUS_LABELS[row.paymentStatus] ?? row.paymentStatus;

  return (
    <GlassCard style={styles.card}>
      <Text variant="label">{row.routeLabel}</Text>
      <Text variant="caption">{row.seatCount} koltuk · net {formatCents(row.driverPayoutCents)}</Text>
      <Text variant="caption" secondary>{payoutLabel}</Text>
    </GlassCard>
  );
}

export function DriverEarningsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchDriverEarnings>> | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      void fetchDriverEarnings(user.id).then(setSummary);
    }, [user?.id]),
  );

  return (
    <GradientBackground>
      <FlatList
        data={summary?.rows ?? []}
        keyExtractor={(item) => item.reservationId}
        contentContainerStyle={[styles.page, { paddingTop: insets.top }]}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <AuthHeader title="Sürücü Kazançları" subtitle="Tamamlanan yolculuklardan net gelir" showBack />
            {summary ? (
              <View style={styles.statsRow}>
                <GlassCard style={styles.stat}>
                  <Text variant="h3" style={{ color: RIDES_ACCENT }}>{formatCents(summary.totalPaidCents)}</Text>
                  <Text variant="caption" secondary>Yatırıldı</Text>
                </GlassCard>
                <GlassCard style={styles.stat}>
                  <Text variant="h3" style={{ color: RIDES_ACCENT }}>{formatCents(summary.scheduledPayoutCents)}</Text>
                  <Text variant="caption" secondary>Planlanan</Text>
                </GlassCard>
                <GlassCard style={styles.stat}>
                  <Text variant="h3" style={{ color: RIDES_ACCENT }}>{formatCents(summary.pendingPayoutCents)}</Text>
                  <Text variant="caption" secondary>Escrow</Text>
                </GlassCard>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<Text secondary style={{ padding: spacing.md }}>Henüz tamamlanan yolculuk kazancı yok.</Text>}
        renderItem={({ item }) => <EarningRow row={item} />}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xxl },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  card: { marginBottom: spacing.sm },
});
