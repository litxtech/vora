import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  ALL_TASKS_TRUST_BONUS,
  TASKS_GRADIENT,
  TASKS_GRADIENT_DEEP,
} from '@/features/tasks/constants';
import { PUAN_SYMBOL } from '@/features/wallet/constants';
import { radius, spacing } from '@/constants/theme';

type TasksHeroCardProps = {
  total: number;
  completed: number;
  claimed: number;
  pointsAvailable: number;
};

export function TasksHeroCard({ total, completed, claimed, pointsAvailable }: TasksHeroCardProps) {
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed >= total;

  return (
    <LinearGradient
      colors={[`${TASKS_GRADIENT[0]}F0`, `${TASKS_GRADIENT[1]}E8`, `${TASKS_GRADIENT[2]}D8`, TASKS_GRADIENT_DEEP]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={[styles.orb, styles.orbA]} />
      <View style={[styles.orb, styles.orbB]} />

      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Ionicons name="trophy" size={13} color="#fff" />
          <Text variant="caption" style={styles.badgeText}>
            Bugünün görevleri
          </Text>
        </View>
        {allDone ? (
          <View style={styles.donePill}>
            <Ionicons name="checkmark-circle" size={12} color="#86EFAC" />
            <Text variant="caption" style={styles.doneText}>
              Tamamlandı
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreValue}>{completed}</Text>
        <Text style={styles.scoreMax}>/{total}</Text>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressMeta}>
          <Text variant="caption" style={styles.progressLabel}>
            İlerleme
          </Text>
          <Text variant="caption" style={styles.progressPct}>
            %{progressPct}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      <View style={styles.footer}>
        <HeroChip icon="wallet-outline" label="Alınan ödül" value={`${claimed}/${total}`} />
        <HeroChip
          icon="sparkles"
          label="Kazanılabilir"
          value={`${pointsAvailable} ${PUAN_SYMBOL}`}
        />
        <HeroChip icon="gift-outline" label="Set bonusu" value={`+${ALL_TASKS_TRUST_BONUS}`} />
      </View>
    </LinearGradient>
  );
}

function HeroChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.9)" />
      <View style={styles.chipText}>
        <Text variant="caption" style={styles.chipLabel}>
          {label}
        </Text>
        <Text variant="caption" style={styles.chipValue} numberOfLines={1}>
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
  orbA: { width: 120, height: 120, top: -40, right: -20 },
  orbB: { width: 80, height: 80, bottom: -24, left: -12 },
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
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(34,197,94,0.22)',
  },
  doneText: { color: '#BBF7D0', fontWeight: '700', fontSize: 11 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -1,
  },
  scoreMax: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 32,
    marginBottom: 4,
  },
  progressBlock: { gap: 6 },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 12 },
  progressPct: { color: '#fff', fontWeight: '700', fontSize: 12 },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: '#FDE68A',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: 0,
  },
  chipText: { flex: 1, minWidth: 0, gap: 1 },
  chipLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 10 },
  chipValue: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
