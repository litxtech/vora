import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { CONTRIBUTION_STATUS_LABELS } from '@/features/admin/constants';
import {
  contributionTierLabel,
  fetchAdminContributions,
  revokePlatformSupporter,
  type AdminContributionRow,
} from '@/features/platform-support/services/adminContributions';
import { formatCents } from '@/features/marketplace/constants';
import { spacing } from '@/constants/theme';

export function AdminPlatformContributionsScreen() {
  const [rows, setRows] = useState<AdminContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setRows(await fetchAdminContributions(100));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = (item: AdminContributionRow) => {
    Alert.alert('Destekçi rozetini kaldır', `@${item.username}`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          setActionId(item.user_id);
          const { error } = await revokePlatformSupporter(item.user_id);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Platform Katkıları"
      subtitle="Destek paketleri ve destekçi rozetleri"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : rows.length === 0 ? (
        <AdminEmptyState title="Katkı yok" message="Platform destek kaydı bulunamadı." icon="heart-outline" />
      ) : (
        rows.map((item) => (
          <GlassCard key={item.id} style={styles.card}>
            <Text variant="label">@{item.username}</Text>
            <Text variant="caption" muted>
              {contributionTierLabel(item.tier)} · {formatCents(item.amount_cents)} ·{' '}
              {CONTRIBUTION_STATUS_LABELS[item.status] ?? item.status}
            </Text>
            <Text variant="caption" secondary>
              {new Date(item.created_at).toLocaleString('tr-TR')}
            </Text>
            <View style={styles.actions}>
              <AdminActionChip
                label="Profil"
                icon="person-outline"
                onPress={() => router.push(`/admin/users/${item.user_id}` as Href)}
              />
              {item.status === 'completed' ? (
                <AdminActionChip
                  label={actionId === item.user_id ? '...' : 'Rozeti kaldır'}
                  icon="remove-circle-outline"
                  tone="danger"
                  onPress={() => revoke(item)}
                />
              ) : null}
            </View>
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
});
