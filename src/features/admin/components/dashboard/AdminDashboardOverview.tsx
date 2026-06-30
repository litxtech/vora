import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminUrgentActionsPanel, getFirstPendingActionHref, sumModerationQueue } from '@/features/admin/components/dashboard/AdminUrgentActionsPanel';
import type { AdminDashboardStats } from '@/features/admin/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AccentKey = 'success' | 'accent' | 'primary' | 'warning' | 'danger';

const DAILY_METRICS: {
  label: string;
  key: keyof AdminDashboardStats;
  icon: keyof typeof Ionicons.glyphMap;
  accentKey?: AccentKey;
  href: string;
}[] = [
  { label: 'Kayıt', key: 'daily_registrations', icon: 'person-add', href: '/admin/users' },
  { label: 'Paylaşım', key: 'daily_posts', icon: 'create', accentKey: 'accent', href: '/admin/content' },
  { label: 'Yorum', key: 'daily_comments', icon: 'chatbubbles', href: '/admin/content' },
  { label: 'Mesaj', key: 'daily_messages', icon: 'mail', accentKey: 'primary', href: '/admin/messaging' },
];

function sumDailyActivity(stats: AdminDashboardStats) {
  return DAILY_METRICS.reduce((sum, item) => sum + stats[item.key], 0);
}

type Props = {
  stats: AdminDashboardStats;
  refreshing?: boolean;
};

export function AdminDashboardOverview({ stats, refreshing = false }: Props) {
  const { colors } = useTheme();
  const moderationTotal = sumModerationQueue(stats);
  const dailyActivity = sumDailyActivity(stats);
  const activeRate =
    stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0;

  const resolveAccent = (accentKey: AccentKey) => {
    switch (accentKey) {
      case 'success':
        return colors.success;
      case 'accent':
        return colors.accent;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      default:
        return colors.primary;
    }
  };

  const firstPendingHref = getFirstPendingActionHref(stats);

  const kpis = [
    { label: 'Kullanıcı', value: stats.total_users, hint: 'Toplam', href: '/admin/users' },
    { label: 'Aktif', value: stats.active_users, hint: `%${activeRate}`, href: '/admin/users' },
    { label: 'Aktivite', value: dailyActivity, hint: '24 saat', href: '/admin/content' },
    {
      label: 'Bekleyen',
      value: moderationTotal,
      hint: moderationTotal > 0 ? 'Kuyruk' : 'Temiz',
      href: firstPendingHref,
    },
  ];

  return (
    <View style={styles.wrap}>
      <GlassCard style={styles.panel} padded={false}>
        <LinearGradient
          colors={[`${colors.primary}EE`, `${colors.primary}BB`, `${colors.accent}88`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.statusBar}
        >
          <View style={styles.statusLeft}>
            <View style={[styles.liveDot, { backgroundColor: refreshing ? colors.warning : '#6EE7B7' }]} />
            <Text variant="caption" style={styles.statusText}>
              {refreshing ? 'Güncelleniyor' : 'Canlı panel'}
            </Text>
          </View>
          <Text variant="caption" style={styles.statusMeta}>
            Otomatik yenileme · 30 sn
          </Text>
        </LinearGradient>

        <View style={styles.kpiRow}>
          {kpis.map((kpi, index) => {
            const cell = (
              <>
                {index > 0 ? <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} /> : null}
                <Text variant="label" style={[styles.kpiValue, { color: colors.text }]} numberOfLines={1}>
                  {kpi.value.toLocaleString('tr-TR')}
                </Text>
                <Text variant="caption" style={styles.kpiLabel} numberOfLines={1}>
                  {kpi.label}
                </Text>
                <Text secondary variant="caption" style={styles.kpiHint} numberOfLines={1}>
                  {kpi.hint}
                </Text>
              </>
            );

            if (!kpi.href) {
              return (
                <View key={kpi.label} style={styles.kpiCell}>
                  {cell}
                </View>
              );
            }

            return (
              <Pressable
                key={kpi.label}
                accessibilityRole="button"
                style={({ pressed }) => [styles.kpiCell, pressed && styles.cellPressed]}
                onPress={() => router.push(kpi.href as never)}
              >
                {cell}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

        <View style={styles.activityBlock}>
          <Text variant="caption" style={[styles.blockTitle, { color: colors.textSecondary }]}>
            Günlük aktivite
          </Text>
          <View style={styles.activityRow}>
            {DAILY_METRICS.map((item, index) => {
              const accent = resolveAccent(item.accentKey ?? 'primary');
              const cell = (
                <>
                  {index > 0 ? <View style={[styles.activityDivider, { backgroundColor: colors.border }]} /> : null}
                  <View style={[styles.activityIcon, { backgroundColor: `${accent}16` }]}>
                    <Ionicons name={item.icon} size={14} color={accent} />
                  </View>
                  <Text variant="label" style={[styles.activityValue, { color: accent }]} numberOfLines={1}>
                    {stats[item.key].toLocaleString('tr-TR')}
                  </Text>
                  <Text secondary variant="caption" style={styles.activityLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                </>
              );

              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.activityCell, pressed && styles.cellPressed]}
                  onPress={() => router.push(item.href as never)}
                >
                  {cell}
                </Pressable>
              );
            })}
          </View>
        </View>
      </GlassCard>

      <AdminUrgentActionsPanel stats={stats} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  panel: { overflow: 'hidden' },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#fff', fontWeight: '700' },
  statusMeta: { color: 'rgba(255,255,255,0.82)', fontWeight: '600', fontSize: 11 },
  kpiRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  kpiCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    position: 'relative',
    paddingHorizontal: 2,
  },
  kpiDivider: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    width: StyleSheet.hairlineWidth,
  },
  kpiValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, lineHeight: 26 },
  kpiLabel: { fontWeight: '700', fontSize: 11 },
  kpiHint: { fontSize: 10 },
  sectionDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.md },
  activityBlock: { padding: spacing.md, gap: spacing.sm },
  blockTitle: { fontWeight: '700', letterSpacing: 0.2, textTransform: 'uppercase', fontSize: 10 },
  activityRow: { flexDirection: 'row' },
  activityCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    paddingHorizontal: 2,
  },
  activityDivider: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: StyleSheet.hairlineWidth,
  },
  activityIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  activityLabel: { fontSize: 10, fontWeight: '600' },
  cellPressed: { opacity: 0.75 },
});
