import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  fetchPostVerifications,
  setPostVerificationStatus,
  type PostVerificationRow,
} from '@/features/admin/services/verificationManagement';
import { spacing } from '@/constants/theme';

const STATUS_FILTERS = [
  { id: 'all' as const, label: 'Tümü' },
  { id: 'reviewing' as const, label: 'İncelemede' },
  { id: 'verified' as const, label: 'Doğrulandı' },
  { id: 'misinfo' as const, label: 'Sahte Haber' },
];

export function AdminVerificationCenterScreen() {
  const [filter, setFilter] = useState<'all' | 'reviewing' | 'verified' | 'misinfo'>('reviewing');
  const [items, setItems] = useState<PostVerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchPostVerifications(filter === 'all' ? undefined : filter));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleStatus = (item: PostVerificationRow, status: 'verified' | 'misinfo') => {
    Alert.alert('Durum güncelle', `Gönderi ${status === 'verified' ? 'doğrulandı' : 'sahte haber'} olarak işaretlensin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await setPostVerificationStatus(item.id, status);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell title="Doğrulama Merkezi" subtitle="Topluluk oylama denetimi" refreshing={refreshing} onRefresh={() => load(true)}>
      <AdminFilterChip options={STATUS_FILTERS} value={filter} onChange={setFilter} />
      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Kayıt yok" message="Doğrulama kaydı bulunamadı." icon="shield-outline" />
      ) : (
        items.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">Gönderi · {item.region_id}</Text>
            <Text secondary variant="caption">
              ✓ {item.verified_votes} · ✗ {item.misinfo_votes} · ? {item.reviewing_votes}
            </Text>
            <Text secondary variant="caption">Durum: {item.status}</Text>
            {item.status === 'reviewing' ? (
              <>
                <AdminActionChip label="Doğrula" icon="checkmark" tone="success" onPress={() => handleStatus(item, 'verified')} />
                <AdminActionChip label="Sahte Haber" icon="warning" tone="danger" onPress={() => handleStatus(item, 'misinfo')} />
              </>
            ) : null}
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing.sm } });
