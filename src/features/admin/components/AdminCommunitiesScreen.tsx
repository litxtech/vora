import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  fetchAdminCommunities,
  suspendCommunity,
  type CommunityAdminRow,
} from '@/features/admin/services/socialManagement';
import { spacing } from '@/constants/theme';

const PAGE_SIZE = 30;

export function AdminCommunitiesScreen() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<CommunityAdminRow[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const load = useCallback(
    async (isRefresh = false, nextOffset = 0, append = false) => {
      if (isRefresh) setRefreshing(true);
      else if (!append) setLoading(true);

      const rows = await fetchAdminCommunities(search, PAGE_SIZE, nextOffset);
      setItems((prev) => (append ? [...prev, ...rows] : rows));
      setOffset(nextOffset + rows.length);
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
      setRefreshing(false);
    },
    [search],
  );

  useEffect(() => {
    void load(false, 0, false);
  }, [load]);

  const handleSuspend = (item: CommunityAdminRow) => {
    const suspend = !item.is_suspended;
    if (suspend && !suspendReason.trim()) {
      Alert.alert('Gerekçe gerekli', 'Askıya alma nedeni yazın.');
      return;
    }

    Alert.alert(suspend ? 'Askıya al' : 'Askıdan çıkar', `"${item.name}" topluluğu`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        style: suspend ? 'destructive' : 'default',
        onPress: async () => {
          const { error } = await suspendCommunity(item.id, suspend, suspend ? suspendReason.trim() : undefined);
          if (error) Alert.alert('Hata', error);
          else {
            if (suspend) setSuspendReason('');
            void load(true, 0, false);
          }
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Topluluklar"
      subtitle="Platform topluluk moderasyonu"
      refreshing={refreshing}
      onRefresh={() => load(true, 0, false)}
    >
      <AdminSearchInput value={search} onChangeText={setSearch} placeholder="Topluluk veya sahip ara..." />
      <AdminFormField
        placeholder="Askıya alma gerekçesi (zorunlu)"
        value={suspendReason}
        onChangeText={setSuspendReason}
      />

      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Topluluk yok" message="Arama kriterine uygun topluluk bulunamadı." icon="people-circle-outline" />
      ) : (
        <>
          {items.map((item) => (
            <GlassCard key={item.id} style={styles.row}>
              <Text variant="label">{item.name}</Text>
              <Text secondary variant="caption">
                @{item.owner_username} · {item.member_count} üye · {item.post_count} gönderi
              </Text>
              <Text secondary variant="caption">
                {item.category} · {item.region_id ?? '—'}
              </Text>
              {item.is_suspended ? <Text variant="caption" style={{ color: '#e74c3c' }}>Askıda</Text> : null}
              <AdminActionChip
                label={item.is_suspended ? 'Askıdan çıkar' : 'Askıya al'}
                icon={item.is_suspended ? 'play-outline' : 'pause-outline'}
                tone={item.is_suspended ? 'success' : 'danger'}
                onPress={() => handleSuspend(item)}
              />
            </GlassCard>
          ))}
          {hasMore ? (
            <Button title="Daha fazla yükle" variant="secondary" onPress={() => load(false, offset, true)} />
          ) : null}
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing.sm } });
