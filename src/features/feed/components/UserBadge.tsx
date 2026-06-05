import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { BADGE_CONFIG } from '@/features/feed/constants';
import type { FeedAuthor } from '@/features/feed/types';
import { radius, spacing } from '@/constants/theme';

type UserBadgeProps = {
  author: FeedAuthor;
  showUsername?: boolean;
  timeLabel?: string;
};

export function UserBadge({ author, showUsername = true, timeLabel }: UserBadgeProps) {
  const roleBadge = BADGE_CONFIG[author.role];
  const displayName = author.fullName ?? `@${author.username}`;

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text variant="label">{author.username.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.meta}>
        <View style={styles.nameRow}>
          <Text variant="label" numberOfLines={1}>
            {showUsername ? displayName : `@${author.username}`}
          </Text>
          {author.isVerified ? (
            <Ionicons name="checkmark-circle" size={14} color="#1E88E5" />
          ) : null}
          {roleBadge ? (
            <View style={[styles.badge, { backgroundColor: `${roleBadge.color}22` }]}>
              <Ionicons
                name={roleBadge.icon as keyof typeof Ionicons.glyphMap}
                size={10}
                color={roleBadge.color}
              />
              <Text variant="caption" style={{ color: roleBadge.color, fontSize: 10 }}>
                {roleBadge.label}
              </Text>
            </View>
          ) : null}
          {timeLabel ? (
            <Text secondary variant="caption">
              · {timeLabel}
            </Text>
          ) : null}
        </View>
        {showUsername ? (
          <Text secondary variant="caption">
            @{author.username}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(30,136,229,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
});
