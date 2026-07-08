import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { router, useIsFocused, type Href } from 'expo-router';
import { StoryRingAvatar } from '@/features/stories/components/StoryRingAvatar';
import { StoryRingSkeleton } from '@/features/stories/components/StoryRingSkeleton';
import { useStoryRings } from '@/features/stories/hooks/useStoryRings';
import { prefetchStoryBundle } from '@/features/stories/services/prefetchStoryBundle';
import { STORIES_FEATURE } from '@/features/stories/featureFlags';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';
import { useStoryViewerStore } from '@/features/stories/store/storyViewerStore';
import type { StoryRing } from '@/features/stories/types';
import { getStoryRingMountDelayMs, shouldDeferStoryRingBar } from '@/lib/device/androidPerfProfile';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { sanitizeAvatarUrl } from '@/features/account-deletion/utils';

type RingListItem = StoryRing | 'own';

function ringKey(item: RingListItem, index: number): string {
  if (item === 'own') return 'own';
  return item.userId || `ring-${index}`;
}

type AnimatedRingItemProps = {
  index: number;
  isEntering: boolean;
  children: ReactNode;
};

function AnimatedRingItem({ index, isEntering, children }: AnimatedRingItemProps) {
  if (!isEntering) {
    return <View>{children}</View>;
  }

  return (
    <Animated.View
      entering={FadeInRight.delay(Math.min(index * 35, 220))
        .springify()
        .damping(18)
        .stiffness(240)}
    >
      {children}
    </Animated.View>
  );
}

export function StoryRingBar() {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const { user, profile } = useAuth();
  const bundlePrefetchEnabled = useFeatureVisible(STORIES_FEATURE.ringBundlePrefetch);
  const ringBootstrapEnabled = useFeatureVisible(STORIES_FEATURE.ringBootstrap);
  const cachedRingCount = useStoryRingStore((s) => s.rings.length);
  const enteringUserIds = useStoryRingStore((s) => s.enteringUserIds);
  const clearEnteringUserIds = useStoryRingStore((s) => s.clearEnteringUserIds);
  const markUserSeen = useStoryRingStore((s) => s.markUserSeen);
  const [mounted, setMounted] = useState(() => cachedRingCount > 0 || !shouldDeferStoryRingBar());

  useEffect(() => {
    if (mounted || cachedRingCount === 0) return;
    setMounted(true);
  }, [cachedRingCount, mounted]);

  useEffect(() => {
    if (mounted) return;

    const delayMs = cachedRingCount > 0 ? 0 : getStoryRingMountDelayMs();
    if (!shouldDeferStoryRingBar() && delayMs === 0) {
      setMounted(true);
      return;
    }

    let cancelled = false;
    const mount = () => {
      if (!cancelled) setMounted(true);
    };

    if (delayMs > 0) {
      const timer = setTimeout(mount, delayMs);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    const task = deferBackgroundWork(mount);
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [cachedRingCount, mounted]);

  useEffect(() => {
    if (enteringUserIds.length === 0) return;
    const timer = setTimeout(() => clearEnteringUserIds(), 700);
    return () => clearTimeout(timer);
  }, [clearEnteringUserIds, enteringUserIds]);

  const { rings, loading, loadMore } = useStoryRings({
    enabled: mounted && isFocused,
    viewerId: user?.id ?? null,
    useCache: ringBootstrapEnabled,
  });

  const ownAvatar = sanitizeAvatarUrl(profile?.avatar_url ?? null, profile?.account_status ?? 'active');
  const enteringSet = useMemo(() => new Set(enteringUserIds), [enteringUserIds]);

  const openViewer = useCallback(
    (startUserId: string) => {
      const ringUserIds = rings.map((r) => r.userId).filter(Boolean);
      if (!ringUserIds.includes(startUserId)) ringUserIds.unshift(startUserId);

      const viewerId = user?.id ?? null;
      if (bundlePrefetchEnabled) {
        prefetchStoryBundle(viewerId, startUserId);
        const startIndex = ringUserIds.indexOf(startUserId);
        if (startIndex > 0) prefetchStoryBundle(viewerId, ringUserIds[startIndex - 1]!);
        if (startIndex >= 0 && startIndex < ringUserIds.length - 1) {
          prefetchStoryBundle(viewerId, ringUserIds[startIndex + 1]!);
        }
      }

      useStoryViewerStore.getState().openSession({ ringUserIds, startUserId });
      router.push(`/stories/${startUserId}` as Href);
    },
    [bundlePrefetchEnabled, rings, user?.id],
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

  const data = useMemo<RingListItem[]>(() => {
    const validRings = rings.filter((ring) => Boolean(ring.userId));
    if (!user) return validRings;
    return ['own', ...validRings.filter((ring) => ring.userId !== user.id)];
  }, [rings, user]);

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

  if (!loading && data.length === 0) {
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
            {data.map((item, index) => {
              const key = ringKey(item, index);
              const isEntering = item !== 'own' && enteringSet.has(item.userId);

              if (item === 'own') {
                const own = rings.find((r) => r.userId === user?.id);
                return (
                  <AnimatedRingItem key={key} index={index} isEntering={false}>
                    <StoryRingAvatar
                      label="Hikayen"
                      avatarUrl={ownAvatar}
                      hasStory={!!own}
                      hasUnseen={!!own}
                      isOwn
                      onPress={handleOwnPress}
                      onAddPress={handleOwnAdd}
                    />
                  </AnimatedRingItem>
                );
              }

              return (
                <AnimatedRingItem key={key} index={index} isEntering={isEntering}>
                  <StoryRingAvatar
                    label={item.fullName?.trim() || item.username || 'Kullanıcı'}
                    avatarUrl={item.avatarUrl}
                    hasStory
                    hasUnseen={item.hasUnseen}
                    onPress={() => {
                      if (item.hasUnseen) markUserSeen(item.userId);
                      handlePress(item);
                    }}
                  />
                </AnimatedRingItem>
              );
            })}
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
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineLoader: {
    position: 'absolute',
    right: spacing.md,
    top: 28,
  },
});
