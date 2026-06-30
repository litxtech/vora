import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminPremiumSubscriptionCard } from '@/features/admin/components/premium/AdminPremiumSubscriptionCard';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import {
  fetchPremiumSubscriptions,
  setUserPremium,
  type PremiumSubscriptionRow,
} from '@/features/admin/services/premiumManagement';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Tab = 'overview' | 'subscriptions';
type SubscriptionFilter = 'all' | 'active' | 'expired' | 'apple' | 'stripe';

const TABS = [
  { id: 'overview' as const, label: 'Özet' },
  { id: 'subscriptions' as const, label: 'Abonelikler' },
];

const SUBSCRIPTION_FILTERS: { id: SubscriptionFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Aktif' },
  { id: 'expired', label: 'Süresi dolmuş' },
  { id: 'apple', label: 'Apple' },
  { id: 'stripe', label: 'Stripe' },
];

const PREMIUM_GOLD = '#FFB300';

function matchesFilter(item: PremiumSubscriptionRow, filter: SubscriptionFilter): boolean {
  if (filter === 'active') return item.status === 'active';
  if (filter === 'expired') return item.status === 'expired' || item.status === 'canceled' || item.status === 'cancelled';
  if (filter === 'apple') return item.payment_provider === 'apple';
  if (filter === 'stripe') return item.payment_provider === 'stripe';
  return true;
}

function matchesSearch(item: PremiumSubscriptionRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.username.toLowerCase().includes(q) ||
    (item.full_name?.toLowerCase().includes(q) ?? false) ||
    item.apple_original_transaction_id?.toLowerCase().includes(q) === true
  );
}

function InfoBanner() {
  const { colors } = useTheme();
  return (
    <GlassCard style={[styles.infoBanner, { borderColor: `${PREMIUM_GOLD}33` }]}>
      <View style={styles.infoRow}>
        <Ionicons name="diamond-outline" size={20} color={PREMIUM_GOLD} />
        <View style={styles.infoText}>
          <Text variant="label">Premiumlu hesap yönetimi</Text>
          <Text secondary variant="caption">
            Aktif abonelikleri inceleyin, kalan süreyi takip edin veya gerekirse premium erişimi anında iptal edin.
            Apple IAP abonelikleri App Store üzerinden yönetilir; buradan yalnızca platform erişimi kaldırılır.
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

export function AdminPremiumScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<PremiumSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [filter, setFilter] = useState<SubscriptionFilter>('all');
  const [search, setSearch] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchPremiumSubscriptions());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const active = items.filter((item) => item.status === 'active').length;
    const apple = items.filter((item) => item.payment_provider === 'apple').length;
    const stripe = items.filter((item) => item.payment_provider === 'stripe').length;
    const expired = items.filter(
      (item) => item.status === 'expired' || item.status === 'canceled' || item.status === 'cancelled',
    ).length;
    return { active, apple, stripe, expired, total: items.length };
  }, [items]);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter) && matchesSearch(item, search)),
    [items, filter, search],
  );

  const handleRevoke = (item: PremiumSubscriptionRow) => {
    Alert.alert(
      'Premium iptal',
      `@${item.username} kullanıcısının premium üyeliği hemen kaldırılsın mı?\n\nKullanıcı premium özelliklere erişimini kaybeder.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal et',
          style: 'destructive',
          onPress: async () => {
            setRevokingId(item.id);
            const { error } = await setUserPremium(item.user_id, false);
            setRevokingId(null);
            if (error) Alert.alert('Hata', error);
            else void load(true);
          },
        },
      ],
    );
  };

  const renderOverview = () => (
    <>
      <AdminSectionHeader title="Abonelik özeti" hint={`${stats.total} kayıt listeleniyor`} />
      <View style={styles.statsGrid}>
        <AdminStatCard label="Aktif premium" value={stats.active} icon="diamond" accent={PREMIUM_GOLD} />
        <AdminStatCard label="Apple IAP" value={stats.apple} icon="logo-apple" accent={colors.primary} />
        <AdminStatCard label="Stripe" value={stats.stripe} icon="card" accent={colors.accent} />
        <AdminStatCard label="Süresi dolmuş" value={stats.expired} icon="time-outline" accent={colors.warning} />
      </View>

      {stats.active > 0 ? (
        <>
          <AdminSectionHeader title="Aktif abonelikler" hint="Son kayıtlar" />
          {items
            .filter((item) => item.status === 'active')
            .slice(0, 5)
            .map((item) => (
              <AdminPremiumSubscriptionCard
                key={item.id}
                item={item}
                onRevoke={handleRevoke}
                revokeLoading={revokingId === item.id}
              />
            ))}
        </>
      ) : (
        <AdminEmptyState
          title="Aktif abonelik yok"
          message="Şu anda aktif premium aboneliği bulunmuyor."
          icon="diamond-outline"
        />
      )}
    </>
  );

  const renderSubscriptions = () => (
    <>
      <AdminSearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Kullanıcı adı, isim veya Apple TX ara..."
      />
      <AdminFilterChip options={SUBSCRIPTION_FILTERS} value={filter} onChange={setFilter} />

      {filteredItems.length === 0 ? (
        <AdminEmptyState
          title="Kayıt yok"
          message="Seçili filtreye uygun premium abonelik bulunamadı."
          icon="diamond-outline"
        />
      ) : (
        <>
          <AdminSectionHeader title="Premiumlu hesaplar" hint={`${filteredItems.length} kayıt`} />
          {filteredItems.map((item) => (
            <AdminPremiumSubscriptionCard
              key={item.id}
              item={item}
              onRevoke={handleRevoke}
              revokeLoading={revokingId === item.id}
            />
          ))}
        </>
      )}
    </>
  );

  return (
    <AdminShell
      title="Premiumlu Hesaplar"
      subtitle="Abonelik durumu, ödeme kanalı ve erişim yönetimi"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <InfoBanner />
      <AdminFilterChip options={TABS} value={tab} onChange={setTab} />

      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Abonelik yok" message="Premium abonelik bulunamadı." icon="diamond-outline" />
      ) : tab === 'overview' ? (
        renderOverview()
      ) : (
        renderSubscriptions()
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  statsGrid: { gap: spacing.xs },
  infoBanner: { gap: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, gap: 4 },
});
