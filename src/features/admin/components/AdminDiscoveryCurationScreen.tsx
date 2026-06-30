import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  DISCOVERY_TAB_OPTIONS,
  FEATURE_DURATION_OPTIONS,
  featureDiscoveryItem,
  formatFeaturedExpiry,
  listDiscoveryFeatured,
  unfeatureDiscoveryItem,
  type DiscoveryFeaturedRow,
} from '@/features/admin/services/discoveryCurationManagement';
import type { DiscoveryTab } from '@/features/discovery/types';
import { spacing } from '@/constants/theme';

const SCOPE_OPTIONS = [
  { id: 'region' as const, label: 'Bölge' },
  { id: 'karadeniz' as const, label: 'Karadeniz' },
];

export function AdminDiscoveryCurationScreen() {
  const [items, setItems] = useState<DiscoveryFeaturedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [tab, setTab] = useState<DiscoveryTab>('posts');
  const [scope, setScope] = useState<'region' | 'karadeniz'>('region');
  const [targetId, setTargetId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [priority, setPriority] = useState('10');

  const tabMeta = DISCOVERY_TAB_OPTIONS.find((t) => t.id === tab)!;

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await listDiscoveryFeatured());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleFeature = (days: number | null) => {
    const id = targetId.trim();
    if (!id) {
      Alert.alert('İçerik ID', 'Öne çıkarmak için hedef ID girin.');
      return;
    }
    Alert.alert('Keşfet\'e Ekle', `"${tabMeta.label}" sekmesinde öne çıkarılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Ekle',
        onPress: async () => {
          setActionId(id);
          const { error } = await featureDiscoveryItem({
            tab,
            targetType: tabMeta.targetType,
            targetId: id,
            regionId: regionId.trim() || undefined,
            scope,
            priority: Math.max(0, parseInt(priority, 10) || 0),
            days,
          });
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else {
            setTargetId('');
            await load(true);
          }
        },
      },
    ]);
  };

  const handleRemove = (item: DiscoveryFeaturedRow) => {
    Alert.alert('Kaldır', 'Keşfet öne çıkarması kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          setActionId(item.id);
          const { error } = await unfeatureDiscoveryItem(item.id);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Keşfet Kürasyonu"
      subtitle="Trend listelerinde öne çıkarılan içerikler"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <GlassCard style={styles.form}>
        <Text variant="label">Yeni öne çıkarma</Text>
        <AdminFilterChip
          options={DISCOVERY_TAB_OPTIONS.map((t) => ({ id: t.id, label: t.label }))}
          value={tab}
          onChange={setTab}
        />
        <AdminFilterChip options={SCOPE_OPTIONS} value={scope} onChange={setScope} />
        <AdminFormField label="Hedef ID" value={targetId} onChangeText={setTargetId} placeholder="UUID" />
        <AdminFormField
          label="Bölge (opsiyonel)"
          value={regionId}
          onChangeText={setRegionId}
          placeholder="trabzon — boş = tüm bölgeler"
        />
        <AdminFormField label="Öncelik" value={priority} onChangeText={setPriority} placeholder="10" />
        <View style={styles.chipRow}>
          {FEATURE_DURATION_OPTIONS.map((option) => (
            <AdminActionChip
              key={option.id}
              label={option.label}
              icon="compass-outline"
              tone="primary"
              loading={actionId === targetId.trim()}
              disabled={Boolean(actionId)}
              onPress={() => handleFeature(option.days)}
            />
          ))}
        </View>
      </GlassCard>

      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Öne çıkan yok" message="Henüz keşfet kürasyonu yapılmamış." icon="compass-outline" />
      ) : (
        items.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label" numberOfLines={2}>
              {item.target_label}
            </Text>
            <Text secondary variant="caption">
              {DISCOVERY_TAB_OPTIONS.find((t) => t.id === item.tab)?.label ?? item.tab} · {item.target_type} · öncelik{' '}
              {item.priority}
            </Text>
            <Text secondary variant="caption">
              {item.scope === 'karadeniz' ? 'Karadeniz' : item.region_id ?? 'Tüm bölgeler'} · Bitiş:{' '}
              {formatFeaturedExpiry(item.featured_until)}
            </Text>
            {item.featured_by_username ? (
              <Text secondary variant="caption">
                Ekleyen: @{item.featured_by_username}
              </Text>
            ) : null}
            <AdminActionChip
              label="Kaldır"
              icon="close-circle-outline"
              tone="danger"
              loading={actionId === item.id}
              disabled={Boolean(actionId)}
              onPress={() => handleRemove(item)}
            />
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm, marginBottom: spacing.md },
  row: { gap: spacing.sm, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
