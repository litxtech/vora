import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  fetchReporterApplications,
  reviewReporterApplication,
  type ReporterApplicationRow,
} from '@/features/admin/services/reporterManagement';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

const STATUS_FILTERS = [
  { id: 'pending' as const, label: 'Bekleyen' },
  { id: 'approved' as const, label: 'Onaylı' },
  { id: 'rejected' as const, label: 'Reddedilen' },
];

export function AdminReporterScreen() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [items, setItems] = useState<ReporterApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchReporterApplications(status));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [status]);

  const handleReview = (item: ReporterApplicationRow, approve: boolean) => {
    if (!user) return;
    Alert.alert(approve ? 'Onayla' : 'Reddet', `@${item.username} muhabir başvurusu`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: approve ? 'Onayla' : 'Reddet',
        style: approve ? 'default' : 'destructive',
        onPress: async () => {
          const { error } = await reviewReporterApplication(item.id, user.id, approve);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell title="Muhabir Başvuruları" subtitle="Muhabir programı onay kuyruğu" refreshing={refreshing} onRefresh={() => load(true)}>
      <AdminFilterChip options={STATUS_FILTERS} value={status} onChange={setStatus} />
      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Başvuru yok" message="Bu filtrede başvuru bulunamadı." icon="newspaper-outline" />
      ) : (
        items.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">@{item.username}</Text>
            <Text secondary variant="caption">{item.full_name ?? '—'} · {item.region_id ?? '—'}</Text>
            <Text secondary variant="caption" numberOfLines={3}>{item.motivation}</Text>
            {item.experience ? <Text secondary variant="caption" numberOfLines={2}>Deneyim: {item.experience}</Text> : null}
            {status === 'pending' ? (
              <AdminActionChip label="Onayla" icon="checkmark-circle-outline" tone="success" onPress={() => handleReview(item, true)} />
            ) : null}
            {status === 'pending' ? (
              <AdminActionChip label="Reddet" icon="close-circle-outline" tone="danger" onPress={() => handleReview(item, false)} />
            ) : null}
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing.sm } });
