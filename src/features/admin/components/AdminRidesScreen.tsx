import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminIdentityDocumentViewer } from '@/features/admin/components/shared/AdminIdentityDocumentViewer';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { AdminRidePayoutCard } from '@/features/admin/components/rides/AdminRidePayoutCard';
import { AdminRideReservationCard } from '@/features/admin/components/rides/AdminRideReservationCard';
import { AdminRideTripCard } from '@/features/admin/components/rides/AdminRideTripCard';
import { AdminRideVerifyCard } from '@/features/admin/components/rides/AdminRideVerifyCard';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import {
  adminCancelTrip,
  adminMarkRidePayout,
  adminRefundRideReservation,
  adminVerifyRideLicense,
  adminVerifyRideVehicle,
  fetchAdminPendingVehicles,
  fetchAdminRideLicenseQueue,
  fetchAdminRideReservations,
  fetchAdminRideTrips,
  fetchAdminRidesSummary,
} from '@/features/rides/services/adminRides';
import { formatCents, RIDES_ACCENT } from '@/features/rides/constants';
import type { AdminRideTripRow, AdminRidesSummary } from '@/features/rides/types';
import { spacing } from '@/constants/theme';

type Tab = 'overview' | 'trips' | 'reservations' | 'payouts' | 'verify';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Özet' },
  { id: 'trips', label: 'Yolculuklar' },
  { id: 'reservations', label: 'Rezervasyonlar' },
  { id: 'payouts', label: 'Sürücü ödemesi' },
  { id: 'verify', label: 'Doğrulama' },
];

const TRIP_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Aktif' },
  { id: 'in_progress', label: 'Yolda' },
  { id: 'completed', label: 'Tamamlanan' },
  { id: 'cancelled', label: 'İptal' },
] as const;

const RESERVATION_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'pending', label: 'Onay bekleyen' },
  { id: 'escrow', label: 'Escrow' },
  { id: 'approved', label: 'Onaylı' },
  { id: 'completed', label: 'Tamamlanan' },
] as const;

type TripFilter = (typeof TRIP_FILTERS)[number]['id'];
type ReservationFilter = (typeof RESERVATION_FILTERS)[number]['id'];

type DocumentViewerState = {
  uri: string | null;
  label: string;
  loading: boolean;
};

export function AdminRidesScreen() {
  const guard = useAdminGuard();
  const [tab, setTab] = useState<Tab>('overview');
  const [tripFilter, setTripFilter] = useState<TripFilter>('all');
  const [reservationFilter, setReservationFilter] = useState<ReservationFilter>('all');
  const [summary, setSummary] = useState<AdminRidesSummary | null>(null);
  const [trips, setTrips] = useState<AdminRideTripRow[]>([]);
  const [reservations, setReservations] = useState<Awaited<ReturnType<typeof fetchAdminRideReservations>>>([]);
  const [licenses, setLicenses] = useState<Awaited<ReturnType<typeof fetchAdminRideLicenseQueue>>>([]);
  const [vehicles, setVehicles] = useState<Awaited<ReturnType<typeof fetchAdminPendingVehicles>>>([]);
  const [payoutRef, setPayoutRef] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [documentViewer, setDocumentViewer] = useState<DocumentViewerState | null>(null);

  const load = useCallback(async () => {
    if (guard.status !== 'allowed') return;
    setLoading(true);
    const [nextSummary, nextTrips, nextReservations, nextLicenses, nextVehicles] = await Promise.all([
      fetchAdminRidesSummary(),
      fetchAdminRideTrips(),
      fetchAdminRideReservations(),
      fetchAdminRideLicenseQueue(),
      fetchAdminPendingVehicles(),
    ]);
    setSummary(nextSummary);
    setTrips(nextTrips);
    setReservations(nextReservations);
    setLicenses(nextLicenses);
    setVehicles(nextVehicles);
    setLoading(false);
  }, [guard.status]);

  useEffect(() => {
    void load();
  }, [load]);

  const tripMap = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips]);

  const payoutDueRows = useMemo(
    () =>
      reservations.filter(
        (r) => r.status === 'completed' && r.paymentStatus === 'released' && !r.payoutCompletedAt,
      ),
    [reservations],
  );

  const filteredTrips = useMemo(() => {
    switch (tripFilter) {
      case 'active':
        return trips.filter((t) => ['published', 'full', 'draft'].includes(t.status));
      case 'in_progress':
        return trips.filter((t) => t.status === 'in_progress');
      case 'completed':
        return trips.filter((t) => t.status === 'completed');
      case 'cancelled':
        return trips.filter((t) => t.status === 'cancelled');
      default:
        return trips;
    }
  }, [trips, tripFilter]);

  const filteredReservations = useMemo(() => {
    switch (reservationFilter) {
      case 'pending':
        return reservations.filter((r) => r.status === 'pending' && r.paymentStatus === 'held');
      case 'escrow':
        return reservations.filter((r) => r.paymentStatus === 'held');
      case 'approved':
        return reservations.filter((r) => r.status === 'approved');
      case 'completed':
        return reservations.filter((r) => r.status === 'completed');
      default:
        return reservations;
    }
  }, [reservations, reservationFilter]);

  const verifyCount = licenses.length + vehicles.length;

  const runAction = async (id: string, action: () => Promise<{ error: string | null; message?: string }>) => {
    setActionId(id);
    const result = await action();
    setActionId(null);
    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }
    if (result.message) Alert.alert('Tamam', result.message);
    await load();
  };

  const cancelTrip = (tripId: string) => {
    Alert.alert('Yolculuk iptali', 'Bu yolculuk zorla iptal edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: () => void runAction(tripId, () => adminCancelTrip(tripId, 'Admin iptali')),
      },
    ]);
  };

  const refund = (reservationId: string) => {
    Alert.alert('Stripe iadesi', 'Bu rezervasyon iade edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İade et',
        style: 'destructive',
        onPress: () => void runAction(reservationId, () => adminRefundRideReservation(reservationId)),
      },
    ]);
  };

  const markPayout = (reservationId: string) => {
    const ref = payoutRef[reservationId]?.trim();
    if (!ref) {
      Alert.alert('Referans gerekli', 'Banka transfer referansını girin.');
      return;
    }
    Alert.alert('Sürücü ödemesi', 'Transfer tamamlandı olarak işaretlensin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: () => void runAction(reservationId, () => adminMarkRidePayout(reservationId, ref)),
      },
    ]);
  };

  const rejectLicense = (id: string) => {
    Alert.prompt('Red nedeni', 'Opsiyonel', (reason) => {
      void runAction(id, () => adminVerifyRideLicense(id, false, reason ?? undefined));
    });
  };

  const rejectVehicle = (id: string) => {
    Alert.prompt('Red nedeni', 'Opsiyonel', (reason) => {
      void runAction(id, () => adminVerifyRideVehicle(id, false, reason ?? undefined));
    });
  };

  const openDocument = (uri: string, label: string) => {
    if (!uri) {
      setDocumentViewer(null);
      return;
    }
    setDocumentViewer({ uri, label, loading: false });
  };

  const openDocumentLoading = (label: string) => {
    setDocumentViewer({ uri: null, label, loading: true });
  };

  if (guard.status !== 'allowed') {
    return (
      <AdminShell title="Paylaşımlı Yolculuk" subtitle="Yetki gerekli">
        <Text secondary>Admin yetkisi yok.</Text>
      </AdminShell>
    );
  }

  return (
    <>
    <AdminShell
      title="Paylaşımlı Yolculuk"
      subtitle="Escrow, rezervasyonlar, sürücü ödemeleri ve doğrulama"
      onRefresh={load}
      refreshing={loading}
    >
      <AdminFilterChip options={TABS} value={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <>
          {summary ? (
            <View style={styles.stats}>
              <AdminStatCard
                label="Yayında yolculuk"
                value={summary.publishedTrips}
                icon="car-outline"
                accent={RIDES_ACCENT}
                onPress={summary.publishedTrips > 0 ? () => { setTripFilter('active'); setTab('trips'); } : undefined}
              />
              <AdminStatCard
                label="Yolda"
                value={summary.inProgress}
                icon="navigate-outline"
                accent={RIDES_ACCENT}
                onPress={summary.inProgress > 0 ? () => { setTripFilter('in_progress'); setTab('trips'); } : undefined}
              />
              <AdminStatCard
                label="Onay bekleyen rez."
                value={summary.pendingReservations}
                icon="time-outline"
                accent={RIDES_ACCENT}
                onPress={
                  summary.pendingReservations > 0
                    ? () => {
                        setReservationFilter('pending');
                        setTab('reservations');
                      }
                    : undefined
                }
              />
              <AdminStatCard
                label="Escrow tutarı"
                value={formatCents(summary.escrowCents ?? 0)}
                icon="lock-closed-outline"
                accent={RIDES_ACCENT}
                onPress={
                  (summary.escrowCents ?? 0) > 0
                    ? () => {
                        setReservationFilter('escrow');
                        setTab('reservations');
                      }
                    : undefined
                }
              />
              <AdminStatCard
                label="Sürücü ödemesi bekleyen"
                value={summary.payoutDue ?? 0}
                icon="wallet-outline"
                accent={RIDES_ACCENT}
                onPress={(summary.payoutDue ?? 0) > 0 ? () => setTab('payouts') : undefined}
              />
              <AdminStatCard
                label="Toplam komisyon"
                value={formatCents(summary.totalCommissionCents)}
                icon="cash-outline"
                accent={RIDES_ACCENT}
              />
              <AdminStatCard
                label="Doğrulama kuyruğu"
                value={verifyCount}
                icon="shield-checkmark-outline"
                accent={RIDES_ACCENT}
                onPress={verifyCount > 0 ? () => setTab('verify') : undefined}
              />
              {(summary.openComplaints ?? 0) > 0 ? (
                <AdminStatCard
                  label="Açık şikayet"
                  value={summary.openComplaints ?? 0}
                  icon="flag-outline"
                  accent={RIDES_ACCENT}
                />
              ) : null}
            </View>
          ) : (
            <AdminEmptyState loading={loading} icon="car-outline" title="Özet yükleniyor" />
          )}
          <AdminSectionHeader
            title="Canlı durum"
            hint="Kartlara dokunarak ilgili sekmeye geçin · aşağı çekerek yenileyin"
          />
        </>
      ) : null}

      {tab === 'trips' ? (
        <>
          <AdminSectionHeader title="Yolculuklar" hint="Aktif ilanlar, yoldaki seferler ve iptaller" />
          <AdminFilterChip options={[...TRIP_FILTERS]} value={tripFilter} onChange={setTripFilter} />
          {filteredTrips.length === 0 ? (
            <AdminEmptyState
              loading={loading}
              icon="car-outline"
              title="Yolculuk yok"
              message="Seçili filtreye uygun yolculuk bulunamadı."
            />
          ) : (
            filteredTrips.map((trip) => (
              <AdminRideTripCard
                key={trip.id}
                trip={trip}
                onCancel={() => cancelTrip(trip.id)}
                actionLoading={actionId === trip.id}
              />
            ))
          )}
        </>
      ) : null}

      {tab === 'reservations' ? (
        <>
          <AdminSectionHeader title="Rezervasyonlar" hint="Ödeme durumu, escrow ve iade işlemleri" />
          <AdminFilterChip options={[...RESERVATION_FILTERS]} value={reservationFilter} onChange={setReservationFilter} />
          {filteredReservations.length === 0 ? (
            <AdminEmptyState
              loading={loading}
              icon="ticket-outline"
              title="Rezervasyon yok"
              message="Seçili filtreye uygun rezervasyon bulunamadı."
            />
          ) : (
            filteredReservations.map((reservation) => (
              <AdminRideReservationCard
                key={reservation.id}
                reservation={reservation}
                trip={tripMap.get(reservation.tripId) ?? null}
                onRefund={() => refund(reservation.id)}
                actionLoading={actionId === reservation.id}
              />
            ))
          )}
        </>
      ) : null}

      {tab === 'payouts' ? (
        <>
          <AdminSectionHeader
            title="Sürücü ödemeleri"
            hint="Tamamlanan yolculuklardan planlanan IBAN transferleri"
          />
          {payoutDueRows.length === 0 ? (
            <AdminEmptyState
              loading={loading}
              icon="wallet-outline"
              title="Bekleyen ödeme yok"
              message="Planlanmış sürücü transferi bulunmuyor."
            />
          ) : (
            payoutDueRows.map((reservation) => (
              <AdminRidePayoutCard
                key={reservation.id}
                reservation={reservation}
                trip={tripMap.get(reservation.tripId) ?? null}
                payoutRef={payoutRef[reservation.id] ?? ''}
                onPayoutRefChange={(v) => setPayoutRef((prev) => ({ ...prev, [reservation.id]: v }))}
                onMarkPaid={() => markPayout(reservation.id)}
                actionLoading={actionId === reservation.id}
              />
            ))
          )}
        </>
      ) : null}

      {tab === 'verify' ? (
        <>
          <AdminSectionHeader title="Doğrulama kuyruğu" hint="Ehliyet ve araç kayıtlarını inceleyin" />
          {licenses.length === 0 && vehicles.length === 0 ? (
            <AdminEmptyState
              loading={loading}
              icon="shield-checkmark-outline"
              title="Bekleyen başvuru yok"
              message="Ehliyet veya araç doğrulama kuyruğu boş. Araç onayı olmadan yolculuk Keşfet'te görünmez."
            />
          ) : (
            <>
              {licenses.length > 0 ? (
                <Text variant="caption" secondary style={styles.queueLabel}>
                  Ehliyet ({licenses.length})
                </Text>
              ) : null}
              {licenses.map((item) => (
                <AdminRideVerifyCard
                  key={item.id}
                  kind="license"
                  item={item}
                  onApprove={() => void runAction(item.id, () => adminVerifyRideLicense(item.id, true))}
                  onReject={() => rejectLicense(item.id)}
                  actionLoading={actionId === item.id}
                  onOpenDocument={openDocument}
                  onOpenDocumentLoading={openDocumentLoading}
                  onOpenDocumentFailed={() => setDocumentViewer(null)}
                />
              ))}
              {vehicles.length > 0 ? (
                <Text variant="caption" secondary style={styles.queueLabel}>
                  Araç ({vehicles.length})
                </Text>
              ) : null}
              {vehicles.map((item) => (
                <AdminRideVerifyCard
                  key={item.id}
                  kind="vehicle"
                  item={item}
                  onApprove={() => void runAction(item.id, () => adminVerifyRideVehicle(item.id, true))}
                  onReject={() => rejectVehicle(item.id)}
                  actionLoading={actionId === item.id}
                />
              ))}
            </>
          )}
        </>
      ) : null}
    </AdminShell>

    {documentViewer ? (
      <AdminIdentityDocumentViewer
        uri={documentViewer.uri}
        label={documentViewer.label}
        loading={documentViewer.loading}
        onClose={() => setDocumentViewer(null)}
      />
    ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  stats: { gap: spacing.xs, marginBottom: spacing.sm },
  queueLabel: { marginBottom: spacing.xs, marginTop: spacing.xs },
});
