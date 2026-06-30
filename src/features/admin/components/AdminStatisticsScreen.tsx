import { useEffect, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatisticsHeroStrip } from '@/features/admin/components/statistics/AdminStatisticsHeroStrip';
import {
  AdminStatisticsModerationEmpty,
  AdminStatisticsModerationTab,
} from '@/features/admin/components/statistics/AdminStatisticsModerationTab';
import { AdminStatisticsOverviewTab } from '@/features/admin/components/statistics/AdminStatisticsOverviewTab';
import { AdminStatisticsRankingsTab } from '@/features/admin/components/statistics/AdminStatisticsRankingsTab';
import { adminStatisticsToCsv, fetchAdminStatistics } from '@/features/admin/services/statistics';
import {
  formatGeneratedAt,
  moderationTotal,
  STATISTICS_TABS,
  type StatisticsTab,
} from '@/features/admin/services/statisticsPresentation';
import type { AdminStatistics } from '@/features/admin/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function InfoBanner() {
  const { colors } = useTheme();
  return (
    <GlassCard style={[styles.infoBanner, { borderColor: `${colors.primary}33` }]}>
      <View style={styles.infoRow}>
        <Ionicons name="analytics" size={20} color={colors.primary} />
        <View style={styles.infoText}>
          <Text variant="label">Platform analitiği</Text>
          <Text secondary variant="caption">
            Kullanıcı büyümesi, içerik performansı ve moderasyon kuyruklarını tek ekranda izleyin.
            Raporu CSV olarak paylaşarak dışa aktarabilirsiniz.
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

function TimestampBadge({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.timestampBadge, { backgroundColor: `${colors.accent}14`, borderColor: `${colors.accent}44` }]}>
      <Ionicons name="time-outline" size={14} color={colors.accent} />
      <Text variant="caption" style={{ color: colors.accent, fontWeight: '600' }}>
        Son güncelleme · {label}
      </Text>
    </View>
  );
}

export function AdminStatisticsScreen() {
  const [stats, setStats] = useState<AdminStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tab, setTab] = useState<StatisticsTab>('overview');

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data, error: fetchError } = await fetchAdminStatistics();
    setStats(data);
    setError(fetchError);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const generatedLabel = useMemo(() => formatGeneratedAt(stats?.generated_at), [stats?.generated_at]);
  const queueTotal = useMemo(() => moderationTotal(stats?.moderation), [stats?.moderation]);

  const handleExport = async () => {
    if (!stats) return;
    setExporting(true);
    try {
      await Share.share({
        message: adminStatisticsToCsv(stats),
        title: 'platform-istatistikleri.csv',
      });
    } catch {
      Alert.alert('Dışa aktarma', 'Paylaşım iptal edildi.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminShell
      title="İstatistikler"
      subtitle="Kullanıcı, içerik ve moderasyon analitiği"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <InfoBanner />
      {generatedLabel ? <TimestampBadge label={generatedLabel} /> : null}

      <View style={styles.toolbar}>
        <AdminFilterChip options={STATISTICS_TABS} value={tab} onChange={setTab} />
        <AdminActionChip
          label="Raporu paylaş"
          icon="share-outline"
          tone="primary"
          onPress={handleExport}
          loading={exporting}
          disabled={!stats}
          compact
        />
      </View>

      {loading ? (
        <AdminEmptyState loading />
      ) : error ? (
        <AdminEmptyState title="Veri yüklenemedi" message={error} icon="analytics-outline" />
      ) : !stats ? (
        <AdminEmptyState title="Veri yok" message="Platform istatistikleri alınamadı." icon="analytics-outline" />
      ) : (
        <>
          <AdminStatisticsHeroStrip stats={stats} moderationTotal={queueTotal} />

          {tab === 'overview' ? (
            <AdminStatisticsOverviewTab stats={stats} />
          ) : tab === 'rankings' ? (
            <AdminStatisticsRankingsTab stats={stats} />
          ) : stats.moderation ? (
            <AdminStatisticsModerationTab moderation={stats.moderation} total={queueTotal} />
          ) : (
            <AdminStatisticsModerationEmpty />
          )}
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  infoBanner: { gap: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, gap: 4 },
  timestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
