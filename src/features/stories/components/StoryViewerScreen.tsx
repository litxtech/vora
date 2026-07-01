import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StoryInsightsSheet } from '@/features/stories/components/StoryInsightsSheet';
import { StoryProgressBars } from '@/features/stories/components/StoryProgressBars';
import { StoryReplyBar } from '@/features/stories/components/StoryReplyBar';
import { StorySlide } from '@/features/stories/components/StorySlide';
import { STORY_PHOTO_DURATION_MS, STORY_USER_TRANSITION_MS } from '@/features/stories/constants';
import { useStoryAutoAdvance } from '@/features/stories/hooks/useStoryAutoAdvance';
import { fetchStoryBundle } from '@/features/stories/services/fetchStoryBundle';
import { fetchStoryInsights } from '@/features/stories/services/fetchStoryInsights';
import { recordStoryView } from '@/features/stories/services/recordStoryView';
import { markStoryUserSeen } from '@/features/stories/services/storySeenCache';
import { sendStoryReply } from '@/features/stories/services/sendStoryReply';
import { toggleStoryReaction } from '@/features/stories/services/storyReactions';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';
import { useStoryViewerStore } from '@/features/stories/store/storyViewerStore';
import type { StoryBundle, StoryInsights, StoryItem, StoryNavigation } from '@/features/stories/types';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { Text } from '@/components/ui/Text';
import { useFeedVideoPlaybackStore } from '@/features/feed/store/feedVideoPlaybackStore';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.18;

type StoryViewerScreenProps = {
  userId: string;
};

export function StoryViewerScreen({ userId }: StoryViewerScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const session = useStoryViewerStore((s) => s.session);
  const bundles = useStoryViewerStore((s) => s.bundles);
  const currentUserIndex = useStoryViewerStore((s) => s.currentUserIndex);
  const currentItemIndex = useStoryViewerStore((s) => s.currentItemIndex);
  const setBundle = useStoryViewerStore((s) => s.setBundle);
  const setCurrentUserIndex = useStoryViewerStore((s) => s.setCurrentUserIndex);
  const setCurrentItemIndex = useStoryViewerStore((s) => s.setCurrentItemIndex);
  const clearViewer = useStoryViewerStore((s) => s.clear);
  const markRingSeen = useStoryRingStore((s) => s.markUserSeen);

  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [insightsVisible, setInsightsVisible] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insights, setInsights] = useState<StoryInsights | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [reacted, setReacted] = useState(false);

  const slideEnteredAtRef = useRef<number>(Date.now());
  const transitionX = useSharedValue(0);
  const deckOpacity = useSharedValue(1);

  const ringUserIds = session?.ringUserIds ?? [userId];
  const activeUserId = ringUserIds[currentUserIndex] ?? userId;
  const bundle = bundles[activeUserId];
  const items = bundle?.items ?? [];
  const activeItem: StoryItem | null = items[currentItemIndex] ?? null;
  const isOwnStory = !!user?.id && bundle?.authorId === user.id;

  useEffect(() => {
    useFeedVideoPlaybackStore.getState().clear();
    return () => {
      clearViewer();
    };
  }, [clearViewer]);

  useEffect(() => {
    if (!session) {
      useStoryViewerStore.getState().openSession({ ringUserIds: [userId], startUserId: userId });
    }
  }, [ringUserIds, session, userId]);

  const loadBundle = useCallback(
    async (authorId: string) => {
      const data = await fetchStoryBundle(user?.id ?? null, authorId);
      setBundle(authorId, data);
      return data;
    },
    [setBundle, user?.id],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const data = await loadBundle(activeUserId);
      if (cancelled) return;
      setLoading(false);
      if (!data || data.items.length === 0) {
        if (currentUserIndex < ringUserIds.length - 1) {
          setCurrentUserIndex(currentUserIndex + 1);
        } else {
          router.back();
        }
        return;
      }
      const prefetchIds = [ringUserIds[currentUserIndex - 1], ringUserIds[currentUserIndex + 1]].filter(
        Boolean,
      ) as string[];
      for (const id of prefetchIds) {
        if (!useStoryViewerStore.getState().bundles[id]) void loadBundle(id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeUserId, currentUserIndex, loadBundle, ringUserIds, setCurrentUserIndex]);

  useEffect(() => {
    setProgress(0);
    slideEnteredAtRef.current = Date.now();
    setReacted(activeItem?.hasReacted ?? false);
  }, [activeItem?.hasReacted, activeItem?.id]);

  const expectedDurationSec = useMemo(() => {
    if (!activeItem) return STORY_PHOTO_DURATION_MS / 1000;
    if (activeItem.mediaType === 'video') return activeItem.durationSec ?? 15;
    return STORY_PHOTO_DURATION_MS / 1000;
  }, [activeItem]);

  const flushView = useCallback(
    async (navigation: StoryNavigation, exitedEarly = false) => {
      if (!user?.id || !activeItem || isOwnStory) return;
      const watchedSeconds = (Date.now() - slideEnteredAtRef.current) / 1000;
      const watchCompletion = Math.min(1, watchedSeconds / Math.max(0.1, expectedDurationSec));
      await recordStoryView({
        viewerId: user.id,
        storyItemId: activeItem.id,
        watchedSeconds,
        watchCompletion,
        navigation,
        exitedEarly,
      });
    },
    [activeItem, expectedDurationSec, isOwnStory, user?.id],
  );

  const animateUserTransition = useCallback(
    (direction: 1 | -1, after: () => void) => {
      transitionX.value = withTiming(direction * -SCREEN_WIDTH * 0.22, { duration: STORY_USER_TRANSITION_MS });
      deckOpacity.value = withTiming(0.88, { duration: STORY_USER_TRANSITION_MS }, () => {
        runOnJS(after)();
        transitionX.value = direction * SCREEN_WIDTH * 0.18;
        transitionX.value = withTiming(0, { duration: STORY_USER_TRANSITION_MS });
        deckOpacity.value = withTiming(1, { duration: STORY_USER_TRANSITION_MS });
      });
    },
    [deckOpacity, transitionX],
  );

  const goNextItem = useCallback(
    (navigation: StoryNavigation) => {
      void flushView(navigation);
      if (!items.length) return;
      if (currentItemIndex < items.length - 1) {
        setCurrentItemIndex(currentItemIndex + 1);
        return;
      }
      void markStoryUserSeen(activeUserId);
      markRingSeen(activeUserId);
      if (currentUserIndex < ringUserIds.length - 1) {
        animateUserTransition(1, () => setCurrentUserIndex(currentUserIndex + 1));
        return;
      }
      void flushView('manual_close', true);
      router.back();
    },
    [
      activeUserId,
      animateUserTransition,
      currentItemIndex,
      currentUserIndex,
      flushView,
      items.length,
      markRingSeen,
      ringUserIds.length,
      setCurrentItemIndex,
      setCurrentUserIndex,
    ],
  );

  const goPrevItem = useCallback(
    (navigation: StoryNavigation) => {
      void flushView(navigation, true);
      if (currentItemIndex > 0) {
        setCurrentItemIndex(currentItemIndex - 1);
        return;
      }
      if (currentUserIndex > 0) {
        animateUserTransition(-1, () => {
          const prevUserId = ringUserIds[currentUserIndex - 1];
          const prevBundle = useStoryViewerStore.getState().bundles[prevUserId];
          const lastIndex = Math.max(0, (prevBundle?.items.length ?? 1) - 1);
          setCurrentUserIndex(currentUserIndex - 1);
          setCurrentItemIndex(lastIndex);
        });
      }
    },
    [
      animateUserTransition,
      currentItemIndex,
      currentUserIndex,
      flushView,
      ringUserIds,
      setCurrentItemIndex,
      setCurrentUserIndex,
    ],
  );

  const goNextUser = useCallback(
    (navigation: StoryNavigation) => {
      void flushView(navigation, true);
      if (currentUserIndex < ringUserIds.length - 1) {
        void markStoryUserSeen(activeUserId);
        markRingSeen(activeUserId);
        animateUserTransition(1, () => setCurrentUserIndex(currentUserIndex + 1));
        return;
      }
      router.back();
    },
    [
      activeUserId,
      animateUserTransition,
      currentUserIndex,
      flushView,
      markRingSeen,
      ringUserIds.length,
      setCurrentUserIndex,
    ],
  );

  const goPrevUser = useCallback(
    (navigation: StoryNavigation) => {
      void flushView(navigation, true);
      if (currentUserIndex > 0) {
        animateUserTransition(-1, () => setCurrentUserIndex(currentUserIndex - 1));
      }
    },
    [animateUserTransition, currentUserIndex, flushView, setCurrentUserIndex],
  );

  const [videoPositionSec, setVideoPositionSec] = useState(0);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);

  useStoryAutoAdvance({
    item: activeItem,
    isActive: !loading && !!activeItem,
    isPaused,
    onComplete: () => goNextItem('auto_forward'),
    onProgress: setProgress,
    videoPositionSec,
    videoDurationSec,
  });

  const deckStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: transitionX.value }],
    opacity: deckOpacity.value,
  }));

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      if (e.translationX <= -SWIPE_THRESHOLD) {
        runOnJS(goNextUser)('swipe_forward');
      } else if (e.translationX >= SWIPE_THRESHOLD) {
        runOnJS(goPrevUser)('swipe_back');
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(180)
    .onStart(() => runOnJS(setIsPaused)(true))
    .onFinalize(() => runOnJS(setIsPaused)(false));

  const composedGesture = Gesture.Simultaneous(panGesture, longPressGesture);

  const handleReply = async (text: string) => {
    if (!user?.id || !bundle || !activeItem) return;
    setSendingReply(true);
    try {
      await sendStoryReply({
        senderId: user.id,
        recipientId: bundle.authorId,
        storyItemId: activeItem.id,
        storyThumbUrl: activeItem.thumbUrl,
        storyAuthorUsername: bundle.username,
        text,
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleReaction = async () => {
    if (!user?.id || !activeItem) return;
    const result = await toggleStoryReaction(activeItem.id, user.id, reacted);
    if (!result.error) setReacted(result.hasReacted);
  };

  const openInsights = async () => {
    if (!bundle || !user?.id) return;
    setInsightsVisible(true);
    setInsightsLoading(true);
    try {
      const data = await fetchStoryInsights(bundle.authorId, bundle.storyId);
      setInsights(data);
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading && !bundle) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.deck, deckStyle]}>
          {activeItem ? (
            <StorySlide
              item={activeItem}
              isActive={!loading && !isPaused}
              isPaused={isPaused}
              onVideoPosition={(sec, dur) => {
                setVideoPositionSec(sec);
                setVideoDurationSec(dur);
              }}
              onVideoEnd={() => goNextItem('auto_forward')}
            />
          ) : null}
        </Animated.View>
      </GestureDetector>

      <Pressable style={styles.tapLeft} onPress={() => goPrevItem('tap_back')} />
      <Pressable style={styles.tapRight} onPress={() => goNextItem('tap_forward')} />

      <View style={[styles.top, { paddingTop: insets.top + spacing.xs }]} pointerEvents="box-none">
        <StoryProgressBars total={items.length} activeIndex={currentItemIndex} progress={progress} />
        <View style={styles.topRow}>
          {bundle ? (
            <View style={styles.authorRow}>
              <ProfileAvatar username={bundle.username} avatarUrl={bundle.avatarUrl} size={34} isVerified={bundle.isVerified} />
              <Text variant="label" style={styles.authorName}>
                {bundle.fullName?.trim() || bundle.username}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.replyWrap} pointerEvents="box-none">
        <StoryReplyBar
          hasReacted={reacted}
          isOwnStory={isOwnStory}
          sending={sendingReply}
          onSend={handleReply}
          onToggleReaction={handleReaction}
          onOpenInsights={openInsights}
        />
      </View>

      <StoryInsightsSheet
        visible={insightsVisible}
        insights={insights}
        loading={insightsLoading}
        initialItemIndex={currentItemIndex}
        onClose={() => setInsightsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  deck: {
    ...StyleSheet.absoluteFillObject,
  },
  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 100,
    bottom: 120,
    width: '38%',
    zIndex: 5,
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 100,
    bottom: 120,
    width: '62%',
    zIndex: 5,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 6,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorName: {
    color: '#fff',
  },
  replyWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 8,
  },
  loading: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
