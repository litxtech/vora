import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatStatPercent } from '@/features/admin/services/statisticsPresentation';
import type { AdminStatistics } from '@/features/admin/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  stats: AdminStatistics;
  moderationTotal: number;
};

export function AdminStatisticsHeroStrip({ stats, moderationTotal }: Props) {
  const { colors } = useTheme();
  const o = stats.overview;
  const d = stats.daily;

  const totalUsers = o?.total_users ?? stats.top_users.length;
  const active7d = o?.active_users_7d ?? 0;
  const dailyRegistrations = d?.registrations ?? 0;
  const activeRate = formatStatPercent(active7d, totalUsers);

  const items = [
    {
      label: 'Toplam kullanıcı',
      value: totalUsers.toLocaleString('tr-TR'),
      hint: o ? `%${activeRate} aktif (7g)` : 'Genel bakış',
      icon: 'people' as const,
      colors: [colors.primary, `${colors.primary}88`],
    },
    {
      label: 'Aktif (7 gün)',
      value: active7d.toLocaleString('tr-TR'),
      hint: o ? `${o.active_users_30d.toLocaleString('tr-TR')} aktif (30g)` : 'Haftalık aktivite',
      icon: 'pulse' as const,
      colors: [colors.success, `${colors.success}88`],
    },
    {
      label: 'Bugün kayıt',
      value: dailyRegistrations.toLocaleString('tr-TR'),
      hint: d ? `${d.posts} gönderi · ${d.reels} reel` : 'Son 24 saat',
      icon: 'person-add' as const,
      colors: [colors.accent, `${colors.accent}88`],
    },
    {
      label: 'Bekleyen işlem',
      value: moderationTotal.toLocaleString('tr-TR'),
      hint: moderationTotal > 0 ? 'Moderasyon kuyruğu' : 'Kuyruk temiz',
      icon: 'shield-checkmark' as const,
      colors: moderationTotal > 0 ? [colors.warning, `${colors.warning}88`] : [colors.success, `${colors.success}88`],
    },
  ];

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <GlassCard key={item.label} style={styles.card} padded={false}>
          <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
            <View style={styles.topRow}>
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={18} color="#fff" />
              </View>
              <Text variant="label" style={styles.value} numberOfLines={1}>
                {item.value}
              </Text>
            </View>
            <Text variant="caption" style={styles.label} numberOfLines={2}>
              {item.label}
            </Text>
            <Text variant="caption" style={styles.hint} numberOfLines={2}>
              {item.hint}
            </Text>
          </LinearGradient>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    overflow: 'hidden',
    borderRadius: radius.lg,
  },
  gradient: {
    padding: spacing.md,
    gap: 6,
    minHeight: 108,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  value: {
    flex: 1,
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'right',
    lineHeight: 28,
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    lineHeight: 16,
  },
  hint: {
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 15,
  },
});
