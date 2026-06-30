import { useEffect } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { usePathname } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { Text } from '@/components/ui/Text';
import { CallRtcView } from '@/features/calls/components/CallRtcView';
import { CALL_FLOAT_DEFAULT_POSITION, CALL_FLOAT_SIZE, CALL_FLOAT_VIDEO } from '@/features/calls/constants';
import { useCallDuration } from '@/features/calls/hooks/useCallDuration';
import {
  hasActiveCallSession,
  isOnCallScreen,
  openCallScreen,
} from '@/features/calls/services/callNavigation';
import { hasActiveAgoraEngine } from '@/features/calls/services/agoraCallEngine';
import {
  buildLocalVideoCanvas,
  buildRemoteVideoCanvas,
} from '@/features/calls/services/callVideoCanvas';
import { useCallStore } from '@/features/calls/store/callStore';
import { formatCallDuration } from '@/features/calls/utils';
import { useAuth } from '@/providers/AuthProvider';

const SPRING = { damping: 22, stiffness: 280 };
const GREEN = '#22C55E';
const GREEN_DARK = '#16A34A';
const GREEN_RING = 'rgba(34, 197, 94, 0.38)';

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

function CallFloatingBubbleInner() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { user } = useAuth();

  const session = useCallStore((s) => s.session);
  const isJoined = useCallStore((s) => s.isJoined);
  const bubblePosition = useCallStore((s) => s.bubblePosition);
  const setBubblePosition = useCallStore((s) => s.setBubblePosition);
  const media = useCallStore((s) => s.media);

  const sessionId = session?.id ?? null;
  const onCallScreen = sessionId ? isOnCallScreen(pathname, sessionId) : false;
  const callActive =
    hasActiveCallSession(session, isJoined) || (session?.status === 'accepted' && hasActiveAgoraEngine());

  const visible = callActive && Boolean(sessionId) && !onCallScreen;
  const isVideoCall = session?.call_type === 'video';
  const floatW = isVideoCall ? CALL_FLOAT_VIDEO.width : CALL_FLOAT_SIZE;
  const floatH = isVideoCall ? CALL_FLOAT_VIDEO.height : CALL_FLOAT_SIZE;

  const duration = useCallDuration(session?.started_at ?? null, visible);
  const durationLabel = formatCallDuration(duration);

  const maxX = Math.max(0, screenW - floatW - 12);
  const maxY = Math.max(0, screenH - floatH - insets.bottom - 12);
  const minY = insets.top + 12;

  const posX = useSharedValue(bubblePosition.x * maxX);
  const posY = useSharedValue(bubblePosition.y * (maxY - minY) + minY);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  useEffect(() => {
    posX.value = withSpring(bubblePosition.x * maxX, SPRING);
    posY.value = withSpring(bubblePosition.y * (maxY - minY) + minY, SPRING);
  }, [bubblePosition.x, bubblePosition.y, maxX, maxY, minY, posX, posY]);

  const commitPosition = (x: number, y: number) => {
    const normalizedX = maxX > 0 ? x / maxX : 0;
    const normalizedY = maxY > minY ? (y - minY) / (maxY - minY) : 0;
    setBubblePosition({
      x: Math.min(1, Math.max(0, normalizedX)),
      y: Math.min(1, Math.max(0, normalizedY)),
    });
  };

  const openCall = () => {
    if (!sessionId) return;
    openCallScreen(sessionId);
  };

  const pan = Gesture.Pan()
    .minDistance(6)
    .onUpdate((event) => {
      dragX.value = event.translationX;
      dragY.value = event.translationY;
    })
    .onEnd((event) => {
      const nextX = clamp(posX.value + event.translationX, 8, maxX);
      const nextY = clamp(posY.value + event.translationY, minY, maxY);
      posX.value = withSpring(nextX, SPRING);
      posY.value = withSpring(nextY, SPRING);
      dragX.value = 0;
      dragY.value = 0;
      runOnJS(commitPosition)(nextX, nextY);
    });

  const tap = Gesture.Tap().maxDuration(250).onEnd(() => {
    runOnJS(openCall)();
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: posX.value + dragX.value },
      { translateY: posY.value + dragY.value },
      { scale: pulse.value },
    ],
  }));

  if (!visible || !session) return null;

  const callIcon = session.call_type === 'video' ? 'videocam' : 'call';
  const videoCanvas =
    isVideoCall && media.remoteUid
      ? buildRemoteVideoCanvas(media.remoteUid)
      : isVideoCall && user && media.isCameraOn
        ? buildLocalVideoCanvas(user.id)
        : null;

  return (
    <View style={styles.overlay} pointerEvents="box-none" collapsable={false}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.bubble,
            isVideoCall ? { width: floatW, height: floatH } : null,
            animatedStyle,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Görüşmeye dön"
        >
          {isVideoCall && videoCanvas ? (
            <View
              style={[
                styles.videoShell,
                {
                  width: floatW,
                  height: floatH,
                  borderRadius: CALL_FLOAT_VIDEO.radius,
                },
              ]}
            >
              <CallRtcView canvas={videoCanvas} pip style={styles.videoFill} />
              <View style={styles.videoBorder} pointerEvents="none" />
            </View>
          ) : (
            <>
              <View style={styles.pulseRing} />
              <LinearGradient colors={[GREEN, GREEN_DARK]} style={styles.phoneBtn}>
                <Ionicons name={callIcon} size={26} color="#fff" />
              </LinearGradient>
            </>
          )}
          <View style={[styles.timerBadge, isVideoCall ? styles.timerBadgeVideo : null]}>
            <Text style={styles.timerText}>{durationLabel}</Text>
          </View>
          {media.isMuted ? (
            <View style={styles.muteBadge}>
              <Ionicons name="mic-off" size={11} color="#fff" />
            </View>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** Aktif görüşme arka plandayken tüm ekranların üstünde yeşil telefon balonu. */
export function CallFloatingBubble() {
  const session = useCallStore((s) => s.session);
  const isJoined = useCallStore((s) => s.isJoined);
  const pathname = usePathname();
  const sessionId = session?.id ?? null;
  const onCallScreen = sessionId ? isOnCallScreen(pathname, sessionId) : false;
  const callActive =
    hasActiveCallSession(session, isJoined) || (session?.status === 'accepted' && hasActiveAgoraEngine());
  const visible = callActive && Boolean(sessionId) && !onCallScreen;

  if (!visible) return null;

  if (Platform.OS === 'ios') {
    return (
      <FullWindowOverlay>
        <CallFloatingBubbleInner />
      </FullWindowOverlay>
    );
  }

  return <CallFloatingBubbleInner />;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  bubble: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CALL_FLOAT_SIZE,
    height: CALL_FLOAT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoShell: {
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  videoFill: {
    width: '100%',
    height: '100%',
  },
  videoBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CALL_FLOAT_VIDEO.radius,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.75)',
  },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CALL_FLOAT_SIZE / 2,
    backgroundColor: GREEN_RING,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.85)',
  },
  phoneBtn: {
    width: CALL_FLOAT_SIZE - 8,
    height: CALL_FLOAT_SIZE - 8,
    borderRadius: (CALL_FLOAT_SIZE - 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 10,
  },
  timerBadge: {
    position: 'absolute',
    bottom: -10,
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 14, 20, 0.92)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.45)',
  },
  timerBadgeVideo: {
    bottom: 6,
    alignSelf: 'center',
  },
  timerText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  muteBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A0E14',
  },
});
