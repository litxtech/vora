import { StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import type { AdminStatisticsDaily, AdminStatisticsWeekly } from '@/features/admin/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ActivityMetric = {
  label: string;
  daily: number;
  weekly: number;
  accent?: string;
};

type Props = {
  daily: AdminStatisticsDaily;
  weekly: AdminStatisticsWeekly;
};

function ActivityBar({
  label,
  daily,
  weekly,
  accent,
}: ActivityMetric & { accent: string }) {
  const { colors } = useTheme();
  const weeklyAvg = weekly / 7;
  const max = Math.max(daily, weeklyAvg, 1);
  const dailyPct = (daily / max) * 100;
  const weeklyPct = (weeklyAvg / max) * 100;
  const trend = daily >= weeklyAvg ? 'up' : 'down';

  return (
    <View style={styles.metric}>
      <View style={styles.metricHeader}>
        <Text variant="caption" style={{ fontWeight: '600' }}>
          {label}
        </Text>
        <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
          {daily.toLocaleString('tr-TR')} / gün
        </Text>
      </View>
      <View style={styles.bars}>
        <View style={styles.barRow}>
          <Text secondary variant="caption" style={styles.barLabel}>
            24s
          </Text>
          <View style={[styles.track, { backgroundColor: `${colors.border}88` }]}>
            <View style={[styles.fill, { width: `${dailyPct}%`, backgroundColor: accent }]} />
          </View>
        </View>
        <View style={styles.barRow}>
          <Text secondary variant="caption" style={styles.barLabel}>
            7g ø
          </Text>
          <View style={[styles.track, { backgroundColor: `${colors.border}55` }]}>
            <View
              style={[styles.fill, { width: `${weeklyPct}%`, backgroundColor: `${accent}66` }]}
            />
          </View>
        </View>
      </View>
      <Text secondary variant="caption">
        Haftalık ortalama {Math.round(weeklyAvg).toLocaleString('tr-TR')}
        {trend === 'up' ? ' · bugün ortalamanın üstünde' : ' · bugün ortalamanın altında'}
      </Text>
    </View>
  );
}

export function AdminStatisticsActivityPanel({ daily, weekly }: Props) {
  const { colors } = useTheme();

  const metrics: ActivityMetric[] = [
    { label: 'Kayıt', daily: daily.registrations, weekly: weekly.registrations, accent: colors.success },
    { label: 'Gönderi', daily: daily.posts, weekly: weekly.posts, accent: colors.accent },
    { label: 'Reel', daily: daily.reels, weekly: weekly.reels, accent: colors.primary },
    { label: 'Yorum', daily: daily.comments, weekly: 0, accent: colors.warning },
    { label: 'Mesaj', daily: daily.messages, weekly: 0, accent: colors.primary },
    { label: 'Yeni takip', daily: daily.new_follows, weekly: 0, accent: colors.danger },
  ];

  return (
    <>
      <AdminSectionHeader title="Aktivite karşılaştırması" hint="Son 24 saat vs 7 günlük ortalama" />
      <GlassCard style={styles.panel}>
        {metrics.map((metric) => (
          <ActivityBar
            key={metric.label}
            label={metric.label}
            daily={metric.daily}
            weekly={metric.weekly}
            accent={metric.accent ?? colors.primary}
          />
        ))}
        <View style={[styles.weeklyHighlight, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}33` }]}>
          <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
            Haftalık aktif kullanıcı: {weekly.active_users.toLocaleString('tr-TR')}
          </Text>
        </View>
      </GlassCard>
    </>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md },
  metric: { gap: spacing.xs },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bars: { gap: 6 },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: { width: 28 },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  weeklyHighlight: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
});
