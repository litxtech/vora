import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  fetchAdminChannels,
  suspendChannel,
  verifyChannel,
  type ChannelAdminRow,
} from '@/features/admin/services/socialManagement';
import { spacing } from '@/constants/theme';
import { useAdminGuard, isAdminGuard } from '@/features/admin/hooks/useAdminGuard';

export function AdminChannelsScreen() {
  const guard = useAdminGuard();
  const [items, setItems] = useState<ChannelAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchAdminChannels());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleVerify = (item: ChannelAdminRow) => {
    if (!isAdminGuard(guard)) return;
    Alert.alert('Doğrula', `"${item.name}" kanalı doğrulansın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await verifyChannel(item.id, !item.is_verified);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  const handleSuspend = (item: ChannelAdminRow) => {
    const suspend = !item.is_suspended;
    Alert.alert(suspend ? 'Askıya al' : 'Askıdan çıkar', `"${item.name}"`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        style: suspend ? 'destructive' : 'default',
        onPress: async () => {
          const { error } = await suspendChannel(item.id, suspend);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell title="Kanallar" subtitle="Kanal doğrulama ve moderasyon" refreshing={refreshing} onRefresh={() => load(true)}>
      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Kanal yok" message="Kanal bulunamadı." icon="radio-outline" />
      ) : (
        items.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">{item.name}</Text>
            <Text secondary variant="caption">@{item.owner_username} · {item.subscriber_count} abone · {item.channel_type}</Text>
            <Text secondary variant="caption">{item.is_verified ? '✓ Doğrulanmış' : 'Doğrulanmamış'}{item.is_suspended ? ' · Askıda' : ''}</Text>
            {isAdminGuard(guard) ? (
              <AdminActionChip label={item.is_verified ? 'Doğrulamayı kaldır' : 'Doğrula'} icon="checkmark-circle" tone="primary" onPress={() => handleVerify(item)} />
            ) : null}
            <AdminActionChip label={item.is_suspended ? 'Askıdan çıkar' : 'Askıya al'} icon="pause-outline" tone="danger" onPress={() => handleSuspend(item)} />
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing.sm } });
