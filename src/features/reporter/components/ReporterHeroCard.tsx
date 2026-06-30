import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  REPORTER_GRADIENT,
  REPORTER_GRADIENT_DEEP,
  REPORTER_LEVEL_MAP,
  REPORTER_VERIFY_CORRECT_POINTS,
  REPORTER_VERIFY_INCORRECT_POINTS,
} from '@/features/reporter/constants';
import { radius, spacing } from '@/constants/theme';

type ReporterHeroCardProps = {
  reporterLevel?: number;
  isReporter?: boolean;
};

export function ReporterHeroCard({ reporterLevel, isReporter }: ReporterHeroCardProps) {
  const levelDef =
    reporterLevel != null ? REPORTER_LEVEL_MAP[reporterLevel] ?? REPORTER_LEVEL_MAP[1] : null;

  return (
    <LinearGradient
      colors={[
        `${REPORTER_GRADIENT[0]}F0`,
        `${REPORTER_GRADIENT[1]}E8`,
        `${REPORTER_GRADIENT[2]}D8`,
        REPORTER_GRADIENT_DEEP,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={[styles.orb, styles.orbA]} />
      <View style={[styles.orb, styles.orbB]} />

      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Ionicons name="mic" size={13} color="#fff" />
          <Text variant="caption" style={styles.badgeText}>
            Vatandaş gazetecilik
          </Text>
        </View>
        {isReporter && levelDef ? (
          <View style={styles.levelPill}>
            <Text variant="caption" style={styles.levelText}>
              {levelDef.emoji} {levelDef.label}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title}>Muhabir Programı</Text>
      <Text variant="caption" style={styles.subtitle}>
        Haberleri doğrula, güven puanı kazan, topluluğa güvenilir kaynak ol.
      </Text>

      <View style={styles.statsRow}>
        <StatChip
          icon="add-circle-outline"
          label="Doğru doğrulama"
          value={`+${REPORTER_VERIFY_CORRECT_POINTS} puan`}
        />
        <StatChip
          icon="remove-circle-outline"
          label="Yanlış doğrulama"
          value={`−${REPORTER_VERIFY_INCORRECT_POINTS} puan`}
        />
      </View>
    </LinearGradient>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.9)" />
      <View style={styles.statCopy}>
        <Text variant="caption" style={styles.statLabel}>
          {label}
        </Text>
        <Text variant="caption" style={styles.statValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    gap: spacing.sm,
  },
  orb: {
    position: 'absolute',
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orbA: { width: 110, height: 110, top: -36, right: -18 },
  orbB: { width: 72, height: 72, bottom: -20, left: -10 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  badgeText: { color: '#fff', fontWeight: '600', fontSize: 11 },
  levelPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  levelText: { color: '#E3F2FD', fontWeight: '700', fontSize: 11 },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: 0,
  },
  statCopy: { flex: 1, minWidth: 0, gap: 1 },
  statLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 10 },
  statValue: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
