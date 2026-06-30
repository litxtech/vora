import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

type AdminRankRowProps = {
  rank: number;
  title: string;
  subtitle?: string;
  value: string;
  valueHint?: string;
  progress?: number;
  accent?: string;
};

export function AdminRankRow({
  rank,
  title,
  subtitle,
  value,
  valueHint,
  progress,
  accent,
}: AdminRankRowProps) {
  const { colors } = useTheme();
  const rankColor = rank <= 3 ? RANK_COLORS[rank - 1] : colors.textMuted;
  const barColor = accent ?? colors.primary;
  const pct = progress != null ? Math.min(100, Math.max(0, progress)) : null;

  return (
    <GlassCard style={styles.card} padded={false}>
      <View style={styles.row}>
        <View style={[styles.rankBadge, { backgroundColor: `${rankColor}22`, borderColor: `${rankColor}55` }]}>
          <Text variant="caption" style={[styles.rankText, { color: rankColor }]}>
            {rank}
          </Text>
        </View>
        <View style={styles.body}>
          <Text variant="label" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text secondary variant="caption" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {pct != null ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
            </View>
          ) : null}
        </View>
        <View style={styles.valueCol}>
          <Text variant="label" style={{ color: barColor }} numberOfLines={1}>
            {value}
          </Text>
          {valueHint ? (
            <Text secondary variant="caption">
              {valueHint}
            </Text>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}

type AdminMetricGridProps = {
  items: {
    label: string;
    value: number | string;
    icon: keyof typeof Ionicons.glyphMap;
    accent?: string;
  }[];
};

export function AdminMetricGrid({ items }: AdminMetricGridProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const color = item.accent ?? colors.primary;
        const displayValue =
          typeof item.value === 'number' ? item.value.toLocaleString('tr-TR') : item.value;

        return (
          <GlassCard key={item.label} style={styles.gridItem} padded={false}>
            <View style={styles.gridRow}>
              <View style={[styles.gridIcon, { backgroundColor: `${color}18` }]}>
                <Ionicons name={item.icon} size={16} color={color} />
              </View>
              <View style={styles.gridContent}>
                <Text variant="label" style={[styles.gridValue, { color }]} numberOfLines={1}>
                  {displayValue}
                </Text>
                <Text variant="caption" secondary numberOfLines={2} style={styles.gridLabel}>
                  {item.label}
                </Text>
              </View>
            </View>
          </GlassCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: radius.md },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rankText: { fontWeight: '800', fontSize: 12 },
  body: { flex: 1, gap: 3 },
  valueCol: { alignItems: 'flex-end', gap: 1, maxWidth: 110, flexShrink: 0 },
  progressTrack: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridItem: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    padding: spacing.sm + 2,
    borderRadius: radius.md,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  gridContent: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  gridIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  gridLabel: { fontWeight: '500', lineHeight: 16 },
  gridValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, lineHeight: 24 },
});
