import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  fetchContentTrustRecords,
  setContentTrustStatus,
  type ContentTrustRow,
} from '@/features/admin/services/vctsManagement';
import { spacing } from '@/constants/theme';

const STATUS_FILTERS = [
  { id: 'all' as const, label: 'Tümü' },
  { id: 'disputed' as const, label: 'İtirazlı' },
  { id: 'tampered' as const, label: 'Değiştirilmiş' },
  { id: 'verified' as const, label: 'Doğrulanmış' },
];

const STATUS_LABELS: Record<string, string> = {
  verified: 'Doğrulanmış',
  disputed: 'İtirazlı',
  tampered: 'Değiştirilmiş',
  pending: 'Bekliyor',
};

export function AdminVctsScreen() {
  const [filter, setFilter] = useState<'all' | 'disputed' | 'tampered' | 'verified'>('disputed');
  const [items, setItems] = useState<ContentTrustRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const all = await fetchContentTrustRecords();
    setItems(filter === 'all' ? all : all.filter((r) => r.status === filter));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleStatus = (item: ContentTrustRow, status: 'verified' | 'tampered') => {
    Alert.alert('VCTS güncelle', `${item.trust_code} → ${STATUS_LABELS[status]}`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await setContentTrustStatus(item.id, status);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell title="VCTS" subtitle="VORA içerik güven sistemi" refreshing={refreshing} onRefresh={() => load(true)}>
      <AdminFilterChip options={STATUS_FILTERS} value={filter} onChange={setFilter} />
      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Kayıt yok" message="VCTS kaydı bulunamadı." icon="finger-print-outline" />
      ) : (
        items.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">{item.trust_code}</Text>
            <Text secondary variant="caption">{item.publisher_key} · {item.content_type}</Text>
            <Text secondary variant="caption">Durum: {STATUS_LABELS[item.status] ?? item.status}</Text>
            {item.status === 'disputed' || item.status === 'pending' ? (
              <>
                <AdminActionChip label="Doğrula" icon="checkmark" tone="success" onPress={() => handleStatus(item, 'verified')} />
                <AdminActionChip label="Değiştirilmiş" icon="warning" tone="danger" onPress={() => handleStatus(item, 'tampered')} />
              </>
            ) : null}
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing.sm } });
