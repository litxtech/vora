import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  fetchAdminLostItems,
  removeLostItem,
  type AdminLostItemRow,
} from '@/features/admin/services/lostItemManagement';
import { formatLostDate, lostCategoryLabel } from '@/features/lost-found/constants';
import { spacing } from '@/constants/theme';

export function AdminLostItemsScreen() {
  const [items, setItems] = useState<AdminLostItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchAdminLostItems());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRemove = (item: AdminLostItemRow) => {
    Alert.alert('İlanı kaldır', `"${item.title}" çözüldü olarak işaretlensin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          const { error } = await removeLostItem(item.id);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Kayıp Merkezi"
      subtitle="Kayıp ve buluntu ilanları moderasyonu"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="İlan yok" message="Yönetilecek kayıp/buluntu ilanı bulunamadı." icon="search-outline" />
      ) : (
        items.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">{item.title}</Text>
            <Text secondary variant="caption" numberOfLines={2}>
              {item.description}
            </Text>
            <Text secondary variant="caption">
              {formatLostDate(item.created_at)} · {item.region_id} · @{item.author_username}
            </Text>
            <Text secondary variant="caption">
              {item.item_type === 'lost' ? 'Kayıp' : 'Buluntu'} · {lostCategoryLabel(item.category)}
              {item.is_urgent ? ' · Acil' : ''}
            </Text>

            {item.status === 'open' ? (
              <AdminActionChip
                label="Kaldır"
                icon="trash-outline"
                tone="danger"
                onPress={() => handleRemove(item)}
              />
            ) : (
              <Text secondary variant="caption">
                Durum: {item.status === 'resolved' ? 'Çözüldü' : item.status}
              </Text>
            )}
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
});
