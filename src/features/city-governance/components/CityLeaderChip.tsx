import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { FeedAuthorAvatar } from '@/features/feed/components/FeedAuthorAvatar';
import { CITY_GOVERNANCE_ACCENT } from '@/features/city-governance/constants';
import type { CityLeaderSummary } from '@/features/city-governance/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type CityLeaderChipProps = {
  leader: CityLeaderSummary;
  compact?: boolean;
  onPress?: () => void;
};

export function CityLeaderChip({ leader, compact = false, onPress }: CityLeaderChipProps) {
  const { colors } = useTheme();
  const label = compact
    ? `${leader.fullName ?? leader.username} · ${leader.regionName} Lideri`
    : `${leader.regionName.toUpperCase()} LİDERİ`;

  const content = (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {!compact ? (
        <FeedAuthorAvatar
          author={{
            id: leader.userId,
            username: leader.username,
            fullName: leader.fullName,
            avatarUrl: leader.avatarUrl,
            role: 'user',
            isVerified: false,
          }}
          size={compact ? 28 : 56}
        />
      ) : null}
      <View style={styles.meta}>
        <View style={styles.titleRow}>
          <Text style={styles.crown}>👑</Text>
          <Text
            variant={compact ? 'caption' : 'label'}
            numberOfLines={1}
            style={[styles.title, compact && styles.titleCompact, { color: colors.text }]}
          >
            {label}
          </Text>
        </View>
        {!compact ? (
          <Text secondary variant="body" numberOfLines={1}>
            {leader.fullName ?? leader.username}
          </Text>
        ) : null}
      </View>
      {!compact ? (
        <View style={[styles.badge, { backgroundColor: `${CITY_GOVERNANCE_ACCENT}22` }]}>
          <Ionicons name="ribbon" size={14} color={CITY_GOVERNANCE_ACCENT} />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowCompact: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  crown: {
    fontSize: 14,
  },
  title: {
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  titleCompact: {
    fontWeight: '700',
    fontSize: 12,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
