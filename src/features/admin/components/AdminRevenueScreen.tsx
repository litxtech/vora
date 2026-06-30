import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { CONTRIBUTION_STATUS_LABELS, REVENUE_TYPE_LABELS } from '@/features/admin/constants';
import { fetchRevenueSummary } from '@/features/admin/services/statistics';
import type { RevenueSummary } from '@/features/admin/types';
import {
  contributionTierLabel,
  fetchAdminContributions,
  type AdminContributionRow,
} from '@/features/platform-support/services/adminContributions';
import { fetchRevenueRecords, type RevenueRecordRow } from '@/features/revenue/services/adminRevenue';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Tab = 'summary' | 'records' | 'contributions';

const TABS = [
  { id: 'summary' as const, label: 'Gelir özeti' },
  { id: 'records' as const, label: 'Tüm kayıtlar' },
  { id: 'contributions' as const, label: 'Destek katkıları' },
];

export function AdminRevenueScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('summary');
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [records, setRecords] = useState<RevenueRecordRow[]>([]);
  const [contributions, setContributions] = useState<AdminContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [summaryRes, recordsRes, contributionsRes] = await Promise.all([
      fetchRevenueSummary(),
      fetchRevenueRecords(50),
      fetchAdminContributions(50),
    ]);

    setSummary(summaryRes.data);
    setRecords(recordsRes);
    setContributions(contributionsRes);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminShell
      title="Gelir Paneli"
      subtitle="Premium, reklam, bilet ve platform katkıları"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={TABS} value={tab} onChange={setTab} />

      {loading ? (
        <AdminEmptyState loading />
      ) : tab === 'summary' ? (
        !summary ? (
          <AdminEmptyState title="Veri yüklenemedi" message="Gelir özeti alınamadı." icon="cash-outline" />
        ) : (
          <>
            <View style={styles.list}>
              <AdminStatCard
                label="Toplam gelir"
                value={`₺${Number(summary.total_revenue).toLocaleString('tr-TR')}`}
                icon="cash"
              />
              <AdminStatCard
                label="Platform katkıları"
                value={`₺${Number(summary.platform_contributions_total ?? 0).toLocaleString('tr-TR')}`}
                icon="heart"
                accent={colors.accent}
              />
              <AdminStatCard label="Premium işletme" value={summary.premium_businesses} icon="business" />
              <AdminStatCard
                label="Premium kullanıcı"
                value={summary.premium_users}
                icon="star"
                accent={colors.warning}
              />
              <AdminStatCard
                label="Aktif online abonelik"
                value={summary.stripe_subscriptions_active ?? 0}
                icon="card"
              />
            </View>
            <AdminSectionHeader title="Gelir dağılımı" />
            {Object.keys(summary.by_type ?? {}).length === 0 ? (
              <AdminEmptyState
                title="Kayıt yok"
                message="Henüz gelir kaydı oluşmamış. Ödeme veya katkı geldiğinde burada görünür."
                icon="pie-chart-outline"
              />
            ) : (
              Object.entries(summary.by_type ?? {}).map(([type, amount]) => (
                <GlassCard key={type}>
                  <Text variant="label">{REVENUE_TYPE_LABELS[type] ?? type}</Text>
                  <Text secondary variant="caption">
                    ₺{Number(amount).toLocaleString('tr-TR')}
                  </Text>
                </GlassCard>
              ))
            )}
          </>
        )
      ) : tab === 'records' ? (
        records.length === 0 ? (
          <AdminEmptyState title="Kayıt yok" message="Gelir kaydı bulunamadı." icon="receipt-outline" />
        ) : (
          records.map((row) => (
            <GlassCard key={row.id}>
              <Text variant="label">{REVENUE_TYPE_LABELS[row.revenue_type] ?? row.revenue_type}</Text>
              <Text secondary variant="caption">
                ₺{Number(row.amount).toLocaleString('tr-TR')} · {row.reference_label ?? '—'}
              </Text>
              <Text secondary variant="caption">
                {new Date(row.recorded_at).toLocaleString('tr-TR')}
              </Text>
            </GlassCard>
          ))
        )
      ) : contributions.length === 0 ? (
        <AdminEmptyState title="Katkı yok" message="Platform destek katkısı bulunamadı." icon="heart-outline" />
      ) : (
        contributions.map((row) => (
          <GlassCard key={row.id}>
            <Text variant="label">@{row.username}</Text>
            <Text secondary variant="caption">
              {contributionTierLabel(row.tier)} · ₺{(row.amount_cents / 100).toLocaleString('tr-TR')} ·{' '}
              {CONTRIBUTION_STATUS_LABELS[row.status] ?? row.status}
            </Text>
            <Text secondary variant="caption">
              {new Date(row.completed_at ?? row.created_at).toLocaleString('tr-TR')}
            </Text>
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
});
