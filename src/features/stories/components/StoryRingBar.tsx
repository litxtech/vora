import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router, useIsFocused, type Href } from 'expo-router';
import { StoryRingAvatar } from '@/features/stories/components/StoryRingAvatar';
import { StoryRingSkeleton } from '@/features/stories/components/StoryRingSkeleton';
import { useStoryRings } from '@/features/stories/hooks/useStoryRings';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';
import { useStoryViewerStore } from '@/features/stories/store/storyViewerStore';
import type { StoryRing } from '@/features/stories/types';
import { shouldDeferStoryRingBar } from '@/lib/device/androidPerfProfile';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { sanitizeAvatarUrl } from '@/features/account-deletion/utils';

export function StoryRingBar() {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const { user, profile } = useAuth();
  const markUserSeen = useStoryRingStore((s) => s.markUserSeen);
  const [mounted, setMounted] = useState(!shouldDeferStoryRingBar());

  useEffect(() => {
    if (!shouldDeferStoryRingBar()) return;
    const task = deferBackgroundWork(() => setMounted(true));
    return () => task.cancel();
  }, []);

  const { rings, loading, refresh, loadMore } = useStoryRings({
    enabled: mounted && isFocused,
    viewerId: user?.id ?? null,
  });

  useEffect(() => {
    if (!mounted || !isFocused) return;
    void refresh();
  }, [isFocused, mounted, refresh]);

  const ownAvatar = sanitizeAvatarUrl(profile?.avatar_url ?? null, profile?.account_status ?? 'active');

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

  const data: (StoryRing | 'own')[] = user ? ['own', ...rings.filter((r) => r.userId !== user.id)] : rings;

  const renderRing = useCallback(
    (item: StoryRing | 'own') => {
      if (item === 'own') {
        const own = rings.find((r) => r.userId === user?.id);
        return (
          <StoryRingAvatar
            label="Hikayen"
            avatarUrl={ownAvatar}
            hasStory={!!own}
            hasUnseen={false}
            isOwn
            onPress={handleOwnPress}
            onAddPress={handleOwnAdd}
          />
        );
      }

      return (
        <StoryRingAvatar
          label={item.fullName?.trim() || item.username}
          avatarUrl={item.avatarUrl}
          hasStory
          hasUnseen={item.hasUnseen}
          onPress={() => {
            if (item.hasUnseen) markUserSeen(item.userId);
            handlePress(item);
          }}
        />
      );
    },
    [handleOwnAdd, handleOwnPress, handlePress, markUserSeen, ownAvatar, rings, user?.id],
  );

  const handleHorizontalScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      if (layoutMeasurement.width + contentOffset.x >= contentSize.width - 48) {
        void loadMore();
      }
    },
    [loadMore],
  );

  if (!mounted) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {loading && rings.length === 0 ? (
        <StoryRingSkeleton />
      ) : (
        <>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.list}
            onScroll={handleHorizontalScroll}
            scrollEventThrottle={200}
          >
            {data.map((item, index) => (
              <View key={item === 'own' ? 'own' : item.userId || `ring-${index}`}>{renderRing(item)}</View>
            ))}
          </ScrollView>
          {loading && rings.length > 0 ? (
            <View style={styles.inlineLoader}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing.xs,
    minHeight: 92,
  },
  list: {
    gap: spacing.sm,
  },
  inlineLoader: {
    position: 'absolute',
    right: spacing.md,
    top: 28,
  },
});
