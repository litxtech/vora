import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  formatCents,
  myReservationsPath,
  myTripsPath,
  registerVehiclePath,
  ridesCreatePath,
  ridesEarningsPath,
  ridesLicensePath,
  ridesPayoutProfilePath,
  RIDES_ACCENT,
  RIDES_GRADIENT,
} from '@/features/rides/constants';
import { fetchRideTrips } from '@/features/rides/services/tripData';
import { fetchPassengerReservations, countPendingReservationsForDriver } from '@/features/rides/services/reservationData';
import { fetchDriverEarnings } from '@/features/rides/services/earningsData';
import { fetchUserVehicles } from '@/features/rides/services/vehicleData';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { RIDES_FEATURE } from '@/features/rides/featureFlags';
import { resolveMarketplaceRegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type HubStats = {
  trips: number;
  reservations: number;
  pending: number;
  vehicles: number;
  approvedVehicles: number;
  driverPaid: number;
  driverScheduled: number;
  driverPending: number;
};

const EMPTY_STATS: HubStats = {
  trips: 0,
  reservations: 0,
  pending: 0,
  vehicles: 0,
  approvedVehicles: 0,
  driverPaid: 0,
  driverScheduled: 0,
  driverPending: 0,
};

export function RidesAccountHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const showCreate = useFeatureVisible(RIDES_FEATURE.section.create);
  const showVehicles = useFeatureVisible(RIDES_FEATURE.section.vehicles);
  const showLicense = useFeatureVisible(RIDES_FEATURE.section.license);
  const showPayout = useFeatureVisible(RIDES_FEATURE.section.payout);
  const showEarnings = useFeatureVisible(RIDES_FEATURE.section.earnings);
  const showMyTrips = useFeatureVisible(RIDES_FEATURE.section.myTrips);
  const showReservations = useFeatureVisible(RIDES_FEATURE.section.reservations);
  const [stats, setStats] = useState<HubStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const regionId = resolveMarketplaceRegionId(profile?.region_id);

    try {
      const [trips, reservations, pending, earnings, vehicles] = await Promise.all([
        fetchRideTrips('mine', regionId, user.id).catch(() => []),
        fetchPassengerReservations(user.id),
        countPendingReservationsForDriver(user.id),
        fetchDriverEarnings(user.id),
        fetchUserVehicles(user.id),
      ]);

      setStats({
        trips: trips.length,
        reservations: reservations.length,
        pending,
        vehicles: vehicles.length,
        approvedVehicles: vehicles.filter((v) => v.verificationStatus === 'approved').length,
        driverPaid: earnings.totalPaidCents,
        driverScheduled: earnings.scheduledPayoutCents,
        driverPending: earnings.pendingPayoutCents,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.region_id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RIDES_ACCENT} />}
      >
        <AuthHeader title="Yolculuk Hesabım" showBack />

        {loading && !refreshing ? (
          <ActivityIndicator color={RIDES_ACCENT} style={{ marginTop: spacing.xl }} />
        ) : (
          <>
            <LinearGradient colors={[RIDES_GRADIENT[0], RIDES_GRADIENT[1]]} style={styles.hero}>
              <Ionicons name="car" size={28} color="#fff" />
              <Text style={styles.heroTitle}>{firstName ? `${firstName}, yolculuklar` : 'Yolculuk hesabın'}</Text>
              <Text style={styles.heroSub}>Paylaştığın ve katıldığın yolculuklar</Text>
              <View style={styles.heroMetrics}>
                <HeroMetric label="Yatırılan" value={formatCents(stats.driverPaid)} />
                <View style={styles.heroDivider} />
                <HeroMetric label="Planlanan" value={formatCents(stats.driverScheduled)} />
              </View>
            </LinearGradient>

            <View style={styles.statsRow}>
              <StatCard value={stats.trips} label="Yolculuk" />
              <StatCard value={stats.reservations} label="Rezervasyon" />
              <StatCard value={stats.pending} label="Bekleyen" highlight={stats.pending > 0} />
            </View>

            <View style={styles.statsRow}>
              <StatCard value={stats.vehicles} label="Araç" />
              <StatCard value={stats.approvedVehicles} label="Onaylı araç" highlight={stats.approvedVehicles > 0} />
              <StatCard
                value={stats.driverPending > 0 ? formatCents(stats.driverPending) : '—'}
                label="Escrow"
                compact
              />
            </View>

            {stats.pending > 0 ? (
              <Pressable onPress={() => router.push(myReservationsPath('incoming') as never)}>
                <GlassCard style={[styles.alertBanner, { borderColor: `${RIDES_ACCENT}55` }]}>
                  <View style={[styles.alertIcon, { backgroundColor: `${RIDES_ACCENT}18` }]}>
                    <Ionicons name="person-add-outline" size={18} color={RIDES_ACCENT} />
                  </View>
                  <View style={styles.alertBody}>
                    <Text variant="label" style={{ fontSize: 13 }}>
                      {stats.pending} bekleyen talep
                    </Text>
                    <Text secondary variant="caption">
                      Yolculuklarınıza gelen rezervasyon istekleri
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </GlassCard>
              </Pressable>
            ) : null}

            {showCreate ? (
              <HubLink
                icon="add-circle-outline"
                label="Yolculuk paylaş"
                sub="Boş koltuk ilanı ver"
                onPress={() => router.push(ridesCreatePath() as never)}
                accent={RIDES_ACCENT}
              />
            ) : null}
            {showMyTrips ? (
              <HubLink
                icon="list-outline"
                label="Yolculuklarım"
                sub={`${stats.trips} ilan`}
                onPress={() => router.push(myTripsPath() as never)}
              />
            ) : null}
            {showReservations ? (
              <HubLink
                icon="ticket-outline"
                label="Rezervasyonlarım"
                sub={`${stats.reservations} kayıt`}
                onPress={() => router.push(myReservationsPath() as never)}
              />
            ) : null}
            {showVehicles ? (
              <HubLink
                icon="car-sport-outline"
                label="Araçlarım"
                sub={
                  stats.vehicles > 0
                    ? `${stats.vehicles} araç · ${stats.approvedVehicles} onaylı`
                    : 'Araç kaydı & doğrulama'
                }
                onPress={() => router.push(registerVehiclePath() as never)}
              />
            ) : null}
            {showLicense ? (
              <HubLink
                icon="card-outline"
                label="Ehliyet doğrulama"
                sub="Sürücü güven rozeti"
                onPress={() => router.push(ridesLicensePath() as never)}
              />
            ) : null}
            {showPayout ? (
              <HubLink
                icon="wallet-outline"
                label="IBAN & ödeme profili"
                sub="Sürücü kazanç transferi"
                onPress={() => router.push(ridesPayoutProfilePath() as never)}
              />
            ) : null}
            {showEarnings ? (
              <HubLink
                icon="cash-outline"
                label="Sürücü kazançları"
                sub={
                  stats.driverPaid > 0
                    ? `${formatCents(stats.driverPaid)} yatırıldı`
                    : 'Tamamlanan yolculuklar'
                }
                onPress={() => router.push(ridesEarningsPath() as never)}
              />
            ) : null}

            {stats.driverScheduled > 0 ? (
              <GlassCard style={{ marginTop: spacing.md }}>
                <Text variant="label">Planlanan sürücü ödemesi</Text>
                <Text variant="h3" style={{ color: RIDES_ACCENT }}>
                  {formatCents(stats.driverScheduled)}
                </Text>
              </GlassCard>
            ) : null}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroMetric}>
      <Text style={styles.heroMetricValue}>{value}</Text>
      <Text style={styles.heroMetricLabel}>{label}</Text>
    </View>
  );
}

function StatCard({
  value,
  label,
  highlight,
  compact,
}: {
  value: number | string;
  label: string;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <GlassCard style={styles.stat}>
      <Text variant={compact ? 'label' : 'h3'} style={{ color: highlight ? RIDES_ACCENT : RIDES_ACCENT }}>
        {value}
      </Text>
      <Text variant="caption" secondary>
        {label}
      </Text>
    </GlassCard>
  );
}

function HubLink({
  icon,
  label,
  sub,
  onPress,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  onPress: () => void;
  accent?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.link, { borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}
    >
      <Ionicons name={icon} size={22} color={accent ?? RIDES_ACCENT} />
      <View style={{ flex: 1 }}>
        <Text variant="label">{label}</Text>
        <Text variant="caption" secondary>
          {sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.md },
  hero: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, gap: 4 },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  heroMetrics: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  heroMetric: { flex: 1, alignItems: 'center', gap: 2 },
  heroMetricValue: { color: '#fff', fontWeight: '800', fontSize: 16 },
  heroMetricLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  heroDivider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.25)' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBody: { flex: 1, gap: 2 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
});
