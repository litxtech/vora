import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { TaskCard, TasksBonusNote } from '@/features/tasks/components/TaskCard';
import { TasksHeroCard } from '@/features/tasks/components/TasksHeroCard';
import {
  ALL_TASKS_TRUST_BONUS,
  rewardLabel,
  TASK_CLAIM_HINT,
  TASKS_SCREEN_SUBTITLE,
} from '@/features/tasks/constants';
import { claimTaskReward, fetchDailyTasks } from '@/features/tasks/services/taskData';
import type { DailyTask } from '@/features/tasks/types';
import { WALLET_POINTS_HISTORY_ROUTE } from '@/features/wallet/constants';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function sumTaskPoints(tasks: DailyTask[]): number {
  return tasks.reduce((sum, task) => {
    if (task.rewardType !== 'kuru' && task.rewardType !== 'points') return sum;
    return sum + task.rewardValue;
  }, 0);
}

export function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setTasks([]);
      return;
    }
    setTasks(await fetchDailyTasks(user.id));
  }, [user]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleClaim = async (taskKey: string) => {
    if (!user) return;
    setClaimingKey(taskKey);
    const result = await claimTaskReward(user.id, taskKey);
    setClaimingKey(null);

    if (!result.ok || !result.result) {
      Alert.alert('Hata', result.error ?? 'Ödül alınamadı.');
      return;
    }

    Alert.alert(
      'Tebrikler!',
      `${rewardLabel(result.result.rewardType, result.result.rewardValue)} kazandınız.`,
    );
    await load();
  };

  const claimedCount = tasks.filter((t) => t.claimedAt).length;
  const completedCount = tasks.filter((t) => t.progress >= t.targetCount).length;
  const allClaimed = tasks.length > 0 && claimedCount === tasks.length;

  const pointsAvailable = useMemo(() => {
    const pendingTasks = sumTaskPoints(tasks.filter((task) => !task.claimedAt));
    const pendingSetBonus = allClaimed ? 0 : ALL_TASKS_TRUST_BONUS;
    return pendingTasks + pendingSetBonus;
  }, [tasks, allClaimed]);

  return (
    <GradientBackground>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.taskKey}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        ListHeaderComponent={
          <>
            <AuthHeader
              title="Günlük Görevler"
              subtitle={TASKS_SCREEN_SUBTITLE}
              showBack
            />

            {!loading && tasks.length > 0 ? (
              <TasksHeroCard
                total={tasks.length}
                completed={completedCount}
                claimed={claimedCount}
                pointsAvailable={pointsAvailable}
              />
            ) : null}

            <TasksBonusNote />

            <Pressable
              onPress={() => router.push(WALLET_POINTS_HISTORY_ROUTE as Href)}
              style={({ pressed }) => [
                styles.walletLink,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.walletIcon, { backgroundColor: `${colors.primary}16` }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.walletCopy}>
                <Text variant="label">Puan geçmişi</Text>
                <Text variant="caption" secondary>
                  {TASK_CLAIM_HINT}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            {!loading && tasks.length > 0 ? (
              <Text variant="label" style={styles.sectionTitle}>
                Görev listesi
              </Text>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onClaim={() => handleClaim(item.taskKey)}
            claiming={claimingKey === item.taskKey}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text variant="caption" secondary>
                Görevler yükleniyor…
              </Text>
            </View>
          ) : (
            <GlassCard style={styles.empty}>
              <Ionicons name="calendar-outline" size={28} color={colors.textMuted} />
              <Text variant="label">Görev bulunamadı</Text>
              <Text secondary variant="caption" style={styles.emptyHint}>
                Günlük görevler henüz tanımlanmamış veya geçici olarak kullanılamıyor.
              </Text>
            </GlassCard>
          )
        }
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
  },
  walletLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  loadingWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  emptyHint: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
