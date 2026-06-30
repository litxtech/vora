import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { fetchAppeals, resolveAppeal, type AppealRow } from '@/features/admin/services/appealsManagement';
import { spacing } from '@/constants/theme';

const STATUS_FILTERS = [
  { id: 'pending' as const, label: 'Bekleyen' },
  { id: 'reviewing' as const, label: 'İnceleniyor' },
  { id: 'approved' as const, label: 'Onaylı' },
  { id: 'rejected' as const, label: 'Reddedilen' },
];

const TYPE_LABELS: Record<string, string> = {
  ban: 'Ban itirazı',
  content_removal: 'İçerik kaldırma',
  account_suspension: 'Hesap askısı',
  other: 'Diğer',
};

export function AdminAppealsScreen() {
  const [status, setStatus] = useState<'pending' | 'reviewing' | 'approved' | 'rejected'>('pending');
  const [items, setItems] = useState<AppealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchAppeals(status));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [status]);

  const handleResolve = (item: AppealRow, approved: boolean) => {
    Alert.alert(approved ? 'İtirazı kabul et' : 'İtirazı reddet', `@${item.username}`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await resolveAppeal(item.id, approved ? 'approved' : 'rejected', undefined, approved && item.appeal_type === 'ban');
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell title="İtirazlar" subtitle="Ban ve moderasyon itiraz kuyruğu" refreshing={refreshing} onRefresh={() => load(true)}>
      <AdminFilterChip options={STATUS_FILTERS} value={status} onChange={setStatus} />
      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="İtiraz yok" message="Bu filtrede itiraz bulunamadı." icon="hand-left-outline" />
      ) : (
        items.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">@{item.username}</Text>
            <Text secondary variant="caption">{TYPE_LABELS[item.appeal_type] ?? item.appeal_type}</Text>
            <Text secondary variant="caption" numberOfLines={3}>{item.reason}</Text>
            {status === 'pending' ? (
              <>
                <AdminActionChip label="Kabul et" icon="checkmark" tone="success" onPress={() => handleResolve(item, true)} />
                <AdminActionChip label="Reddet" icon="close" tone="danger" onPress={() => handleResolve(item, false)} />
              </>
            ) : null}
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing.sm } });
