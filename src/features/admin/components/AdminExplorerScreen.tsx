import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  adminHideExplorerPresence,
  fetchAdminExplorerPresence,
  type AdminExplorerPresenceRow,
} from '@/features/explorer/services/adminExplorer';
import { spacing } from '@/constants/theme';

export function AdminExplorerScreen() {
  const [rows, setRows] = useState<AdminExplorerPresenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setRows(await fetchAdminExplorerPresence());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hidePresence = (item: AdminExplorerPresenceRow) => {
    Alert.alert('Kaşif modunu gizle', `@${item.username} haritadan kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Gizle',
        style: 'destructive',
        onPress: async () => {
          setActionId(item.user_id);
          const { error } = await adminHideExplorerPresence(item.user_id);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Kaşif Modu"
      subtitle="Haritada anlık konum paylaşan kullanıcılar"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : rows.length === 0 ? (
        <AdminEmptyState title="Aktif kaşif yok" message="Şu an kaşif modunda kullanıcı bulunamadı." icon="compass-outline" />
      ) : (
        rows.map((item) => (
          <GlassCard key={item.user_id} style={styles.card}>
            <Text variant="label">@{item.username}</Text>
            <Text variant="caption" muted>
              {item.region_id} · {item.is_visible ? 'Görünür' : 'Gizli'} ·{' '}
              {new Date(item.updated_at).toLocaleString('tr-TR')}
            </Text>
            <View style={styles.actions}>
              <AdminActionChip
                label="Profil"
                icon="person-outline"
                onPress={() => router.push(`/admin/users/${item.user_id}` as Href)}
              />
              <AdminActionChip
                label={actionId === item.user_id ? '...' : 'Gizle'}
                icon="eye-off-outline"
                tone="danger"
                onPress={() => hidePresence(item)}
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
