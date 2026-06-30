import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { EVENT_CENTER_DEF } from '@/features/events/constants';
import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const RING_WIDTH = 3;
const GAP_WIDTH = 2.5;

/** Instagram story gradient */
const STORY_GRADIENT = ['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888'] as const;
const LIVE_GRADIENT = ['#FF2D55', '#FF6B35', '#FF1744', '#FF2D55'] as const;

type EventLiveAvatarProps = {
  coverUrl: string | null;
  size?: number;
  live?: boolean;
  /** Story halkası — feed carousel için varsayılan açık */
  story?: boolean;
  accentColor?: string;
};

export function EventLiveAvatar({
  coverUrl,
  size = 72,
  live = false,
  story = true,
  accentColor = EVENT_CENTER_DEF.accent,
}: EventLiveAvatarProps) {
  const { colors } = useTheme();
  const innerShell = size - RING_WIDTH * 2;
  const imageSize = innerShell - GAP_WIDTH * 2;
  const pulse = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (live) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      rotation.value = withRepeat(
        withTiming(360, { duration: 2800, easing: Easing.linear }),
        -1,
        false,
      );
      return;
    }

    if (story) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }
  }, [live, story, pulse, rotation]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const ringColors = live
    ? LIVE_GRADIENT
    : story
      ? STORY_GRADIENT
      : ([accentColor, `${accentColor}88`, accentColor] as const);

  const showRing = story || live;

  const ringGradient = (
    <LinearGradient
      colors={ringColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );

  const shell = (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {showRing ? (
        live ? (
          <Animated.View style={[StyleSheet.absoluteFillObject, spinStyle]} pointerEvents="none">
            {ringGradient}
          </Animated.View>
        ) : (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {ringGradient}
          </View>
        )
      ) : null}
      {showRing ? (
        <View
          style={[
            styles.gap,
            {
              width: innerShell,
              height: innerShell,
              borderRadius: innerShell / 2,
              backgroundColor: colors.background,
              padding: GAP_WIDTH,
            },
          ]}
        >
          <AvatarImage coverUrl={coverUrl} imageSize={imageSize} accentColor={accentColor} colors={colors} />
        </View>
      ) : (
        <AvatarImage coverUrl={coverUrl} imageSize={size} accentColor={accentColor} colors={colors} />
      )}
    </View>
  );

  return (
    <View style={[styles.wrap, { width: size, height: size + (live ? 6 : 0) }]}>
      {showRing ? <Animated.View style={pulseStyle}>{shell}</Animated.View> : shell}
      {live ? (
        <View style={[styles.liveBadge, { borderColor: colors.background }]}>
          <View style={styles.liveDot} />
          <Text variant="caption" style={styles.liveText}>
            CANLI
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function AvatarImage({
  coverUrl,
  imageSize,
  accentColor,
  colors,
}: {
  coverUrl: string | null;
  imageSize: number;
  accentColor: string;
  colors: { surface: string };
}) {
  return (
    <View
      style={[
        styles.imageClip,
        {
          width: imageSize,
          height: imageSize,
          borderRadius: imageSize / 2,
          backgroundColor: colors.surface,
        },
      ]}
    >
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={{ width: imageSize, height: imageSize, borderRadius: imageSize / 2 }}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: imageSize,
              height: imageSize,
              borderRadius: imageSize / 2,
              backgroundColor: `${accentColor}14`,
            },
          ]}
        >
          <Ionicons name="calendar" size={imageSize * 0.36} color={accentColor} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  gap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageClip: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: '#FF2D55',
    borderWidth: 2,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
