import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import {
  PREMIUM_SUPPORT_STATUS_LABELS,
} from '@/features/premium-support/constants';
import { adminListPremiumSupportThreads } from '@/features/premium-support/services/premiumSupportData';
import type { PremiumSupportStatus, PremiumSupportThread } from '@/features/premium-support/types';
import { PREMIUM_GOLD } from '@/features/profile/constants/premiumUi';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const STATUS_FILTERS: { id: PremiumSupportStatus | 'all' | 'unread'; label: string }[] = [
  { id: 'unread', label: 'Okunmamış' },
  { id: 'waiting_support', label: 'Yanıt bekleyen' },
  { id: 'waiting_user', label: 'Kullanıcı bekliyor' },
  { id: 'open', label: 'Açık' },
  { id: 'all', label: 'Tümü' },
];

export function AdminPremiumSupportScreen() {
  const { colors } = useTheme();
  const guard = useAdminGuard();
  const [threads, setThreads] = useState<PremiumSupportThread[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]['id']>('unread');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (guard.status !== 'allowed') return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const status = filter === 'unread' ? 'all' : filter;
      const rows = await adminListPremiumSupportThreads(status, 80);
      setThreads(
        filter === 'unread'
          ? rows.filter((row) => row.support_unread_count > 0)
          : rows,
      );
      setLoading(false);
      setRefreshing(false);
    },
    [filter, guard.status],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (guard.status === 'denied') return null;

  return (
    <AdminShell
      title="Premium Abonelik Desteği"
      subtitle="Canlı abonelik sohbetleri"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={STATUS_FILTERS} value={filter} onChange={setFilter} />

      {loading ? (
        <AdminEmptyState loading />
      ) : threads.length === 0 ? (
        <AdminEmptyState
          title="Sohbet yok"
          message="Seçili filtreye uygun premium destek sohbeti bulunamadı."
          icon="headset-outline"
        />
      ) : (
        threads.map((thread) => (
          <Pressable
            key={thread.id}
            onPress={() => router.push(`/admin/premium-support/${thread.id}` as never)}
          >
            <GlassCard style={styles.card}>
              <View style={styles.header}>
                <View style={styles.userRow}>
                  <Ionicons name="person-circle-outline" size={22} color={PREMIUM_GOLD} />
                  <View style={styles.userText}>
                    <Text variant="label">@{thread.username ?? 'kullanıcı'}</Text>
                    <Text secondary variant="caption">
                      {thread.full_name ?? 'İsim yok'}
                    </Text>
                  </View>
                </View>
                {thread.support_unread_count > 0 ? (
                  <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                    <Text variant="caption" style={styles.badgeText}>
                      {thread.support_unread_count}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text variant="body" numberOfLines={2}>
                {thread.last_message_preview ?? thread.subject}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  <Text variant="caption" style={{ color: PREMIUM_GOLD }}>
                    {PREMIUM_SUPPORT_STATUS_LABELS[thread.status]}
                  </Text>
                  {thread.session_expires_at && thread.status === 'waiting_support' ? (
                    <Text variant="caption" style={{ color: colors.warning }}>
                      Yanıt süresi {new Date(thread.session_expires_at).toLocaleTimeString('tr-TR')}
                    </Text>
                  ) : null}
                </View>
                <Text variant="caption" muted>
                  {thread.last_message_at
                    ? new Date(thread.last_message_at).toLocaleString('tr-TR')
                    : new Date(thread.created_at).toLocaleString('tr-TR')}
                </Text>
              </View>
            </GlassCard>
          </Pressable>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  userText: { flex: 1 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  metaLeft: { gap: 2, flex: 1 },
});
