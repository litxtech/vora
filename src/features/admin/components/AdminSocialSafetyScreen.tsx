import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  fetchUserBlocks,
  fetchUserMutes,
  removeUserBlock,
  removeUserMute,
  type UserBlockRow,
  type UserMuteRow,
} from '@/features/admin/services/phase3Management';
import { spacing } from '@/constants/theme';

type Tab = 'blocks' | 'mutes';

const TABS = [
  { id: 'blocks' as const, label: 'Engellemeler' },
  { id: 'mutes' as const, label: 'Sessize Alma' },
];

export function AdminSocialSafetyScreen() {
  const [tab, setTab] = useState<Tab>('blocks');
  const [blocks, setBlocks] = useState<UserBlockRow[]>([]);
  const [mutes, setMutes] = useState<UserMuteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    if (tab === 'blocks') setBlocks(await fetchUserBlocks());
    else setMutes(await fetchUserMutes());
    setLoading(false);
    setRefreshing(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRemoveBlock = (item: UserBlockRow) => {
    const key = `${item.blocker_id}-${item.blocked_id}`;
    Alert.alert('Engeli kaldır', `@${item.blocker_username} → @${item.blocked_username}`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        onPress: async () => {
          setActionId(key);
          const { error } = await removeUserBlock(item.blocker_id, item.blocked_id);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  const handleRemoveMute = (item: UserMuteRow) => {
    const key = `${item.muter_id}-${item.muted_id}`;
    Alert.alert('Sessizi kaldır', `@${item.muter_username} → @${item.muted_username}`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        onPress: async () => {
          setActionId(key);
          const { error } = await removeUserMute(item.muter_id, item.muted_id);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Engelleme & Sessize Alma"
      subtitle="Kullanıcı engel ve sessiz listeleri"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={TABS} value={tab} onChange={setTab} />
      {loading ? (
        <AdminEmptyState loading />
      ) : tab === 'blocks' ? (
        blocks.length === 0 ? (
          <AdminEmptyState title="Engel yok" message="Engelleme kaydı bulunamadı." icon="ban-outline" />
        ) : (
          blocks.map((item) => {
            const key = `${item.blocker_id}-${item.blocked_id}`;
            return (
              <GlassCard key={key} style={styles.row}>
                <Text variant="label">
                  @{item.blocker_username} → @{item.blocked_username}
                </Text>
                <Text secondary variant="caption">
                  {item.is_restricted ? 'Kısıtlı' : 'Engelli'} ·{' '}
                  {new Date(item.created_at).toLocaleString('tr-TR')}
                </Text>
                <AdminActionChip
                  label="Engeli kaldır"
                  icon="close-outline"
                  tone="warning"
                  loading={actionId === key}
                  disabled={Boolean(actionId)}
                  onPress={() => handleRemoveBlock(item)}
                />
              </GlassCard>
            );
          })
        )
      ) : mutes.length === 0 ? (
        <AdminEmptyState title="Sessiz yok" message="Sessize alma kaydı bulunamadı." icon="volume-mute-outline" />
      ) : (
        mutes.map((item) => {
          const key = `${item.muter_id}-${item.muted_id}`;
          return (
            <GlassCard key={key} style={styles.row}>
              <Text variant="label">
                @{item.muter_username} → @{item.muted_username}
              </Text>
              <Text secondary variant="caption">
                {new Date(item.created_at).toLocaleString('tr-TR')}
              </Text>
              <AdminActionChip
                label="Sessizi kaldır"
                icon="volume-high-outline"
                tone="warning"
                loading={actionId === key}
                disabled={Boolean(actionId)}
                onPress={() => handleRemoveMute(item)}
              />
            </GlassCard>
          );
        })
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing.sm } });
