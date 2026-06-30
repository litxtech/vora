import { useEffect, useState } from 'react';
import { Alert, Share, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { MODERATION_TARGET_LABELS } from '@/features/admin/constants';
import { fetchModerationLogs, moderationLogsToCsv } from '@/features/admin/services/logs';
import type { ModerationLogRow } from '@/features/admin/types';
import { spacing } from '@/constants/theme';

const ACTION_FILTERS = [
  { id: 'all' as const, label: 'Tüm işlemler' },
  { id: 'warn' as const, label: 'Uyarılar' },
  { id: 'hide' as const, label: 'Gizlemeler' },
  { id: 'remove' as const, label: 'Kaldırmalar' },
  { id: 'ban' as const, label: 'Yasaklamalar' },
];

const ACTION_LABELS: Record<string, string> = {
  warn: 'Uyarı verildi',
  hide: 'İçerik gizlendi',
  remove: 'İçerik kaldırıldı',
  ban: 'Kullanıcı yasaklandı',
};

export function AdminLogsScreen() {
  const [actionFilter, setActionFilter] = useState<'all' | string>('all');
  const [logs, setLogs] = useState<ModerationLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const { data } = await fetchModerationLogs(actionFilter === 'all' ? null : actionFilter);
    setLogs(data as ModerationLogRow[]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, [actionFilter]);

  const handleExport = async () => {
    if (logs.length === 0) return;
    try {
      await Share.share({ message: moderationLogsToCsv(logs), title: 'moderasyon-kayitlari.csv' });
    } catch {
      Alert.alert('Dışa aktarma', 'Paylaşım iptal edildi.');
    }
  };

  return (
    <AdminShell
      title="İşlem Kayıtları"
      subtitle="Moderasyon geçmişini filtreleyin ve dışa aktarın"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminSectionHeader title="İşlem türüne göre filtrele" />
      <AdminFilterChip options={ACTION_FILTERS} value={actionFilter} onChange={setActionFilter} />
      <Button title="Kayıtları dışa aktar" variant="secondary" onPress={handleExport} disabled={logs.length === 0} />

      {loading ? (
        <AdminEmptyState loading />
      ) : logs.length === 0 ? (
        <AdminEmptyState title="Kayıt yok" message="Seçili filtreye uygun işlem bulunamadı." icon="list-outline" />
      ) : (
        logs.map((log) => (
          <GlassCard key={log.id} style={styles.row}>
            <Text variant="label">{ACTION_LABELS[log.action] ?? log.action}</Text>
            <Text secondary variant="caption">
              İşlemi yapan: {log.moderator?.username ?? log.moderator_username ?? log.moderator_id} · Hedef:{' '}
              {MODERATION_TARGET_LABELS[log.target_type] ?? log.target_type}
            </Text>
            <Text variant="caption">Gerekçe: {log.reason}</Text>
            <Text secondary variant="caption">{new Date(log.created_at).toLocaleString('tr-TR')}</Text>
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing.xs } });
