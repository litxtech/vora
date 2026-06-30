import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { LeaderboardRow } from '@/features/leaderboard/components/LeaderboardRow';
import {
  LEADERBOARD_BADGE_FILTERS,
  LEADERBOARD_METRICS,
  LEADERBOARD_SUBTITLE,
  LEADERBOARD_TITLE,
  formatLeaderboardMinutes,
  leaderboardMetricLabel,
  leaderboardValueHint,
  type LeaderboardBadgeFilter,
  type LeaderboardMetric,
} from '@/features/leaderboard/constants';
import { fetchLeaderboard } from '@/features/leaderboard/services/leaderboardData';
import type { LeaderboardEntry, LeaderboardViewerRank } from '@/features/leaderboard/types';
import { formatCount } from '@/features/profile/constants';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function formatViewerValue(value: number, metric: LeaderboardMetric): string {
  if (metric === 'screen_time') {
    return formatLeaderboardMinutes(value);
  }
  if (metric === 'trust' || metric === 'contribution' || metric === 'badges') {
    return value.toLocaleString('tr-TR');
  }
  return formatCount(value);
}

function ViewerRankCard({
  metric,
  viewer,
}: {
  metric: LeaderboardMetric;
  viewer: LeaderboardViewerRank;
}) {
  const { colors } = useTheme();

  return (
    <GlassCard style={[styles.viewerCard, { borderColor: `${colors.primary}44` }]} padded={false}>
      <View style={styles.viewerRow}>
        <View style={[styles.viewerIcon, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.viewerBody}>
          <Text variant="caption" secondary>
            Senin sıran
          </Text>
          <Text variant="h3" style={{ color: colors.primary }}>
            #{viewer.rank.toLocaleString('tr-TR')}
          </Text>
        </View>
        <View style={styles.viewerValue}>
          <Text variant="label">{formatViewerValue(viewer.metricValue, metric)}</Text>
          <Text secondary variant="caption">
            {leaderboardValueHint(metric)}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

export function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [metric, setMetric] = useState<LeaderboardMetric>('trust');
  const [badgeFilter, setBadgeFilter] = useState<LeaderboardBadgeFilter>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [viewer, setViewer] = useState<LeaderboardViewerRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const result = await fetchLeaderboard({
      metric,
      badgeFilter: metric === 'badges' ? badgeFilter : undefined,
    });
    setEntries(result.entries);
    setViewer(result.viewer);
  }, [metric, badgeFilter]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void load().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      <AuthHeader title={LEADERBOARD_TITLE} subtitle={LEADERBOARD_SUBTITLE} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {LEADERBOARD_METRICS.map((item) => {
          const active = metric === item.id;
          return (
            <Pressable
              key={item.id}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surfaceElevated,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setMetric(item.id)}
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={active ? '#fff' : colors.textSecondary}
              />
              <Text
                variant="caption"
                style={{
                  color: active ? '#fff' : colors.textSecondary,
                  fontWeight: '600',
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {metric === 'badges' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgeChipRow}
        >
          {LEADERBOARD_BADGE_FILTERS.map((item) => {
            const active = badgeFilter === item.id;
            return (
              <Pressable
                key={item.id}
                style={[
                  styles.badgeChip,
                  {
                    backgroundColor: active ? `${colors.accent}22` : colors.surfaceElevated,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setBadgeFilter(item.id)}
              >
                <Text
                  variant="caption"
                  style={{
                    color: active ? colors.accent : colors.textSecondary,
                    fontWeight: '600',
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Text secondary variant="caption" style={styles.sectionHint}>
        {leaderboardMetricLabel(metric)} · İlk {entries.length || 50} kullanıcı
      </Text>

      {viewer && user ? <ViewerRankCard metric={metric} viewer={viewer} /> : null}
    </View>
  );

  return (
    <GradientBackground>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LeaderboardRow
            entry={item}
            metric={metric}
            highlight={user?.id === item.id}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Ionicons name="trophy-outline" size={28} color={colors.textMuted} />
              <Text variant="label">Henüz sıralama yok</Text>
              <Text secondary variant="caption" style={styles.emptyText}>
                Bu ölçütte listelenecek kullanıcı bulunamadı.
              </Text>
            </GlassCard>
          )
        }
        contentContainerStyle={[
          styles.page,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
  },
  headerBlock: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chipRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badgeChipRow: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  badgeChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  sectionHint: {
    marginTop: spacing.xs,
  },
  viewerCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  viewerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerBody: {
    flex: 1,
    gap: 2,
  },
  viewerValue: {
    alignItems: 'flex-end',
    gap: 1,
  },
  separator: {
    height: spacing.sm,
  },
  emptyWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.md,
  },
  emptyText: {
    textAlign: 'center',
  },
});
