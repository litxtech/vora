import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { AdminMarketplaceListingCard } from '@/features/admin/components/marketplace/AdminMarketplaceListingCard';
import { AdminMarketplaceOrderCard } from '@/features/admin/components/marketplace/AdminMarketplaceOrderCard';
import { AdminMarketplacePayoutCard } from '@/features/admin/components/marketplace/AdminMarketplacePayoutCard';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import { formatCents, MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import {
  adminHideListing,
  adminMarkPayout,
  adminPlatformApproveOrder,
  adminRefundMarketplaceOrder,
  adminVerifyPayoutProfile,
  fetchAdminMarketplaceListings,
  fetchAdminMarketplaceOrders,
  fetchAdminMarketplacePayoutProfiles,
  fetchAdminMarketplaceSummary,
  type AdminMarketplaceListingRow,
  type AdminMarketplaceOrderRow,
  type AdminMarketplacePayoutProfileRow,
} from '@/features/marketplace/services/adminMarketplace';
import { spacing } from '@/constants/theme';

type Tab = 'overview' | 'orders' | 'listings' | 'payouts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Özet' },
  { id: 'orders', label: 'Siparişler' },
  { id: 'listings', label: 'İlanlar' },
  { id: 'payouts', label: 'IBAN & Ödeme' },
];

const ORDER_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'approval', label: 'Onay bekleyen' },
  { id: 'payout_due', label: 'Ödeme yakın' },
  { id: 'overdue', label: 'Gecikmiş' },
  { id: 'escrow', label: 'Escrow' },
] as const;

const PAYOUT_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'pending', label: 'Doğrulama bekleyen' },
  { id: 'verified', label: 'Doğrulanmış' },
] as const;

type OrderFilter = (typeof ORDER_FILTERS)[number]['id'];
type PayoutFilter = (typeof PAYOUT_FILTERS)[number]['id'];

export function AdminMarketplaceScreen() {
  const guard = useAdminGuard();
  const [tab, setTab] = useState<Tab>('overview');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [payoutFilter, setPayoutFilter] = useState<PayoutFilter>('all');
  const [listingSearch, setListingSearch] = useState('');
  const [payoutSearch, setPayoutSearch] = useState('');
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchAdminMarketplaceSummary>>>(null);
  const [orders, setOrders] = useState<AdminMarketplaceOrderRow[]>([]);
  const [listings, setListings] = useState<AdminMarketplaceListingRow[]>([]);
  const [payoutProfiles, setPayoutProfiles] = useState<AdminMarketplacePayoutProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [payoutRef, setPayoutRef] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (guard.status !== 'allowed') return;
    setLoading(true);
    const [nextSummary, nextOrders, nextListings, nextPayouts] = await Promise.all([
      fetchAdminMarketplaceSummary(),
      fetchAdminMarketplaceOrders(orderFilter),
      fetchAdminMarketplaceListings(),
      fetchAdminMarketplacePayoutProfiles(),
    ]);
    setSummary(nextSummary);
    setOrders(nextOrders);
    setListings(nextListings);
    setPayoutProfiles(nextPayouts);
    setLoading(false);
  }, [guard.status, orderFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingPayoutCount = useMemo(
    () => payoutProfiles.filter((p) => !p.verified_at).length,
    [payoutProfiles],
  );

  const filteredListings = useMemo(() => {
    const q = listingSearch.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter(
      (l) => l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q),
    );
  }, [listings, listingSearch]);

  const filteredPayouts = useMemo(() => {
    let rows = payoutProfiles;
    if (payoutFilter === 'pending') rows = rows.filter((p) => !p.verified_at);
    if (payoutFilter === 'verified') rows = rows.filter((p) => p.verified_at);
    const q = payoutSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        p.account_holder.toLowerCase().includes(q) ||
        p.iban.toLowerCase().includes(q) ||
        (p.seller_name?.toLowerCase().includes(q) ?? false) ||
        (p.seller_username?.toLowerCase().includes(q) ?? false),
    );
  }, [payoutProfiles, payoutFilter, payoutSearch]);

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

  const approve = (orderId: string) => {
    Alert.alert('Platform onayı', 'Satıcı ödemesi 9 gün içinde planlanacak.', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: () => void runAction(orderId, () => adminPlatformApproveOrder(orderId)),
      },
    ]);
  };

  const markPaid = (orderId: string) => {
    const ref = payoutRef[orderId]?.trim();
    if (!ref) {
      Alert.alert('Referans gerekli', 'Banka transfer referansını girin.');
      return;
    }
    Alert.alert('Ödeme yapıldı', 'Satıcıya transfer tamamlandı olarak işaretlensin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: () => void runAction(orderId, () => adminMarkPayout(orderId, ref)),
      },
    ]);
  };

  const refundOrder = (orderId: string) => {
    Alert.alert('Stripe iadesi', 'Alıcıya tam iade başlatılsın mı?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'İade et',
        style: 'destructive',
        onPress: () => void runAction(orderId, () => adminRefundMarketplaceOrder(orderId)),
      },
    ]);
  };

  const hideListing = (listingId: string) => {
    Alert.alert('İlanı gizle', 'Bu ilan listeden kaldırılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Gizle',
        style: 'destructive',
        onPress: () => void runAction(listingId, () => adminHideListing(listingId)),
      },
    ]);
  };

  const verifyPayout = (userId: string) => {
    Alert.alert('IBAN doğrulama', 'Satıcının banka bilgileri doğrulansın mı?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Doğrula',
        onPress: () => void runAction(userId, () => adminVerifyPayoutProfile(userId)),
      },
    ]);
  };

  if (guard.status !== 'allowed') {
    return (
      <AdminShell title="Yerel Pazar" subtitle="Yetki gerekli">
        <Text secondary>Admin yetkisi yok.</Text>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Yerel Pazar"
      subtitle="Siparişler, escrow, komisyon ve satıcı ödemeleri"
      onRefresh={load}
      refreshing={loading}
    >
      <AdminFilterChip options={TABS} value={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <>
          {summary ? (
            <View style={styles.stats}>
              <AdminStatCard label="Aktif ilan" value={summary.activeListings} icon="storefront-outline" accent={MARKETPLACE_ACCENT} />
              <AdminStatCard
                label="Escrow"
                value={formatCents(summary.escrowTotalCents)}
                icon="lock-closed-outline"
                accent={MARKETPLACE_ACCENT}
              />
              <AdminStatCard
                label="Onay bekleyen"
                value={summary.awaitingPlatformApproval}
                icon="time-outline"
                accent={MARKETPLACE_ACCENT}
                onPress={
                  summary.awaitingPlatformApproval > 0
                    ? () => {
                        setOrderFilter('approval');
                        setTab('orders');
                      }
                    : undefined
                }
              />
              <AdminStatCard
                label="Bugün ödeme"
                value={summary.payoutDueToday}
                icon="calendar-outline"
                accent={MARKETPLACE_ACCENT}
                onPress={
                  summary.payoutDueToday > 0
                    ? () => {
                        setOrderFilter('payout_due');
                        setTab('orders');
                      }
                    : undefined
                }
              />
              <AdminStatCard
                label="Gecikmiş ödeme"
                value={summary.payoutOverdue}
                icon="alert-circle-outline"
                accent={MARKETPLACE_ACCENT}
                onPress={
                  summary.payoutOverdue > 0
                    ? () => {
                        setOrderFilter('overdue');
                        setTab('orders');
                      }
                    : undefined
                }
              />
              <AdminStatCard
                label="Toplam komisyon"
                value={`₺${summary.totalCommission.toLocaleString('tr-TR')}`}
                icon="cash-outline"
                accent={MARKETPLACE_ACCENT}
              />
              <AdminStatCard
                label="IBAN bekleyen"
                value={pendingPayoutCount}
                icon="card-outline"
                accent={MARKETPLACE_ACCENT}
                onPress={
                  pendingPayoutCount > 0
                    ? () => {
                        setPayoutFilter('pending');
                        setTab('payouts');
                      }
                    : undefined
                }
              />
            </View>
          ) : (
            <AdminEmptyState loading={loading} icon="storefront-outline" title="Özet yükleniyor" />
          )}
          <AdminSectionHeader
            title="Hızlı erişim"
            hint="Özet kartlarına dokunarak ilgili sekmeye geçebilirsiniz"
          />
        </>
      ) : null}

      {tab === 'orders' ? (
        <>
          <AdminSectionHeader title="Siparişler" hint="Escrow, platform onayı ve satıcı ödemeleri" />
          <AdminFilterChip options={[...ORDER_FILTERS]} value={orderFilter} onChange={setOrderFilter} />
          {orders.length === 0 ? (
            <AdminEmptyState
              loading={loading}
              icon="receipt-outline"
              title="Sipariş yok"
              message="Seçili filtreye uygun sipariş bulunamadı."
            />
          ) : (
            orders.map((order) => (
              <AdminMarketplaceOrderCard
                key={order.id}
                order={order}
                payoutRef={payoutRef[order.id] ?? ''}
                onPayoutRefChange={(v) => setPayoutRef((prev) => ({ ...prev, [order.id]: v }))}
                onApprove={() => approve(order.id)}
                onMarkPaid={() => markPaid(order.id)}
                onRefund={() => refundOrder(order.id)}
                actionLoading={actionId === order.id}
              />
            ))
          )}
        </>
      ) : null}

      {tab === 'listings' ? (
        <>
          <AdminSectionHeader title="İlan moderasyonu" hint="Aktif ilanları inceleyin veya gizleyin" />
          <AdminSearchInput value={listingSearch} onChangeText={setListingSearch} placeholder="İlan veya kategori ara..." />
          {filteredListings.length === 0 ? (
            <AdminEmptyState
              loading={loading}
              icon="pricetag-outline"
              title="İlan yok"
              message={listingSearch ? 'Arama kriterine uygun ilan bulunamadı.' : 'Listelenecek ilan bulunamadı.'}
            />
          ) : (
            filteredListings.map((listing) => (
              <AdminMarketplaceListingCard
                key={listing.id}
                listing={listing}
                onHide={() => hideListing(listing.id)}
                hideLoading={actionId === listing.id}
              />
            ))
          )}
        </>
      ) : null}

      {tab === 'payouts' ? (
        <>
          <AdminSectionHeader
            title="IBAN & ödeme profilleri"
            hint="Satıcı banka bilgilerini doğrulayın — IBAN'a dokunarak kopyalayın"
          />
          <AdminSearchInput
            value={payoutSearch}
            onChangeText={setPayoutSearch}
            placeholder="Satıcı adı veya IBAN ara..."
          />
          <AdminFilterChip options={[...PAYOUT_FILTERS]} value={payoutFilter} onChange={setPayoutFilter} />
          {filteredPayouts.length === 0 ? (
            <AdminEmptyState
              loading={loading}
              icon="card-outline"
              title="Profil yok"
              message={
                payoutSearch || payoutFilter !== 'all'
                  ? 'Filtreye uygun ödeme profili bulunamadı.'
                  : 'Henüz kayıtlı satıcı ödeme profili yok.'
              }
            />
          ) : (
            filteredPayouts.map((profile) => (
              <AdminMarketplacePayoutCard
                key={profile.user_id}
                profile={profile}
                onVerify={() => verifyPayout(profile.user_id)}
                verifyLoading={actionId === profile.user_id}
              />
            ))
          )}
        </>
      ) : null}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  stats: { gap: spacing.xs, marginBottom: spacing.sm },
});
