import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { formatCount } from '@/features/profile/constants';
import type { ProfileStats } from '@/features/profile/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileStatsRowProps = {
  userId: string;
  stats: ProfileStats;
};

type StatItem = {
  key: string;
  label: string;
  value: number;
  onPress?: () => void;
};

function SocialStat({ item }: { item: StatItem }) {
  const { colors } = useTheme();

  const content = (
    <Text style={styles.socialText}>
      <Text style={[styles.socialValue, { color: colors.text }]}>{formatCount(item.value)}</Text>
      <Text style={[styles.socialLabel, { color: colors.textSecondary }]}> {item.label}</Text>
    </Text>
  );

  if (!item.onPress) {
    return <View style={styles.socialItem}>{content}</View>;
  }

  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [styles.socialItem, { opacity: pressed ? 0.6 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

export function ProfileStatsRow({ userId, stats }: ProfileStatsRowProps) {
  const socialItems: StatItem[] = [
    {
      key: 'following',
      label: 'Takip',
      value: stats.followingCount,
      onPress: () => router.push(`/user/${userId}/following` as never),
    },
    {
      key: 'followers',
      label: 'Takipçi',
      value: stats.followerCount,
      onPress: () => router.push(`/user/${userId}/followers` as never),
    },
    {
      key: 'friends',
      label: 'Arkadaş',
      value: stats.friendCount,
      onPress: () => router.push(`/user/${userId}/friends` as never),
    },
  ];

  return (
    <View style={styles.socialRow}>
      {socialItems.map((item) => (
        <SocialStat key={item.key} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: spacing.lg,
    rowGap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  socialItem: {
    paddingVertical: 2,
  },
  socialText: {
    fontSize: 14,
    lineHeight: 20,
  },
  socialValue: {
    fontWeight: '700',
  },
  socialLabel: {
    fontWeight: '400',
  },
});
