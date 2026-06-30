import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import {
  VIDEO_PROCESSING_FEED_MESSAGES,
  VIDEO_PROCESSING_FEED_SUBTITLE,
} from '@/components/media/videoProcessingMessages';
import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type VideoProcessingOverlayProps = {
  style?: StyleProp<ViewStyle>;
  /** Metinleri gizle, yalnızca animasyon */
  animationOnly?: boolean;
};

const MESSAGE_INTERVAL_MS = 3200;

export function VideoProcessingOverlay({ style, animationOnly = false }: VideoProcessingOverlayProps) {
  const { colors } = useTheme();
  const [messageIndex, setMessageIndex] = useState(0);

  const shimmerX = useSharedValue(-1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.45);
  const iconFloat = useSharedValue(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % VIDEO_PROCESSING_FEED_MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.55, { duration: 1400, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.08, { duration: 1400, easing: Easing.out(Easing.ease) }),
        withTiming(0.45, { duration: 0 }),
      ),
      -1,
      false,
    );
    iconFloat.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [iconFloat, ringOpacity, ringScale, shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value * 120 }],
    opacity: 0.35,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconFloat.value }],
  }));

  const message = VIDEO_PROCESSING_FEED_MESSAGES[messageIndex];

  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={['#0A0E14', '#121820', '#0D1520']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.shimmerBand, shimmerStyle]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', `${colors.primary}55`, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>

      <View style={styles.content} pointerEvents="none">
        <View style={styles.iconStage}>
          <Animated.View
            style={[
              styles.pulseRing,
              { borderColor: colors.primary },
              ringStyle,
            ]}
          />
          <Animated.View style={[styles.iconBubble, { backgroundColor: `${colors.primary}22` }, iconStyle]}>
            <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
          </Animated.View>
        </View>

        {!animationOnly ? (
          <View style={styles.textBlock}>
            <Animated.View
              key={message}
              entering={FadeIn.duration(280)}
              exiting={FadeOut.duration(180)}
            >
              <Text variant="caption" style={styles.title} numberOfLines={2}>
                {message}
              </Text>
            </Animated.View>
            <Text variant="caption" style={styles.subtitle} numberOfLines={1}>
              {VIDEO_PROCESSING_FEED_SUBTITLE}
            </Text>
          </View>
        ) : null}

        <View style={styles.dotsRow}>
          {VIDEO_PROCESSING_FEED_MESSAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === messageIndex ? colors.primary : `${colors.primary}44`,
                  width: i === messageIndex ? 14 : 5,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#0A0E14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmerBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '-40%',
    width: '80%',
  },
  shimmerGradient: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 10,
    maxWidth: '92%',
  },
  iconStage: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
  },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dot: {
    height: 5,
    borderRadius: radius.full,
  },
});
