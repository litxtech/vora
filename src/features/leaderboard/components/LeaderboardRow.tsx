import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedAuthorAvatar } from '@/features/feed/components/FeedAuthorAvatar';
import type { FeedAuthor } from '@/features/feed/types';
import {
  formatLeaderboardMinutes,
  leaderboardValueHint,
  type LeaderboardMetric,
} from '@/features/leaderboard/constants';
import type { LeaderboardEntry } from '@/features/leaderboard/types';
import { PlatformCharmTick } from '@/features/platform-charm/components/PlatformCharmTick';
import { PioneerBadge } from '@/features/pioneer/components/PioneerBadge';
import { formatCount } from '@/features/profile/constants';
import { navigateToPublicProfile } from '@/features/profile/services/profileNavigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

type LeaderboardRowProps = {
  entry: LeaderboardEntry;
  metric: LeaderboardMetric;
  highlight?: boolean;
};

function formatMetricValue(value: number, metric: LeaderboardMetric): string {
  if (metric === 'screen_time') {
    return formatLeaderboardMinutes(value);
  }
  if (metric === 'trust' || metric === 'contribution' || metric === 'badges') {
    return value.toLocaleString('tr-TR');
  }
  return formatCount(value);
}

function displayName(entry: LeaderboardEntry): string {
  return entry.fullName?.trim() || `@${entry.username}`;
}

export function LeaderboardRow({ entry, metric, highlight = false }: LeaderboardRowProps) {
  const { colors } = useTheme();
  const rankColor = entry.rank <= 3 ? RANK_COLORS[entry.rank - 1] : colors.textMuted;
  const valueHint = leaderboardValueHint(metric);

  const author: FeedAuthor = {
    id: entry.id,
    username: entry.username,
    fullName: entry.fullName,
    avatarUrl: entry.avatarUrl,
    role: entry.role,
    isVerified: entry.isVerified,
    isPlatformCharm: entry.isPlatformCharm,
    isPioneer: entry.isPioneer,
  };

  const openProfile = () => {
    navigateToPublicProfile({ userId: entry.id });
  };

  return (
    <Pressable onPress={openProfile} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <GlassCard
        style={[
          styles.card,
          highlight && {
            borderColor: `${colors.primary}66`,
            backgroundColor: `${colors.primary}12`,
          },
        ]}
        padded={false}
      >
        <View style={styles.row}>
          <View style={[styles.rankBadge, { backgroundColor: `${rankColor}22`, borderColor: `${rankColor}55` }]}>
            {entry.rank <= 3 ? (
              <Ionicons name="trophy" size={13} color={rankColor} />
            ) : (
              <Text variant="caption" style={[styles.rankText, { color: rankColor }]}>
                {entry.rank}
              </Text>
            )}
          </View>

          <FeedAuthorAvatar author={author} size={42} showRing={entry.isVerified} />

          <View style={styles.body}>
            <View style={styles.nameRow}>
              <Text variant="label" numberOfLines={1} style={styles.name}>
                {displayName(entry)}
              </Text>
              {entry.isVerified ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              ) : null}
            </View>
            <Text secondary variant="caption" numberOfLines={1}>
              @{entry.username}
            </Text>
            {metric === 'badges' ? (
              <View style={styles.badgeRow}>
                {entry.isPlatformCharm ? <PlatformCharmTick size={14} /> : null}
                {entry.isPioneer ? <PioneerBadge compact /> : null}
              </View>
            ) : null}
          </View>

          <View style={styles.valueCol}>
            <Text variant="label" style={{ color: colors.primary }} numberOfLines={1}>
              {formatMetricValue(entry.metricValue, metric)}
            </Text>
            <Text secondary variant="caption">
              {valueHint}
            </Text>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontWeight: '800',
    fontSize: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  valueCol: {
    alignItems: 'flex-end',
    gap: 1,
    minWidth: 72,
    flexShrink: 0,
  },
});
