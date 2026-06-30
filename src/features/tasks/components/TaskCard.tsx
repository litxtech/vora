import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { ALL_TASKS_BONUS, rewardLabel, TASK_ICONS } from '@/features/tasks/constants';
import type { DailyTask } from '@/features/tasks/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type TaskCardProps = {
  task: DailyTask;
  onClaim: () => void;
  claiming: boolean;
};

function taskStatus(task: DailyTask): { label: string; tone: 'muted' | 'primary' | 'success' } {
  if (task.claimedAt) return { label: 'Alındı', tone: 'success' };
  if (task.progress >= task.targetCount) return { label: 'Ödül hazır', tone: 'primary' };
  return { label: 'Devam ediyor', tone: 'muted' };
}

export function TaskCard({ task, onClaim, claiming }: TaskCardProps) {
  const { colors } = useTheme();
  const icon = TASK_ICONS[task.taskKey] ?? 'checkbox-outline';
  const isComplete = task.progress >= task.targetCount;
  const isClaimed = !!task.claimedAt;
  const canClaim = isComplete && !isClaimed;
  const status = taskStatus(task);
  const progressPct = Math.min(100, (task.progress / task.targetCount) * 100);

  const statusColor =
    status.tone === 'success' ? colors.success : status.tone === 'primary' ? colors.primary : colors.textMuted;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: canClaim ? `${colors.primary}55` : isClaimed ? `${colors.success}44` : colors.border,
        },
        canClaim && styles.cardReady,
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: `${statusColor}18` }]}>
          <Ionicons name={icon} size={20} color={statusColor} />
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text variant="label" style={styles.title}>
              {task.title}
            </Text>
            <View style={[styles.statusChip, { backgroundColor: `${statusColor}18` }]}>
              <Text variant="caption" style={{ color: statusColor, fontWeight: '700', fontSize: 10 }}>
                {status.label}
              </Text>
            </View>
          </View>
          <Text variant="caption" secondary>
            {task.description}
          </Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: isClaimed ? colors.success : isComplete ? colors.primary : colors.primary,
                width: `${progressPct}%`,
              },
            ]}
          />
        </View>
        <Text variant="caption" secondary style={styles.progressCount}>
          {task.progress}/{task.targetCount}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={[styles.rewardBadge, { backgroundColor: `${colors.warning}16`, borderColor: `${colors.warning}33` }]}>
          <Ionicons name="shield-checkmark" size={14} color={colors.warning} />
          <Text variant="caption" style={{ color: colors.warning, fontWeight: '700' }}>
            {rewardLabel(task.rewardType, task.rewardValue)}
          </Text>
        </View>
        {canClaim ? (
          <Button title="Ödülü Al" onPress={onClaim} loading={claiming} fullWidth={false} />
        ) : isClaimed ? (
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
        ) : null}
      </View>
    </View>
  );
}

export function TasksBonusNote() {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[styles.bonusNote, { backgroundColor: `${colors.accent}12`, borderColor: `${colors.accent}44` }]}
    >
      <View style={[styles.bonusIcon, { backgroundColor: `${colors.accent}20` }]}>
        <Ionicons name="star" size={16} color={colors.accent} />
      </View>
      <Text variant="caption" secondary style={styles.bonusText}>
        {ALL_TASKS_BONUS}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardReady: {
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  title: {
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  progressCount: {
    minWidth: 36,
    textAlign: 'right',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bonusNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  bonusIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusText: {
    flex: 1,
    lineHeight: 18,
  },
});
