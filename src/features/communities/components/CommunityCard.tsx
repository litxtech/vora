import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { communityCategoryLabel, communityDetailPath } from '@/features/communities/constants';
import type { Community } from '@/features/communities/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type CommunityCardProps = {
  community: Community;
};

export const CommunityCard = memo(function CommunityCard({ community }: CommunityCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={() => router.push(communityDetailPath(community.id) as never)}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: `${colors.primary}22` }]}>
            {community.iconUrl ? (
              <OptimizedImage
                uri={community.iconUrl}
                tier="thumb"
                layoutWidth={44}
                recyclingKey={community.id}
                style={styles.iconImage}
                transition={0}
              />
            ) : (
              <Ionicons name="people" size={22} color={colors.primary} />
            )}
          </View>
          <View style={styles.info}>
            <Text variant="label" numberOfLines={1}>
              {community.name}
            </Text>
            <Text variant="caption" secondary>
              {communityCategoryLabel(community.category)} · {community.memberCount} üye · {community.postCount} gönderi
            </Text>
          </View>
          {community.isMember ? (
            <View style={[styles.memberBadge, { backgroundColor: `${colors.success}22` }]}>
              <Text variant="caption" style={{ color: colors.success }}>
                Üye
              </Text>
            </View>
          ) : null}
        </View>
        {community.description ? (
          <Text secondary variant="caption" numberOfLines={2}>
            {community.description}
          </Text>
        ) : null}
      </GlassCard>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  memberBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
});
