import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  getNextReporterLevelDef,
  REPORTER_LEVEL_MAP,
  reporterLevelProgressPct,
} from '@/features/reporter/constants';
import type { ReporterLevelProgress } from '@/features/reporter/types';
import { TRUST_SCORE_MAX } from '@/features/profile/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ReporterLevelProgressCardProps = {
  progress: ReporterLevelProgress;
};

export function ReporterLevelProgressCard({ progress }: ReporterLevelProgressCardProps) {
  const { colors } = useTheme();
  const current = REPORTER_LEVEL_MAP[progress.level] ?? REPORTER_LEVEL_MAP[1];
  const next = progress.maxLevel ? null : getNextReporterLevelDef(progress.level);

  const correctTarget = next?.minCorrect ?? progress.correctVerifications;
  const trustTarget = next?.minTrust ?? progress.trustScore;
  const correctPct = reporterLevelProgressPct(progress.correctVerifications, correctTarget);
  const trustPct = reporterLevelProgressPct(progress.trustScore, trustTarget);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}16` }]}>
          <Text style={styles.emoji}>{current.emoji}</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text variant="label">
            {current.emoji} {current.label}
          </Text>
          <Text variant="caption" secondary>
            Seviye {progress.level}/5
          </Text>
        </View>
        {progress.maxLevel ? (
          <View style={[styles.maxPill, { backgroundColor: `${colors.success}18` }]}>
            <Ionicons name="trophy" size={12} color={colors.success} />
            <Text variant="caption" style={{ color: colors.success, fontWeight: '700', fontSize: 10 }}>
              Maksimum
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metrics}>
        <MetricRow
          icon="checkmark-done-outline"
          label="Doğru doğrulama"
          value={`${progress.correctVerifications}`}
          suffix={next ? ` / ${next.minCorrect}` : ''}
          progress={correctPct}
          color={colors.primary}
          trackColor={colors.border}
        />
        <MetricRow
          icon="shield-checkmark-outline"
          label="Güven puanı"
          value={`${progress.trustScore}`}
          suffix={next ? ` / ${next.minTrust}` : ` / ${TRUST_SCORE_MAX}`}
          progress={trustPct}
          color={colors.success}
          trackColor={colors.border}
        />
      </View>

      {!progress.isReporter ? (
        <Text variant="caption" secondary style={styles.hint}>
          Muhabir başvurunuz onaylandığında seviye sistemi aktif olur.
        </Text>
      ) : progress.maxLevel ? (
        <Text variant="caption" secondary style={styles.hint}>
          En üst muhabir seviyesindesiniz. Doğrulamaya devam ederek topluluğa güven kazandırın.
        </Text>
      ) : next ? (
        <Text variant="caption" secondary style={styles.hint}>
          Sonraki seviye ({next.label}): {Math.max(0, next.minCorrect - progress.correctVerifications)} doğrulama
          ve {Math.max(0, next.minTrust - progress.trustScore)} güven puanı daha.
        </Text>
      ) : null}
    </View>
  );
}

function MetricRow({
  icon,
  label,
  value,
  suffix,
  progress,
  color,
  trackColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  suffix: string;
  progress: number;
  color: string;
  trackColor: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricTop}>
        <View style={styles.metricLabel}>
          <Ionicons name={icon} size={14} color={color} />
          <Text variant="caption" secondary>
            {label}
          </Text>
        </View>
        <Text variant="caption" style={{ fontWeight: '700' }}>
          {value}
          <Text variant="caption" secondary>
            {suffix}
          </Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.fill, { width: `${progress}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  headerCopy: { flex: 1, gap: 2 },
  maxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  metrics: { gap: spacing.sm },
  metric: { gap: 6 },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metricLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  track: {
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  hint: {
    lineHeight: 18,
  },
});
