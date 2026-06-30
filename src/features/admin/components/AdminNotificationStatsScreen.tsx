import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import {
  fetchNotificationStats,
  type NotificationStats,
} from '@/features/admin/services/notificationStats';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AdminNotificationStatsScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const { data } = await fetchNotificationStats(30);
    setStats(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminShell
      title="Bildirim İstatistikleri"
      subtitle="Son 30 gün"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : !stats ? (
        <AdminEmptyState title="Veri yok" message="Bildirim istatistikleri alınamadı." icon="stats-chart-outline" />
      ) : (
        <>
          <View style={styles.list}>
            <AdminStatCard label="Gönderilen" value={String(stats.sentCount)} icon="send" />
            <AdminStatCard label="Açılma oranı" value={`%${stats.openRate}`} icon="mail-open-outline" accent={colors.success} />
            <AdminStatCard label="Tıklanma oranı" value={`%${stats.clickRate}`} icon="hand-left-outline" accent={colors.primary} />
            <AdminStatCard label="Açılan" value={String(stats.openedCount)} icon="eye-outline" />
            <AdminStatCard label="Tıklanan" value={String(stats.clickedCount)} icon="finger-print-outline" accent={colors.warning} />
          </View>

          {Object.keys(stats.byCategory).length > 0 ? (
            <>
              <AdminSectionHeader title="Kategoriye göre" />
              {Object.entries(stats.byCategory).map(([cat, count]) => (
                <GlassCard key={cat}>
                  <Text variant="label">{cat}</Text>
                  <Text secondary>{count} bildirim</Text>
                </GlassCard>
              ))}
            </>
          ) : null}
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
});
