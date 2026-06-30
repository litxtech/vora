import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import { CommerceOpsHero } from '@/features/commerce-ops/components/CommerceOpsHero';
import { CommerceOpsHotelCard } from '@/features/commerce-ops/components/CommerceOpsHotelCard';
import { CommerceOpsItemCard } from '@/features/commerce-ops/components/CommerceOpsItemCard';
import { CommerceOpsPersonnelTab } from '@/features/commerce-ops/components/CommerceOpsPersonnelTab';
import { CommerceOpsQuickStats } from '@/features/commerce-ops/components/CommerceOpsQuickStats';
import {
  COMMERCE_OPS_TABS,
  COMMERCE_QUEUE_FILTERS,
} from '@/features/commerce-ops/constants';
import {
  adminCancelHotelReservation,
  adminMarkHotelPayout,
  adminRefundHotelReservation,
  fetchAdminHotelReservations,
  fetchCommerceOpsSummary,
  fetchCommerceTransactions,
} from '@/features/commerce-ops/services/commerceOpsData';
import { commerceTabLabel, exportCommerceOpsPdf } from '@/features/commerce-ops/services/commerceOpsExport';
import type {
  CommerceOpsSummary,
  CommerceOpsTab,
  CommerceQueueFilter,
  CommerceTransactionRow,
} from '@/features/commerce-ops/types';
import {
  adminPlatformApproveOrder,
  adminRefundMarketplaceOrder,
} from '@/features/marketplace/services/adminMarketplace';
import { adminRefundRideReservation } from '@/features/rides/services/adminRides';
import { spacing } from '@/constants/theme';

export function CommerceOpsScreen() {
  const guard = useAdminGuard();
  const [tab, setTab] = useState<CommerceOpsTab>('overview');
  const [filter, setFilter] = useState<CommerceQueueFilter>('all');
  const [summary, setSummary] = useState<CommerceOpsSummary | null>(null);
  const [transactions, setTransactions] = useState<CommerceTransactionRow[]>([]);
  const [hotelRows, setHotelRows] = useState<Awaited<ReturnType<typeof fetchAdminHotelReservations>>>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const moduleFilter = useMemo((): 'all' | CommerceTransactionRow['module'] => {
    if (tab === 'hotel' || tab === 'personnel' || tab === 'overview') return 'all';
    if (tab === 'finance') return 'all';
    return tab;
  }, [tab]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (guard.status !== 'allowed') return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const txFilter = tab === 'overview' ? 'pending' : filter;
      const effectiveModule = tab === 'overview' ? 'all' : moduleFilter;

      const [nextSummary, nextTx, nextHotels] = await Promise.all([
        fetchCommerceOpsSummary(),
        fetchCommerceTransactions(effectiveModule, txFilter, tab === 'overview' ? 8 : 50),
        tab === 'hotel' || tab === 'overview'
          ? fetchAdminHotelReservations(tab === 'overview' ? 'pending' : filter)
          : Promise.resolve([]),
      ]);

      setSummary(nextSummary);
      setTransactions(nextTx);
      setHotelRows(nextHotels);
      setLoading(false);
      setRefreshing(false);
    },
    [guard.status, tab, filter, moduleFilter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (id: string, action: () => Promise<{ error: string | null; message?: string }>) => {
    setActionId(id);
    const result = await action();
    setActionId(null);
    if (result.error) Alert.alert('Hata', result.error);
    else if (result.message) Alert.alert('Tamam', result.message);
    await load(true);
  };

  const handleExport = async () => {
    setExporting(true);
    const allTx = await fetchCommerceTransactions('all', 'all', 100);
    const result = await exportCommerceOpsPdf(summary, allTx, commerceTabLabel(tab));
    setExporting(false);
    if (result.error) Alert.alert('PDF', result.error);
  };

  const renderTransactionActions = (item: CommerceTransactionRow) => {
    if (item.module === 'marketplace' && item.status === 'buyer_confirmed') {
      return {
        onApprove: () =>
          Alert.alert('Platform onayı', 'Satıcı ödemesi planlansın mı?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Onayla', onPress: () => void runAction(item.id, () => adminPlatformApproveOrder(item.id)) },
          ]),
        onRefund: () =>
          Alert.alert('İade', 'Alıcıya tam iade başlatılsın mı?', [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'İade', style: 'destructive', onPress: () => void runAction(item.id, () => adminRefundMarketplaceOrder(item.id)) },
          ]),
      };
    }
    if (item.module === 'rides' && ['held', 'released'].includes(item.paymentStatus ?? '')) {
      return {
        onRefund: () =>
          Alert.alert('İade', 'Yolcu rezervasyonu iade edilsin mi?', [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'İade', style: 'destructive', onPress: () => void runAction(item.id, () => adminRefundRideReservation(item.id)) },
          ]),
      };
    }
    if (item.module === 'hotel' && item.status === 'confirmed') {
      return {
        onCancel: () =>
          Alert.alert('İptal', 'Otel rezervasyonu iptal edilsin mi?', [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'İptal', style: 'destructive', onPress: () => void runAction(item.id, () => adminCancelHotelReservation(item.id)) },
          ]),
        onRefund: () =>
          Alert.alert('İade', 'Rezervasyon iade olarak işaretlensin mi?', [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'İade', style: 'destructive', onPress: () => void runAction(item.id, () => adminRefundHotelReservation(item.id)) },
          ]),
      };
    }
    return {};
  };

  if (guard.status !== 'allowed') {
    return (
      <AdminShell title="Operasyon Merkezi" subtitle="Yetki gerekli" requireAdmin>
        <Text secondary>Admin yetkisi gerekli.</Text>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Ekonomi Operasyon Merkezi"
      subtitle="Otel · Pazar · Yolculuk · Personel · Finans"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={COMMERCE_OPS_TABS} value={tab} onChange={setTab} />

      <View style={styles.toolbar}>
        <AdminActionChip
          label="PDF rapor"
          icon="document-outline"
          tone="primary"
          loading={exporting}
          onPress={() => void handleExport()}
        />
      </View>

      {loading && !refreshing ? (
        <AdminEmptyState loading />
      ) : (
        <>
          {tab === 'overview' && summary ? (
            <>
              <CommerceOpsHero summary={summary} />
              <CommerceOpsQuickStats summary={summary} />
              <AdminSectionHeader title="Acil kuyruk" hint="Onay veya müdahale gereken işlemler" />
              {transactions.length === 0 && hotelRows.length === 0 ? (
                <AdminEmptyState title="Kuyruk temiz" message="Bekleyen işlem yok." icon="checkmark-circle-outline" />
              ) : (
                <>
                  {hotelRows.slice(0, 4).map((row) => (
                    <CommerceOpsHotelCard
                      key={row.id}
                      reservation={row}
                      actionLoading={actionId === row.id}
                      onCancel={() =>
                        Alert.alert('İptal', 'Rezervasyon iptal edilsin mi?', [
                          { text: 'Vazgeç', style: 'cancel' },
                          { text: 'İptal', style: 'destructive', onPress: () => void runAction(row.id, () => adminCancelHotelReservation(row.id)) },
                        ])
                      }
                      onRefund={() =>
                        Alert.alert('İade', 'İade olarak işaretlensin mi?', [
                          { text: 'Vazgeç', style: 'cancel' },
                          { text: 'İade', style: 'destructive', onPress: () => void runAction(row.id, () => adminRefundHotelReservation(row.id)) },
                        ])
                      }
                    />
                  ))}
                  {transactions.map((item) => (
                    <CommerceOpsItemCard
                      key={`${item.module}-${item.id}`}
                      item={item}
                      actionLoading={actionId === item.id}
                      {...renderTransactionActions(item)}
                    />
                  ))}
                </>
              )}
            </>
          ) : null}

          {tab === 'hotel' ? (
            <>
              <AdminFilterChip options={COMMERCE_QUEUE_FILTERS} value={filter} onChange={setFilter} />
              {hotelRows.length === 0 ? (
                <AdminEmptyState title="Rezervasyon yok" icon="bed-outline" />
              ) : (
                hotelRows.map((row) => (
                  <CommerceOpsHotelCard
                    key={row.id}
                    reservation={row}
                    actionLoading={actionId === row.id}
                    onCancel={() =>
                      Alert.alert('İptal', 'Rezervasyon iptal edilsin mi?', [
                        { text: 'Vazgeç', style: 'cancel' },
                        { text: 'İptal', style: 'destructive', onPress: () => void runAction(row.id, () => adminCancelHotelReservation(row.id)) },
                      ])
                    }
                    onRefund={() =>
                      Alert.alert('İade', 'İade olarak işaretlensin mi?', [
                        { text: 'Vazgeç', style: 'cancel' },
                        { text: 'İade', style: 'destructive', onPress: () => void runAction(row.id, () => adminRefundHotelReservation(row.id)) },
                      ])
                    }
                    onPayout={() =>
                      Alert.alert('Sahip ödemesi', 'Otel sahibine net tutar yatırıldı olarak işaretlensin mi?', [
                        { text: 'Vazgeç', style: 'cancel' },
                        {
                          text: 'Ödendi',
                          onPress: () => void runAction(row.id, () => adminMarkHotelPayout(row.id)),
                        },
                      ])
                    }
                  />
                ))
              )}
            </>
          ) : null}

          {tab === 'marketplace' || tab === 'rides' || tab === 'finance' ? (
            <>
              <AdminFilterChip options={COMMERCE_QUEUE_FILTERS} value={filter} onChange={setFilter} />
              {transactions.length === 0 ? (
                <AdminEmptyState title="İşlem yok" icon="receipt-outline" />
              ) : (
                transactions.map((item) => (
                  <CommerceOpsItemCard
                    key={`${item.module}-${item.id}`}
                    item={item}
                    actionLoading={actionId === item.id}
                    {...renderTransactionActions(item)}
                  />
                ))
              )}
            </>
          ) : null}

          {tab === 'personnel' ? <CommerceOpsPersonnelTab /> : null}
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.xs },
});
