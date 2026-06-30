import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import { formatReferralCents } from '@/features/referral-earnings/constants';
import { fetchReferralFinanceSummary } from '@/features/referral-earnings/services/referralAdmin';
import type { ReferralFinanceSummary } from '@/features/referral-earnings/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AdminReferralFinanceScreen() {
  const guard = useAdminGuard();
  const { colors } = useTheme();
  const [summary, setSummary] = useState<ReferralFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (guard.status !== 'allowed') return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setSummary(await fetchReferralFinanceSummary());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, [guard.status]);

  return (
    <AdminShell
      title="Platform Hakediş Özeti"
      subtitle="Finans paneli"
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : !summary ? (
        <AdminEmptyState title="Veri yok" message="Finans özeti yüklenemedi." />
      ) : (
        <>
          <View style={styles.stats}>
            <AdminStatCard
              label="Henüz Hak Edilmedi"
              value={formatReferralCents(summary.notEarnedCents)}
              icon="hourglass-outline"
            />
            <AdminStatCard
              label="Hak Edildi"
              value={formatReferralCents(summary.earnedCents)}
              icon="ribbon-outline"
              accent={colors.success}
            />
            <AdminStatCard
              label="Onaylandı"
              value={formatReferralCents(summary.approvedCents)}
              icon="checkmark-done-outline"
              accent={colors.primary}
            />
            <AdminStatCard
              label="Ödendi"
              value={formatReferralCents(summary.paidCents)}
              icon="wallet-outline"
              accent={colors.success}
            />
            <AdminStatCard
              label="İptal"
              value={formatReferralCents(summary.cancelledCents)}
              icon="ban-outline"
            />
            <AdminStatCard
              label="Reddedildi"
              value={formatReferralCents(summary.rejectedCents)}
              icon="close-circle-outline"
              accent={colors.danger}
            />
          </View>

          <GlassCard style={styles.summary}>
            <Text variant="caption" secondary>
              Toplam Platform Yükümlülüğü
            </Text>
            <Text variant="h2" style={{ color: colors.warning }}>
              {formatReferralCents(summary.totalLiabilityCents)}
            </Text>
            <Text variant="caption" secondary>
              Toplam Ödenen: {formatReferralCents(summary.totalPaidCents)}
            </Text>
            <Text variant="caption" secondary>
              Toplam Bekleyen: {formatReferralCents(summary.totalPendingCents)}
            </Text>
          </GlassCard>
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  stats: { gap: spacing.xs, marginBottom: spacing.md },
  summary: { gap: spacing.xs },
});
