import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { communityDetailPath } from '@/features/communities/constants';
import type { CommunityFeedItem } from '@/features/communities/types';
import { FeedPostCard } from '@/features/feed/components/FeedPostCard';
import type { FeedItem } from '@/features/feed/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type CommunityFeedCardProps = {
  item: CommunityFeedItem;
  onUpdate: (patch: Partial<FeedItem>) => void;
  onDeleted?: () => void;
};

export function CommunityFeedCard({ item, onUpdate, onDeleted }: CommunityFeedCardProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => router.push(communityDetailPath(item.community.id) as never)}
        style={[styles.communityRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {item.community.iconUrl ? (
          <Image source={{ uri: item.community.iconUrl }} style={styles.communityIcon} />
        ) : (
          <View style={[styles.communityIconFallback, { backgroundColor: `${colors.primary}22` }]}>
            <Ionicons name="people" size={14} color={colors.primary} />
          </View>
        )}
        <Text variant="caption" style={styles.communityName} numberOfLines={1}>
          {item.community.name}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </Pressable>
      <FeedPostCard item={item} onUpdate={onUpdate} onDeleted={onDeleted} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  communityIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
  },
  communityIconFallback: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityName: {
    flex: 1,
    fontWeight: '600',
  },
});
