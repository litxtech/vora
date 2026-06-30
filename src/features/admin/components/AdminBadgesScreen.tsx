import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { fetchAdminBadgeHolders, type AdminBadgeHolderRow } from '@/features/pioneer/services/adminBadges';
import { grantPioneer, revokePioneer } from '@/features/pioneer/services/adminPioneer';
import { grantPlatformCharm, revokePlatformCharm } from '@/features/platform-charm/services/adminCharm';
import { spacing } from '@/constants/theme';

const FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'pioneer', label: 'Öncü' },
  { id: 'platform_charm', label: 'Vora İkonu' },
];

export function AdminBadgesScreen() {
  const [filter, setFilter] = useState('all');
  const [rows, setRows] = useState<AdminBadgeHolderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setRows(await fetchAdminBadgeHolders(filter as 'all' | 'pioneer' | 'platform_charm'));
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePioneer = async (item: AdminBadgeHolderRow) => {
    setActionId(item.user_id);
    const { error } = item.is_pioneer
      ? await revokePioneer(item.user_id)
      : await grantPioneer(item.user_id);
    setActionId(null);
    if (error) Alert.alert('Hata', error);
    else await load(true);
  };

  const toggleCharm = async (item: AdminBadgeHolderRow) => {
    setActionId(item.user_id);
    const { error } = item.is_platform_charm
      ? await revokePlatformCharm(item.user_id)
      : await grantPlatformCharm(item.user_id);
    setActionId(null);
    if (error) Alert.alert('Hata', error);
    else await load(true);
  };

  return (
    <AdminShell
      title="Rozet Yönetimi"
      subtitle="Öncü ve Vora İkonu rozetleri — toplu görünüm"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={FILTERS} value={filter} onChange={setFilter} />

      {loading ? (
        <AdminEmptyState loading />
      ) : rows.length === 0 ? (
        <AdminEmptyState title="Rozet sahibi yok" message="Seçili filtreye uygun kullanıcı bulunamadı." icon="ribbon-outline" />
      ) : (
        rows.map((item) => (
          <GlassCard key={item.user_id} style={styles.card}>
            <Text variant="label">{item.full_name ?? `@${item.username}`}</Text>
            <Text variant="caption" muted>
              @{item.username}
              {item.is_pioneer ? ' · Öncü' : ''}
              {item.is_platform_charm ? ' · Vora İkonu' : ''}
            </Text>
            <View style={styles.actions}>
              <AdminActionChip
                label="Profil"
                icon="person-outline"
                onPress={() => router.push(`/admin/users/${item.user_id}` as Href)}
              />
              <AdminActionChip
                label={actionId === item.user_id ? '...' : item.is_pioneer ? 'Öncüyü kaldır' : 'Öncü ver'}
                icon="flag-outline"
                tone={item.is_pioneer ? 'danger' : 'success'}
                onPress={() => togglePioneer(item)}
              />
              <AdminActionChip
                label={actionId === item.user_id ? '...' : item.is_platform_charm ? 'İkonu kaldır' : 'İkon ver'}
                icon="sparkles-outline"
                tone={item.is_platform_charm ? 'danger' : 'success'}
                onPress={() => toggleCharm(item)}
              />
            </View>
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
