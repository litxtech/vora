import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
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
import { StickyKeyboardFooter } from '@/components/keyboard';
import { StoryInsightsSheet } from '@/features/stories/components/StoryInsightsSheet';
import { StoryProgressBars } from '@/features/stories/components/StoryProgressBars';
import { StoryReplyBar } from '@/features/stories/components/StoryReplyBar';
import { StorySlide } from '@/features/stories/components/StorySlide';
import { STORY_PHOTO_DURATION_MS, STORY_USER_TRANSITION_MS, STORY_CARD_RADIUS, STORY_CARD_HORIZONTAL_INSET, STORY_CARD_TOP_GAP, STORY_CARD_BOTTOM_GAP } from '@/features/stories/constants';
import { useStoryAutoAdvance } from '@/features/stories/hooks/useStoryAutoAdvance';
import { useStoryKeyboardHeight } from '@/features/stories/hooks/useStoryKeyboardHeight';
import { deleteStoryItem } from '@/features/stories/services/deleteStoryItem';
import { fetchStoryBundle } from '@/features/stories/services/fetchStoryBundle';
import { fetchStoryRings } from '@/features/stories/services/fetchStoryRings';
import { fetchStoryInsights } from '@/features/stories/services/fetchStoryInsights';
import { recordStoryView } from '@/features/stories/services/recordStoryView';
import { markStoryUserSeen } from '@/features/stories/services/storySeenCache';
import { sendStoryReply } from '@/features/stories/services/sendStoryReply';
import { toggleStoryReaction } from '@/features/stories/services/storyReactions';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';
import { useStoryViewerStore } from '@/features/stories/store/storyViewerStore';
import type { StoryBundle, StoryInsights, StoryItem, StoryNavigation } from '@/features/stories/types';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { navigateToPublicProfile } from '@/features/profile/services/profileNavigation';
import { Text } from '@/components/ui/Text';
import { useFeedVideoPlaybackStore } from '@/features/feed/store/feedVideoPlaybackStore';
import { Image } from 'expo-image';
import { resolveStoryMediaUrl } from '@/features/stories/services/storyMediaUrl';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.18;
const SWIPE_UP_THRESHOLD = 56;
const SWIPE_DOWN_THRESHOLD = 72;
const SWIPE_DOWN_VELOCITY = 850;

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
  const [replyBarHeight, setReplyBarHeight] = useState(56);
  const [inputFocused, setInputFocused] = useState(false);
  const [videoPositionSec, setVideoPositionSec] = useState(0);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);

  const replyInputRef = useRef<TextInput>(null);
  const inputFocusedRef = useRef(false);

  useEffect(() => {
    inputFocusedRef.current = inputFocused;
  }, [inputFocused]);

  const dismissReplyKeyboard = useCallback(() => {
    replyInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  const keyboardHeight = useStoryKeyboardHeight();
  const keyboardLift = useSharedValue(0);

  useEffect(() => {
    const lift = inputFocused ? keyboardHeight + replyBarHeight : 0;
    keyboardLift.value = withTiming(lift, { duration: 220 });
  }, [inputFocused, keyboardHeight, keyboardLift, replyBarHeight]);

  const slideEnteredAtRef = useRef<number>(Date.now());
  const transitionX = useSharedValue(0);
  const deckOpacity = useSharedValue(1);
  const dismissY = useSharedValue(0);
  const insightsOpen = useSharedValue(0);
  const isOwnStorySv = useSharedValue(0);

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
    if (!activeItem) return;
    const next = items[currentItemIndex + 1];
    if (!next) return;
    const uri = resolveStoryMediaUrl(next.mediaType === 'image' ? next.mediaUrl : next.thumbUrl ?? next.mediaUrl);
    if (uri) void Image.prefetch(uri);
  }, [activeItem?.id, currentItemIndex, items]);

  useEffect(() => {
    insightsOpen.value = insightsVisible ? 1 : 0;
  }, [insightsOpen, insightsVisible]);

  useEffect(() => {
    isOwnStorySv.value = isOwnStory ? 1 : 0;
  }, [isOwnStory, isOwnStorySv]);

  useEffect(() => {
    dismissY.value = 0;
  }, [activeItem?.id, dismissY]);

  useEffect(() => {
    setProgress(0);
    setVideoPositionSec(0);
    setVideoDurationSec(null);
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

  const closeViewer = useCallback(() => {
    void flushView('manual_close', true);
    router.back();
  }, [flushView]);

  const animateUserTransition = useCallback(
    (direction: 1 | -1, after: () => void) => {
      dismissY.value = 0;
      transitionX.value = withTiming(direction * -SCREEN_WIDTH * 0.22, { duration: STORY_USER_TRANSITION_MS });
      deckOpacity.value = withTiming(0.88, { duration: STORY_USER_TRANSITION_MS }, () => {
        runOnJS(after)();
        transitionX.value = direction * SCREEN_WIDTH * 0.18;
        transitionX.value = withTiming(0, { duration: STORY_USER_TRANSITION_MS });
        deckOpacity.value = withTiming(1, { duration: STORY_USER_TRANSITION_MS });
      });
    },
    [deckOpacity, dismissY, transitionX],
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

  const resumePlaybackIfAllowed = useCallback(() => {
    if (!inputFocusedRef.current && !insightsVisible) {
      setIsPaused(false);
    }
  }, [insightsVisible]);

  useStoryAutoAdvance({
    item: activeItem,
    isActive: !loading && !!activeItem && !insightsVisible,
    isPaused,
    onComplete: () => goNextItem('auto_forward'),
    onProgress: setProgress,
    videoPositionSec,
    videoDurationSec,
  });

  const openInsights = useCallback(async () => {
    if (!bundle || !user?.id) return;
    setIsPaused(true);
    setInsightsVisible(true);
    setInsightsLoading(true);
    try {
      const data = await fetchStoryInsights(bundle.authorId, bundle.storyId);
      setInsights(data);
    } finally {
      setInsightsLoading(false);
    }
  }, [bundle, user?.id]);

  const deckStyle = useAnimatedStyle(() => {
    const dragProgress = Math.min(1, Math.max(0, dismissY.value) / 240);
    return {
      transform: [
        { translateX: transitionX.value },
        { translateY: dismissY.value },
        { scale: 1 - dragProgress * 0.06 },
      ],
      opacity: deckOpacity.value * (1 - dragProgress * 0.45),
    };
  });

  const contentLiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardLift.value }],
  }));

  const handleInputFocus = useCallback(() => {
    setInputFocused(true);
    setIsPaused(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    setInputFocused(false);
    if (!insightsVisible) {
      setIsPaused(false);
    }
  }, [insightsVisible]);

  const handleTapBack = useCallback(() => {
    if (inputFocused) {
      dismissReplyKeyboard();
      return;
    }
    goPrevItem('tap_back');
  }, [dismissReplyKeyboard, goPrevItem, inputFocused]);

  const handleTapForward = useCallback(() => {
    if (inputFocused) {
      dismissReplyKeyboard();
      return;
    }
    goNextItem('tap_forward');
  }, [dismissReplyKeyboard, goNextItem, inputFocused]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .activeOffsetY([-24, 24])
    .onUpdate((e) => {
      if (insightsOpen.value) return;
      if (e.translationY > 0 && Math.abs(e.translationY) > Math.abs(e.translationX) * 1.15) {
        dismissY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (insightsOpen.value) return;

      const isDownSwipe =
        e.translationY >= SWIPE_DOWN_THRESHOLD ||
        (e.translationY > 36 && e.velocityY > SWIPE_DOWN_VELOCITY);

      if (isDownSwipe && Math.abs(e.translationY) > Math.abs(e.translationX)) {
        dismissY.value = withTiming(SCREEN_HEIGHT * 0.55, { duration: 220 }, (finished) => {
          if (finished) runOnJS(closeViewer)();
        });
        deckOpacity.value = withTiming(0, { duration: 220 });
        return;
      }

      if (dismissY.value > 0) {
        dismissY.value = withTiming(0, { duration: 180 });
      }

      if (isOwnStorySv.value === 1 && e.translationY <= -SWIPE_UP_THRESHOLD && Math.abs(e.translationY) > Math.abs(e.translationX)) {
        runOnJS(openInsights)();
        return;
      }
      if (e.translationX <= -SWIPE_THRESHOLD) {
        runOnJS(goNextUser)('swipe_forward');
      } else if (e.translationX >= SWIPE_THRESHOLD) {
        runOnJS(goPrevUser)('swipe_back');
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(180)
    .onStart(() => runOnJS(setIsPaused)(true))
    .onFinalize(() => runOnJS(resumePlaybackIfAllowed)());

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
        storyMediaUrl: activeItem.mediaUrl,
        storyMediaType: activeItem.mediaType,
        storyAuthorUsername: bundle.username,
        storyAuthorId: bundle.authorId,
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

  const openAuthorProfile = useCallback(() => {
    if (!bundle?.authorId) return;
    setIsPaused(true);
    navigateToPublicProfile({ userId: bundle.authorId });
  }, [bundle?.authorId]);

  const handleDeleteStory = useCallback(() => {
    if (!user?.id || !activeItem || !bundle) return;

    const isLastItem = items.length <= 1;
    Alert.alert(
      isLastItem ? 'Hikayeyi Kaldır' : 'Kareyi Sil',
      isLastItem
        ? 'Hikayeniz tamamen kaldırılacak. Devam edilsin mi?'
        : 'Bu hikaye karesi kaldırılacak. Devam edilsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel', onPress: () => setIsPaused(false) },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setIsPaused(true);
              const result = await deleteStoryItem(activeItem.id);

              if (result.error) {
                Alert.alert('Silinemedi', result.error);
                setIsPaused(false);
                return;
              }

              const remaining = items.filter((item) => item.id !== activeItem.id);
              if (remaining.length === 0) {
                const refreshed = await fetchStoryRings({ viewerId: user.id });
                useStoryRingStore.getState().setRings(refreshed.rings);
                router.back();
                return;
              }

              setBundle(activeUserId, { ...bundle, items: remaining });
              setCurrentItemIndex(Math.min(currentItemIndex, remaining.length - 1));
              setIsPaused(false);

              void fetchStoryRings({ viewerId: user.id }).then((refreshed) => {
                useStoryRingStore.getState().setRings(refreshed.rings);
              });
            })();
          },
        },
      ],
    );
  }, [
    activeItem,
    activeUserId,
    bundle,
    currentItemIndex,
    items,
    setBundle,
    setCurrentItemIndex,
    user?.id,
  ]);

  if (loading && !bundle) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.cardStage,
          {
            paddingTop: insets.top + STORY_CARD_TOP_GAP,
            paddingBottom: inputFocused
              ? STORY_CARD_BOTTOM_GAP
              : replyBarHeight + STORY_CARD_BOTTOM_GAP,
            paddingHorizontal: STORY_CARD_HORIZONTAL_INSET,
          },
          contentLiftStyle,
        ]}
      >
        {inputFocused ? (
          <Pressable
            style={styles.keyboardDismissBackdrop}
            onPress={dismissReplyKeyboard}
            accessibilityLabel="Klavyeyi kapat"
          />
        ) : null}
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            style={[
              styles.card,
              {
                borderRadius: STORY_CARD_RADIUS,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: 'rgba(255,255,255,0.14)',
              },
              deckStyle,
            ]}
          >
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

            <View style={styles.cardChrome} pointerEvents="box-none">
              <StoryProgressBars total={items.length} activeIndex={currentItemIndex} progress={progress} />
              <View style={styles.topRow}>
                {bundle ? (
                  <Pressable style={styles.authorRow} onPress={openAuthorProfile} hitSlop={8}>
                    <ProfileAvatar
                      username={bundle.username}
                      avatarUrl={bundle.avatarUrl}
                      size={34}
                      isVerified={bundle.isVerified}
                    />
                    <Text variant="label" style={styles.authorName}>
                      {bundle.fullName?.trim() || bundle.username}
                    </Text>
                  </Pressable>
                ) : (
                  <View />
                )}
                <View style={styles.topActions}>
                  {isOwnStory ? (
                    <Pressable
                      onPress={() => {
                        setIsPaused(true);
                        handleDeleteStory();
                      }}
                      hitSlop={12}
                    >
                      <Ionicons name="trash-outline" size={24} color="#fff" />
                    </Pressable>
                  ) : null}
                  <Pressable onPress={closeViewer} hitSlop={12}>
                    <Ionicons name="close" size={28} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </View>

            {inputFocused ? (
              <Pressable
                style={styles.keyboardDismissOverlay}
                onPress={dismissReplyKeyboard}
                accessibilityLabel="Klavyeyi kapat"
              />
            ) : null}

            <Pressable style={styles.tapLeft} onPress={handleTapBack} />
            <Pressable style={styles.tapRight} onPress={handleTapForward} />
          </Animated.View>
        </GestureDetector>
      </Animated.View>

      <View style={styles.footerHost} pointerEvents="box-none">
        <StickyKeyboardFooter backgroundColor="transparent" onLayoutHeight={setReplyBarHeight}>
          <StoryReplyBar
            hasReacted={reacted}
            isOwnStory={isOwnStory}
            sending={sendingReply}
            onSend={handleReply}
            onToggleReaction={handleReaction}
            onOpenInsights={openInsights}
            onDelete={() => {
              setIsPaused(true);
              handleDeleteStory();
            }}
            onInputFocus={handleInputFocus}
            onInputBlur={handleInputBlur}
            inputRef={replyInputRef}
          />
        </StickyKeyboardFooter>
      </View>

      <StoryInsightsSheet
        visible={insightsVisible}
        insights={insights}
        loading={insightsLoading}
        authorId={bundle?.authorId ?? null}
        initialItemIndex={currentItemIndex}
        onClose={() => {
          setInsightsVisible(false);
          setIsPaused(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  cardStage: {
    flex: 1,
  },
  keyboardDismissBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
  },
  keyboardDismissOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 7,
  },
  card: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  footerHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 6,
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 72,
    bottom: 0,
    width: '38%',
    zIndex: 5,
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 72,
    bottom: 0,
    width: '62%',
    zIndex: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorName: {
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loading: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
