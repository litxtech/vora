import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import {
  ADMIN_REFERRAL_FINANCE_ROUTE,
  ADMIN_REFERRAL_SETTINGS_ROUTE,
  REFERRAL_STATUS_COLORS,
  REFERRAL_STATUS_LABELS,
  adminReferralDetailPath,
  formatReferralCents,
} from '@/features/referral-earnings/constants';
import {
  fetchReferralAdminDashboard,
  fetchReferralAdminList,
} from '@/features/referral-earnings/services/referralAdmin';
import type { ReferralAdminDashboard, ReferralAdminListRow } from '@/features/referral-earnings/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const STATUS_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'pending', label: 'Beklemede' },
  { id: 'in_progress', label: 'Devam' },
  { id: 'reviewing', label: 'İnceleme' },
  { id: 'earned', label: 'Hak Edildi' },
  { id: 'approved', label: 'Onaylı' },
  { id: 'paid', label: 'Ödendi' },
  { id: 'rejected', label: 'Red' },
  { id: 'cancelled', label: 'İptal' },
];

export function AdminReferralEarningsScreen() {
  const guard = useAdminGuard();
  const { colors } = useTheme();
  const [stats, setStats] = useState<ReferralAdminDashboard | null>(null);
  const [rows, setRows] = useState<ReferralAdminListRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (guard.status !== 'allowed') return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [nextStats, nextRows] = await Promise.all([
      fetchReferralAdminDashboard(),
      fetchReferralAdminList(statusFilter === 'all' ? null : statusFilter),
    ]);
    setStats(nextStats);
    setRows(nextRows);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, [guard.status, statusFilter]);

  return (
    <AdminShell
      title="VORADA Hakediş"
      subtitle="Referans davet sistemi yönetimi"
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      <View style={styles.topActions}>
        <AdminActionChip
          label="Finans"
          icon="cash-outline"
          onPress={() => router.push(ADMIN_REFERRAL_FINANCE_ROUTE as Href)}
        />
        <AdminActionChip
          label="Ayarlar"
          icon="settings-outline"
          onPress={() => router.push(ADMIN_REFERRAL_SETTINGS_ROUTE as Href)}
        />
      </View>

      {stats ? (
        <View style={styles.stats}>
          <AdminStatCard label="Toplam Davet" value={String(stats.totalInvites)} icon="people-outline" />
          <AdminStatCard label="Toplam Hakediş" value={String(stats.totalCommissions)} icon="list-outline" />
          <AdminStatCard label="Bekleyen" value={String(stats.pendingCount)} icon="time-outline" accent={colors.warning} />
          <AdminStatCard label="Onaylanan" value={String(stats.approvedCount)} icon="checkmark-circle-outline" accent={colors.primary} />
          <AdminStatCard label="Ödenen" value={String(stats.paidCount)} icon="wallet-outline" accent={colors.success} />
          <AdminStatCard label="İncelemede" value={String(stats.reviewingCount)} icon="search-outline" accent={colors.warning} />
          <AdminStatCard label="Şüpheli" value={String(stats.suspiciousCount)} icon="alert-circle-outline" accent={colors.danger} />
          <AdminStatCard label="Reddedilen" value={String(stats.rejectedCount)} icon="close-circle-outline" accent={colors.danger} />
        </View>
      ) : null}

      <View style={styles.filters}>
        <AdminFilterChip options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
      </View>

      {loading ? (
        <AdminEmptyState loading />
      ) : rows.length === 0 ? (
        <AdminEmptyState title="Kayıt yok" message="Bu filtrede hakediş bulunamadı." icon="gift-outline" />
      ) : (
        rows.map((row) => (
          <Pressable
            key={row.commissionId}
            onPress={() => router.push(adminReferralDetailPath(row.commissionId) as Href)}
          >
            <GlassCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text variant="caption" muted>
                  {row.commissionId.slice(0, 8)}…
                </Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: `${REFERRAL_STATUS_COLORS[row.status]}22` },
                  ]}
                >
                  <Text variant="caption" style={{ color: REFERRAL_STATUS_COLORS[row.status] }}>
                    {REFERRAL_STATUS_LABELS[row.status]}
                  </Text>
                </View>
              </View>
              <Text variant="label">
                @{row.inviterUsername} → @{row.inviteeUsername}
              </Text>
              <Text variant="caption" secondary>
                {formatReferralCents(row.amountCents)} · {row.inviteCode}
              </Text>
              <Text variant="caption" muted>
                Kayıt: {new Date(row.registeredAt).toLocaleString('tr-TR')}
                {row.earnedAt ? ` · Hakediş: ${new Date(row.earnedAt).toLocaleString('tr-TR')}` : ''}
                {row.paidAt ? ` · Ödeme: ${new Date(row.paidAt).toLocaleString('tr-TR')}` : ''}
              </Text>
              {row.suspicious ? (
                <Text variant="caption" style={{ color: colors.danger }}>
                  Şüpheli hesap
                </Text>
              ) : null}
            </GlassCard>
          </Pressable>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  stats: { gap: spacing.xs, marginBottom: spacing.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  card: { gap: spacing.xs, marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 8 },
});
