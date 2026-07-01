import { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { StoryRingAvatar } from '@/features/stories/components/StoryRingAvatar';
import { useStoryRings } from '@/features/stories/hooks/useStoryRings';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';
import { useStoryViewerStore } from '@/features/stories/store/storyViewerStore';
import type { StoryRing } from '@/features/stories/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type StoryRingBarProps = {
  regionId?: string | null;
};

export function StoryRingBar({ regionId }: StoryRingBarProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const markUserSeen = useStoryRingStore((s) => s.markUserSeen);
  const { rings, loading, loadMore } = useStoryRings({
    enabled: true,
    viewerId: user?.id ?? null,
    regionId: regionId ?? null,
  });

  const openViewer = useCallback(
    (startUserId: string) => {
      const ringUserIds = rings.map((r) => r.userId);
      if (!ringUserIds.includes(startUserId)) ringUserIds.unshift(startUserId);
      useStoryViewerStore.getState().openSession({ ringUserIds, startUserId });
      router.push(`/stories/${startUserId}` as Href);
    },
    [rings],
  );

  const handlePress = useCallback(
    (ring: StoryRing) => {
      openViewer(ring.userId);
    },
    [openViewer],
  );

  const handleOwnAdd = useCallback(() => {
    router.push('/capture?mode=story' as Href);
  }, []);

  const handleOwnPress = useCallback(() => {
    const own = rings.find((r) => r.userId === user?.id);
    if (own) {
      openViewer(own.userId);
      return;
    }
    handleOwnAdd();
  }, [handleOwnAdd, openViewer, rings, user?.id]);

  const renderItem = useCallback(
    ({ item }: { item: StoryRing | 'own' }) => {
      if (item === 'own') {
        const own = rings.find((r) => r.userId === user?.id);
        return (
          <StoryRingAvatar
            label="Hikayen"
            coverUrl={own?.previewThumb ?? user?.user_metadata?.avatar_url ?? null}
            hasUnseen={false}
            isOwn
            hasOwnStory={!!own}
            onPress={handleOwnPress}
            onAddPress={handleOwnAdd}
          />
        );
      }

      return (
        <StoryRingAvatar
          label={item.fullName?.trim() || item.username}
          coverUrl={item.previewThumb ?? item.avatarUrl}
          hasUnseen={item.hasUnseen}
          onPress={() => {
            if (item.hasUnseen) markUserSeen(item.userId);
            handlePress(item);
          }}
        />
      );
    },
    [handleOwnAdd, handleOwnPress, handlePress, markUserSeen, rings, user?.id, user?.user_metadata?.avatar_url],
  );

  const data: (StoryRing | 'own')[] = user ? ['own', ...rings.filter((r) => r.userId !== user.id)] : rings;

  if (!loading && data.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {loading && rings.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => (item === 'own' ? 'own' : item.userId)}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.6}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  loading: {
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
