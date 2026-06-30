import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PERSONNEL_ACCENT } from '@/features/personnel-center/constants';
import type { ListingApplicationStats } from '@/features/personnel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  stats: ListingApplicationStats;
  compact?: boolean;
};

function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  accent: string;
}) {
  const { colors } = useTheme();
  if (value <= 0) return null;

  return (
    <View style={[styles.pill, { backgroundColor: `${accent}12`, borderColor: `${accent}28` }]}>
      <Ionicons name={icon} size={12} color={accent} />
      <Text variant="caption" style={{ color: colors.text, fontWeight: '600' }}>
        {value} {label}
      </Text>
    </View>
  );
}

export function ListingApplicationStatsRow({ stats, compact = false }: Props) {
  const { colors } = useTheme();
  const hasAny = stats.total > 0 || stats.pending > 0 || stats.accepted > 0;

  if (!hasAny) {
    if (compact) return null;
    return (
      <View style={[styles.emptyRow, { borderColor: colors.border }]}>
        <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
        <Text secondary variant="caption">
          Henüz başvuru yok
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <StatPill icon="people-outline" label="başvuru" value={stats.total} accent={PERSONNEL_ACCENT} />
      <StatPill icon="time-outline" label="bekliyor" value={stats.pending} accent={colors.warning} />
      <StatPill icon="checkmark-circle-outline" label="onaylı" value={stats.accepted} accent={colors.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
});
