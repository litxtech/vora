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
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StickyKeyboardFooter } from '@/components/keyboard';
import { StoryInsightsSheet } from '@/features/stories/components/StoryInsightsSheet';
import { StoryLinkOverlay } from '@/features/stories/components/StoryLinkOverlay';
import { StoryProgressBars } from '@/features/stories/components/StoryProgressBars';
import { StoryReplyBar } from '@/features/stories/components/StoryReplyBar';
import { StoryPeekPreview, StorySlide } from '@/features/stories/components/StorySlide';
import {
  STORY_CARD_BOTTOM_GAP,
  STORY_CARD_HORIZONTAL_INSET,
  STORY_CARD_RADIUS,
  STORY_CARD_TOP_GAP,
  STORY_PHOTO_DURATION_MS,
  STORY_SPRING,
  STORY_USER_TRANSITION_MS,
} from '@/features/stories/constants';
import { useStoryAutoAdvance } from '@/features/stories/hooks/useStoryAutoAdvance';
import { useStoryKeyboardHeight } from '@/features/stories/hooks/useStoryKeyboardHeight';
import { deleteStoryItem } from '@/features/stories/services/deleteStoryItem';
import { fetchStoryBundle } from '@/features/stories/services/fetchStoryBundle';
import { fetchStoryRings } from '@/features/stories/services/fetchStoryRings';
import { formatStoryTime } from '@/features/stories/utils/formatStoryTime';
import { fetchStoryInsights } from '@/features/stories/services/fetchStoryInsights';
import { recordStoryLinkAction } from '@/features/stories/services/recordStoryLinkAction';
import { recordStoryView } from '@/features/stories/services/recordStoryView';
import { markStoryUserSeen } from '@/features/stories/services/storySeenCache';
import { sendStoryReply } from '@/features/stories/services/sendStoryReply';
import { toggleStoryReaction } from '@/features/stories/services/storyReactions';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';
import { useStoryViewerStore } from '@/features/stories/store/storyViewerStore';
import type { StoryBundle, StoryInsights, StoryItem, StoryNavigation } from '@/features/stories/types';
import type { StoryLinkManifest } from '@/features/stories/utils/storyLinks';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { navigateToPublicProfile } from '@/features/profile/services/profileNavigation';
import { Text } from '@/components/ui/Text';
import { useFeedVideoPlaybackStore } from '@/features/feed/store/feedVideoPlaybackStore';
import { prefetchStoryBundleMedia } from '@/features/stories/services/prefetchStoryMedia';
import { spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useAuth } from '@/providers/AuthProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - STORY_CARD_HORIZONTAL_INSET * 2;
const SWIPE_THRESHOLD = CARD_WIDTH * 0.22;
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
  const [showHorizontalPeek, setShowHorizontalPeek] = useState(false);
  const videoProgressRef = useRef({ sec: 0, dur: null as number | null });

  const replyInputRef = useRef<TextInput>(null);
  const inputFocusedRef = useRef(false);

  useEffect(() => {
    inputFocusedRef.current = inputFocused;
  }, [inputFocused]);

  const setHorizontalPeekVisible = useCallback((visible: boolean) => {
    setShowHorizontalPeek(visible);
  }, []);

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
  const deckScale = useSharedValue(1);
  const panX = useSharedValue(0);
  const dismissY = useSharedValue(0);
  const insightsOpen = useSharedValue(0);
  const isOwnStorySv = useSharedValue(0);
  const hasSingleLinkSv = useSharedValue(0);
  const canGoPrevUserSv = useSharedValue(0);
  const canGoNextUserSv = useSharedValue(0);

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
      if (data) {
        setBundle(authorId, data);
      }
      return data;
    },
    [setBundle, user?.id],
  );

  useEffect(() => {
    let cancelled = false;
    const hasCachedBundle = Boolean(useStoryViewerStore.getState().bundles[activeUserId]);
    if (!hasCachedBundle) {
      setLoading(true);
    }

    void (async () => {
      const data = await loadBundle(activeUserId);
      if (cancelled) return;
      setLoading(false);
      if (!data || data.items.length === 0) {
        const userIndex = useStoryViewerStore.getState().currentUserIndex;
        if (userIndex < ringUserIds.length - 1) {
          setCurrentUserIndex(userIndex + 1);
        } else {
          router.back();
        }
        return;
      }
      const userIndex = useStoryViewerStore.getState().currentUserIndex;
      const prefetchIds = [ringUserIds[userIndex - 1], ringUserIds[userIndex + 1]].filter(
        Boolean,
      ) as string[];
      for (const id of prefetchIds) {
        if (!useStoryViewerStore.getState().bundles[id]) void loadBundle(id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeUserId, loadBundle, ringUserIds, setCurrentUserIndex]);

  useEffect(() => {
    if (!items.length) return;
    prefetchStoryBundleMedia(items, currentItemIndex);
  }, [currentItemIndex, items]);

  useEffect(() => {
    insightsOpen.value = insightsVisible ? 1 : 0;
  }, [insightsOpen, insightsVisible]);

  useEffect(() => {
    isOwnStorySv.value = isOwnStory ? 1 : 0;
  }, [isOwnStory, isOwnStorySv]);

  useEffect(() => {
    const hasSingle = !isOwnStory && activeItem?.links?.length === 1;
    hasSingleLinkSv.value = hasSingle ? 1 : 0;
  }, [activeItem?.links?.length, hasSingleLinkSv, isOwnStory]);

  useEffect(() => {
    canGoPrevUserSv.value = currentUserIndex > 0 ? 1 : 0;
    canGoNextUserSv.value = currentUserIndex < ringUserIds.length - 1 ? 1 : 0;
  }, [canGoNextUserSv, canGoPrevUserSv, currentUserIndex, ringUserIds.length]);

  useEffect(() => {
    dismissY.value = 0;
    panX.value = 0;
    transitionX.value = 0;
    deckScale.value = 1;
    deckOpacity.value = 1;
    setShowHorizontalPeek(false);
  }, [activeItem?.id, activeUserId, deckOpacity, deckScale, dismissY, panX, transitionX]);

  useEffect(() => {
    setProgress(0);
    videoProgressRef.current = { sec: 0, dur: null };
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

  const resetDeckMotion = useCallback(() => {
    panX.value = 0;
    transitionX.value = 0;
    deckScale.value = 1;
    deckOpacity.value = 1;
  }, [deckOpacity, deckScale, panX, transitionX]);

  const animateUserTransition = useCallback(
    (direction: 1 | -1, after: () => void) => {
      dismissY.value = 0;
      panX.value = 0;
      transitionX.value = withTiming(direction * -CARD_WIDTH, {
        duration: STORY_USER_TRANSITION_MS,
        easing: Easing.out(Easing.cubic),
      });
      deckScale.value = withTiming(0.9, { duration: STORY_USER_TRANSITION_MS });
      deckOpacity.value = withTiming(0.55, { duration: STORY_USER_TRANSITION_MS * 0.65 }, (finished) => {
        if (!finished) return;
        runOnJS(after)();
        transitionX.value = direction * CARD_WIDTH;
        deckScale.value = 0.94;
        transitionX.value = withSpring(0, STORY_SPRING);
        deckScale.value = withSpring(1, STORY_SPRING);
        deckOpacity.value = withTiming(1, { duration: 200 });
      });
    },
    [deckOpacity, deckScale, dismissY, panX, transitionX],
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
        animateUserTransition(1, () => {
          setCurrentUserIndex(currentUserIndex + 1);
          setCurrentItemIndex(0);
        });
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

  const handleVideoPosition = useCallback((sec: number, dur?: number | null) => {
    videoProgressRef.current.sec = sec;
    if (dur != null && dur > 0) {
      videoProgressRef.current.dur = dur;
    }

    const duration = Math.max(
      0.1,
      dur ?? videoProgressRef.current.dur ?? activeItem?.durationSec ?? 15,
    );
    const nextProgress = Math.min(1, sec / duration);
    setProgress((prev) => (Math.abs(prev - nextProgress) < 0.008 ? prev : nextProgress));
  }, [activeItem?.durationSec]);

  const handleVideoEnd = useCallback(() => {
    goNextItem('auto_forward');
  }, [goNextItem]);

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

  const finishPanNextUser = useCallback(() => {
    void flushView('swipe_forward', true);
    void markStoryUserSeen(activeUserId);
    markRingSeen(activeUserId);
    resetDeckMotion();
    setCurrentUserIndex(currentUserIndex + 1);
    setCurrentItemIndex(0);
  }, [
    activeUserId,
    currentUserIndex,
    flushView,
    markRingSeen,
    resetDeckMotion,
    setCurrentItemIndex,
    setCurrentUserIndex,
  ]);

  const finishPanPrevUser = useCallback(() => {
    void flushView('swipe_back', true);
    resetDeckMotion();
    const prevUserId = ringUserIds[currentUserIndex - 1];
    const prevBundle = useStoryViewerStore.getState().bundles[prevUserId];
    const lastIndex = Math.max(0, (prevBundle?.items.length ?? 1) - 1);
    setCurrentUserIndex(currentUserIndex - 1);
    setCurrentItemIndex(lastIndex);
  }, [
    currentUserIndex,
    flushView,
    resetDeckMotion,
    ringUserIds,
    setCurrentItemIndex,
    setCurrentUserIndex,
  ]);

  const resumePlaybackIfAllowed = useCallback(() => {
    if (!inputFocusedRef.current && !insightsVisible) {
      setIsPaused(false);
    }
  }, [insightsVisible]);

  useStoryAutoAdvance({
    item: activeItem,
    isActive: Boolean(activeItem) && !insightsVisible,
    isPaused,
    onComplete: () => goNextItem('auto_forward'),
    onProgress: setProgress,
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

  const openStoryLink = useCallback(
    async (link: StoryLinkManifest, action: 'tap' | 'swipe_up') => {
      if (!user?.id || !activeItem || isOwnStory) return;
      void recordStoryLinkAction({
        viewerId: user.id,
        storyItemId: activeItem.id,
        linkId: link.id,
        action,
      });
      setIsPaused(true);
      try {
        await openUrl(link.url);
      } finally {
        if (!insightsVisible) setIsPaused(false);
      }
    },
    [activeItem, insightsVisible, isOwnStory, user?.id],
  );

  const openSingleStoryLink = useCallback(() => {
    const link = activeItem?.links?.[0];
    if (!link) return;
    void openStoryLink(link, 'swipe_up');
  }, [activeItem?.links, openStoryLink]);

  const handleLinkPress = useCallback(
    (link: StoryLinkManifest) => {
      void openStoryLink(link, 'tap');
    },
    [openStoryLink],
  );

  const nextUserId = ringUserIds[currentUserIndex + 1];
  const prevUserId = ringUserIds[currentUserIndex - 1];
  const nextPeekItem = nextUserId ? (bundles[nextUserId]?.items[0] ?? null) : null;
  const prevPeekItem = prevUserId
    ? (bundles[prevUserId]?.items[Math.max(0, (bundles[prevUserId]?.items.length ?? 1) - 1)] ?? null)
    : null;

  const deckStyle = useAnimatedStyle(() => {
    const dragProgress = Math.min(1, Math.max(0, dismissY.value) / 240);
    return {
      transform: [
        { translateY: dismissY.value },
        { scale: deckScale.value * (1 - dragProgress * 0.06) },
      ],
      opacity: deckOpacity.value * (1 - dragProgress * 0.45),
    };
  });

  const slideLayerStyle = useAnimatedStyle(() => {
    const offset = transitionX.value + panX.value;
    if (Math.abs(offset) < 0.5) {
      return {};
    }
    return {
      transform: [{ translateX: offset }],
    };
  });

  const nextPeekStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: CARD_WIDTH + transitionX.value + panX.value }],
    opacity: panX.value < -6 ? 1 : 0,
  }));

  const prevPeekStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -CARD_WIDTH + transitionX.value + panX.value }],
    opacity: panX.value > 6 ? 1 : 0,
  }));

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
    .activeOffsetX([-16, 16])
    .activeOffsetY([-20, 20])
    .onUpdate((e) => {
      if (insightsOpen.value) return;

      const absX = Math.abs(e.translationX);
      const absY = Math.abs(e.translationY);

      if (e.translationY > 0 && absY > absX * 1.15) {
        dismissY.value = e.translationY;
        panX.value = 0;
        return;
      }

      if (absX > absY * 0.82) {
        dismissY.value = 0;
        let tx = e.translationX;
        if (canGoNextUserSv.value === 0 && tx < 0) tx *= 0.22;
        if (canGoPrevUserSv.value === 0 && tx > 0) tx *= 0.22;
        panX.value = tx;
        if (Math.abs(tx) > 8) {
          runOnJS(setHorizontalPeekVisible)(true);
        }
      }
    })
    .onEnd((e) => {
      if (insightsOpen.value) return;

      const absX = Math.abs(e.translationX);
      const absY = Math.abs(e.translationY);

      const isDownSwipe =
        e.translationY >= SWIPE_DOWN_THRESHOLD ||
        (e.translationY > 36 && e.velocityY > SWIPE_DOWN_VELOCITY);

      if (isDownSwipe && absY > absX) {
        dismissY.value = withTiming(SCREEN_HEIGHT * 0.55, { duration: 260, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(closeViewer)();
        });
        deckOpacity.value = withTiming(0, { duration: 260 });
        runOnJS(setHorizontalPeekVisible)(false);
        return;
      }

      if (dismissY.value > 0) {
        dismissY.value = withSpring(0, STORY_SPRING);
      }

      if (isOwnStorySv.value === 1 && e.translationY <= -SWIPE_UP_THRESHOLD && absY > absX) {
        runOnJS(openInsights)();
        panX.value = withSpring(0, STORY_SPRING);
        runOnJS(setHorizontalPeekVisible)(false);
        return;
      }

      if (
        isOwnStorySv.value === 0 &&
        hasSingleLinkSv.value === 1 &&
        e.translationY <= -SWIPE_UP_THRESHOLD &&
        absY > absX
      ) {
        runOnJS(openSingleStoryLink)();
        panX.value = withSpring(0, STORY_SPRING);
        runOnJS(setHorizontalPeekVisible)(false);
        return;
      }

      if (absX > absY * 0.82) {
        if (e.translationX <= -SWIPE_THRESHOLD && canGoNextUserSv.value === 1) {
          panX.value = withTiming(
            -CARD_WIDTH,
            { duration: 240, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (finished) runOnJS(finishPanNextUser)();
            },
          );
          runOnJS(setHorizontalPeekVisible)(false);
          return;
        }
        if (e.translationX >= SWIPE_THRESHOLD && canGoPrevUserSv.value === 1) {
          panX.value = withTiming(
            CARD_WIDTH,
            { duration: 240, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (finished) runOnJS(finishPanPrevUser)();
            },
          );
          runOnJS(setHorizontalPeekVisible)(false);
          return;
        }
        panX.value = withSpring(0, STORY_SPRING);
        runOnJS(setHorizontalPeekVisible)(false);
        return;
      }

      panX.value = withSpring(0, STORY_SPRING);
      runOnJS(setHorizontalPeekVisible)(false);
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
            <Animated.View
              style={[styles.slideHost, slideLayerStyle]}
              pointerEvents="box-none"
              collapsable={false}
            >
              {showHorizontalPeek && prevPeekItem ? (
                <Animated.View style={[styles.slideLayer, prevPeekStyle]} pointerEvents="none">
                  <StoryPeekPreview item={prevPeekItem} />
                </Animated.View>
              ) : null}
              {showHorizontalPeek && nextPeekItem ? (
                <Animated.View style={[styles.slideLayer, nextPeekStyle]} pointerEvents="none">
                  <StoryPeekPreview item={nextPeekItem} />
                </Animated.View>
              ) : null}

              <View style={[styles.slideLayer, styles.slideLayerActive]} collapsable={false}>
                {activeItem ? (
                  <StorySlide
                    key={activeItem.id}
                    item={activeItem}
                    isActive={Boolean(activeItem) && !isPaused && !insightsVisible}
                    isPaused={isPaused || insightsVisible}
                    onVideoPosition={handleVideoPosition}
                    onVideoEnd={handleVideoEnd}
                  />
                ) : null}
              </View>
            </Animated.View>

            {!isOwnStory && activeItem && (activeItem.links?.length ?? 0) > 0 ? (
              <View style={styles.linkOverlayHost} pointerEvents="box-none">
                <StoryLinkOverlay
                  links={activeItem.links ?? []}
                  onLinkPress={handleLinkPress}
                  singleLinkMode="swipe_up"
                />
              </View>
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
                    <View style={styles.authorMeta}>
                      <Text variant="label" style={styles.authorName}>
                        {bundle.fullName?.trim() || bundle.username}
                      </Text>
                      {activeItem?.createdAt ? (
                        <Text variant="caption" style={styles.storyTime}>
                          {formatStoryTime(activeItem.createdAt)}
                        </Text>
                      ) : null}
                    </View>
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
        storyItems={items}
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
  slideHost: {
    flex: 1,
    width: '100%',
  },
  slideLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  slideLayerActive: {
    zIndex: 2,
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
  linkOverlayHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
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
    flexShrink: 1,
  },
  authorMeta: {
    flexShrink: 1,
    gap: 1,
  },
  authorName: {
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  storyTime: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
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
