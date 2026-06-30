import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { formatCount } from '@/features/profile/constants';
import { INSIGHTS_ACCENT } from '@/features/insights/constants';
import type { ProfileStats } from '@/features/profile/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  stats: ProfileStats;
};

type MetricDef = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  accent: string;
};

export function InsightsQuickMetrics({ stats }: Props) {
  const { colors } = useTheme();

  const metrics: MetricDef[] = [
    { icon: 'eye-outline', label: 'Görüntülenme', value: stats.totalViews, accent: INSIGHTS_ACCENT },
    { icon: 'person-outline', label: 'Profil ziyareti', value: stats.profileViewCount, accent: colors.accent },
    { icon: 'heart-outline', label: 'Beğeni', value: stats.totalLikes, accent: colors.success },
    { icon: 'chatbubble-outline', label: 'Yorum', value: stats.totalComments, accent: colors.primary },
  ];

  return (
    <View style={styles.grid}>
      {metrics.map((m) => (
        <View
          key={m.label}
          style={[styles.tile, { backgroundColor: `${m.accent}0D`, borderColor: `${m.accent}28` }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${m.accent}18` }]}>
            <Ionicons name={m.icon} size={16} color={m.accent} />
          </View>
          <Text variant="h3" style={{ color: m.accent, fontWeight: '800', fontSize: 20 }}>
            {formatCount(m.value)}
          </Text>
          <Text secondary variant="caption" style={styles.label}>
            {m.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tile: {
    flex: 1,
    minWidth: '46%',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 4,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: { fontSize: 11 },
});
