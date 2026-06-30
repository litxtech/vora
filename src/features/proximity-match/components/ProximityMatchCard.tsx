import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import type { ProximityMatchedUser } from '@/features/proximity-match/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProximityMatchCardProps = {
  match: ProximityMatchedUser;
  onPress: () => void;
};

function displayName(match: ProximityMatchedUser): string {
  return match.fullName?.trim() || match.username;
}

function formatMatchedDate(value: string): { date: string; time: string } {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: '', time: '' };
  }

  return {
    date: parsed.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    time: parsed.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function ProximityMatchCard({ match, onPress }: ProximityMatchCardProps) {
  const { colors } = useTheme();
  const name = displayName(match);
  const { date, time } = formatMatchedDate(match.matchedAt);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name} profilini aç`}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
    >
      <ProfileAvatar
        username={match.username}
        avatarUrl={match.avatarUrl}
        size={52}
        isVerified={match.isVerified}
      />

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text variant="label" numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {match.isVerified ? (
            <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
          ) : null}
        </View>
        <Text secondary variant="caption" numberOfLines={1} style={styles.username}>
          @{match.username}
        </Text>
      </View>

      <View style={styles.trailing}>
        {date ? (
          <Text variant="caption" style={[styles.date, { color: colors.textSecondary }]}>
            {date}
          </Text>
        ) : null}
        {time ? (
          <Text variant="caption" style={{ color: colors.textMuted, fontSize: 11 }}>
            {time}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
    </Pressable>
  );
}

export function ProximityMatchRowSeparator() {
  const { colors } = useTheme();
  return <View style={[styles.separator, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    flexShrink: 1,
    fontWeight: '600',
  },
  username: {
    fontSize: 13,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 72,
  },
  date: {
    fontWeight: '500',
    fontSize: 12,
  },
  chevron: {
    marginLeft: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52 + spacing.md + spacing.xs,
  },
});
