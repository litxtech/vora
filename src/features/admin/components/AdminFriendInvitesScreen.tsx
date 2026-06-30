import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import {
  fetchAdminFriendInviteRedemptions,
  fetchAdminFriendInviteStats,
  type AdminFriendInviteRedemptionRow,
  type AdminFriendInviteStats,
} from '@/features/profile/services/adminFriendInvites';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AdminFriendInvitesScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<AdminFriendInviteStats | null>(null);
  const [rows, setRows] = useState<AdminFriendInviteRedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [nextStats, nextRows] = await Promise.all([
      fetchAdminFriendInviteStats(),
      fetchAdminFriendInviteRedemptions(),
    ]);

    setStats(nextStats);
    setRows(nextRows);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      title="Arkadaş Daveti"
      subtitle="Referral kodları ve kullanım kayıtları"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : (
        <>
          {stats ? (
            <View style={styles.stats}>
              <AdminStatCard label="Toplam kullanım" value={String(stats.total_redemptions)} icon="people-outline" />
              <AdminStatCard label="Bugün" value={String(stats.redemptions_today)} icon="today-outline" accent={colors.success} />
              <AdminStatCard label="Bu hafta" value={String(stats.redemptions_week)} icon="calendar-outline" accent={colors.primary} />
            </View>
          ) : null}

          {rows.length === 0 ? (
            <AdminEmptyState title="Kayıt yok" message="Henüz davet kodu kullanımı yok." icon="gift-outline" />
          ) : (
            rows.map((item) => (
              <GlassCard key={item.id} style={styles.card}>
                <Text variant="label">{item.invite_code}</Text>
                <Text variant="caption" muted>
                  @{item.inviter_username} → @{item.invitee_username}
                </Text>
                <Text variant="caption" secondary>
                  {new Date(item.created_at).toLocaleString('tr-TR')}
                </Text>
                <View style={styles.actions}>
                  <AdminActionChip
                    label="Davet eden"
                    icon="person-outline"
                    onPress={() => router.push(`/admin/users/${item.inviter_id}` as Href)}
                  />
                  <AdminActionChip
                    label="Davetli"
                    icon="person-add-outline"
                    onPress={() => router.push(`/admin/users/${item.invitee_id}` as Href)}
                  />
                </View>
              </GlassCard>
            ))
          )}
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  stats: { gap: spacing.xs, marginBottom: spacing.md },
  card: { gap: spacing.xs, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
});
