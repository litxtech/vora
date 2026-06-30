import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { fetchHashtags, setHashtagFlags, type HashtagRow } from '@/features/admin/services/phase2Management';
import { spacing } from '@/constants/theme';

const PAGE_SIZE = 30;

export function AdminHashtagsScreen() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<HashtagRow[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false, nextOffset = 0, append = false) => {
      if (isRefresh) setRefreshing(true);
      else if (!append) setLoading(true);

      const rows = await fetchHashtags(search, PAGE_SIZE, nextOffset);
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

  return (
    <AdminShell
      title="Etiket Yönetimi"
      subtitle="Popüler etiketleri öne çıkarın veya gizleyin"
      refreshing={refreshing}
      onRefresh={() => load(true, 0, false)}
    >
      <AdminSearchInput value={search} onChangeText={setSearch} placeholder="Etiket adı ara..." />

      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Sonuç yok" message="Aradığınız etiket bulunamadı." icon="pricetag-outline" />
      ) : (
        <>
          {items.map((item) => (
            <GlassCard key={item.id} style={styles.row}>
              <Text variant="label">#{item.tag}</Text>
              <Text secondary variant="caption">
                {item.post_count} gönderi{item.is_featured ? ' · Öne çıkan' : ''}
                {item.is_hidden ? ' · Gizli' : ''}
              </Text>
              <AdminActionChip
                label={item.is_featured ? 'Öne çıkarmayı kaldır' : 'Öne çıkar'}
                icon="star"
                tone="primary"
                onPress={() => setHashtagFlags(item.id, undefined, !item.is_featured).then(() => load(true, 0, false))}
              />
              <AdminActionChip
                label={item.is_hidden ? 'Göster' : 'Gizle'}
                icon="eye-off"
                tone="warning"
                onPress={() => setHashtagFlags(item.id, !item.is_hidden).then(() => load(true, 0, false))}
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
