import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  adminCancelBusinessShopBoost,
  adminSetBusinessShopPublished,
  fetchAdminBusinessShopBoosts,
  fetchAdminBusinessShops,
  type AdminBusinessShopBoostRow,
  type AdminBusinessShopRow,
} from '@/features/business-center/services/adminBusinessShop';
import { formatCents } from '@/features/marketplace/constants';
import { spacing } from '@/constants/theme';

type Tab = 'shops' | 'boosts';

const TABS = [
  { id: 'shops' as const, label: 'Mağazalar' },
  { id: 'boosts' as const, label: 'Öne çıkarmalar' },
];

const SHOP_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'published', label: 'Yayında' },
  { id: 'unpublished', label: 'Kapalı' },
  { id: 'commerce', label: 'Ticaret aktif' },
];

export function AdminBusinessShopScreen() {
  const [tab, setTab] = useState<Tab>('shops');
  const [shopFilter, setShopFilter] = useState('all');
  const [shops, setShops] = useState<AdminBusinessShopRow[]>([]);
  const [boosts, setBoosts] = useState<AdminBusinessShopBoostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    if (tab === 'shops') {
      setShops(await fetchAdminBusinessShops(shopFilter));
    } else {
      setBoosts(await fetchAdminBusinessShopBoosts());
    }

    setLoading(false);
    setRefreshing(false);
  }, [tab, shopFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePublish = (item: AdminBusinessShopRow) => {
    const next = !item.shop_published;
    Alert.alert(next ? 'Mağazayı yayınla' : 'Mağazayı kapat', item.name, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          setActionId(item.id);
          const { error } = await adminSetBusinessShopPublished(item.id, next);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  const cancelBoost = (item: AdminBusinessShopBoostRow) => {
    Alert.alert('Boost iptal', `${item.business_name} — ${item.package_tier}`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: async () => {
          setActionId(item.id);
          const { error } = await adminCancelBusinessShopBoost(item.id);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="İşletme Mağazaları"
      subtitle="Mağaza vitrini, yayın durumu ve boost paketleri"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={TABS} value={tab} onChange={setTab} />
      {tab === 'shops' ? (
        <AdminFilterChip options={SHOP_FILTERS} value={shopFilter} onChange={setShopFilter} />
      ) : null}

      {loading ? (
        <AdminEmptyState loading />
      ) : tab === 'shops' ? (
        shops.length === 0 ? (
          <AdminEmptyState title="Mağaza yok" message="Filtreye uygun işletme mağazası bulunamadı." icon="storefront-outline" />
        ) : (
          shops.map((item) => (
            <GlassCard key={item.id} style={styles.card}>
              <Text variant="label">{item.name}</Text>
              <Text variant="caption" muted>
                @{item.owner_username} · {item.commerce_mode} · {item.shop_published ? 'Yayında' : 'Kapalı'}
              </Text>
              {item.shop_tagline ? (
                <Text variant="caption" secondary>
                  {item.shop_tagline}
                </Text>
              ) : null}
              <Text variant="caption" muted>
                {item.view_count} görüntülenme · {item.active_boosts} aktif boost
              </Text>
              <View style={styles.actions}>
                <AdminActionChip
                  label={actionId === item.id ? '...' : item.shop_published ? 'Kapat' : 'Yayınla'}
                  icon={item.shop_published ? 'eye-off-outline' : 'eye-outline'}
                  tone={item.shop_published ? 'danger' : 'success'}
                  onPress={() => togglePublish(item)}
                />
              </View>
            </GlassCard>
          ))
        )
      ) : boosts.length === 0 ? (
        <AdminEmptyState title="Boost yok" message="Öne çıkarma paketi kaydı bulunamadı." icon="rocket-outline" />
      ) : (
        boosts.map((item) => (
          <GlassCard key={item.id} style={styles.card}>
            <Text variant="label">{item.business_name}</Text>
            <Text variant="caption" muted>
              @{item.owner_username} · {item.package_tier} · {item.status}
            </Text>
            <Text variant="caption" secondary>
              {formatCents(item.price_cents)} · {item.impressions} gösterim · {item.shop_views} mağaza görüntüleme
            </Text>
            {item.status === 'active' || item.status === 'pending' ? (
              <View style={styles.actions}>
                <AdminActionChip
                  label={actionId === item.id ? '...' : 'İptal et'}
                  icon="close-circle-outline"
                  tone="danger"
                  onPress={() => cancelBoost(item)}
                />
              </View>
            ) : null}
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
});
