import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { fetchAiModerationQueue, resolveAiModeration, type AiModerationRow } from '@/features/admin/services/phase2Management';
import { spacing } from '@/constants/theme';

export function AdminAiModerationScreen() {
  const [items, setItems] = useState<AiModerationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchAiModerationQueue());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const handleResolve = (item: AiModerationRow, action: 'allowed' | 'blocked') => {
    Alert.alert(action === 'allowed' ? 'İzin ver' : 'Engelle', item.text_sample?.slice(0, 80) ?? 'İçerik', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await resolveAiModeration(item.id, action);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell title="AI Moderasyon" subtitle="İnceleme bekleyen içerikler" refreshing={refreshing} onRefresh={() => load(true)}>
      {loading ? <AdminEmptyState loading /> : items.length === 0 ? (
        <AdminEmptyState title="Kuyruk boş" message="AI incelemesi bekleyen içerik yok." icon="sparkles-outline" />
      ) : items.map((item) => (
        <GlassCard key={item.id} style={styles.row}>
          <Text variant="label">{item.target_type ?? 'metin'} · {item.provider}</Text>
          <Text secondary variant="caption">@{item.username ?? '—'} · Skor: {item.score ?? '—'}</Text>
          {item.text_sample ? <Text secondary variant="caption" numberOfLines={3}>{item.text_sample}</Text> : null}
          <AdminActionChip label="İzin ver" icon="checkmark" tone="success" onPress={() => handleResolve(item, 'allowed')} />
          <AdminActionChip label="Engelle" icon="close-circle" tone="danger" onPress={() => handleResolve(item, 'blocked')} />
        </GlassCard>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing.sm } });
