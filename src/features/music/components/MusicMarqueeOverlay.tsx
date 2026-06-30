import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { SpinningVinylIcon } from '@/features/music/components/SpinningVinylIcon';
import type { MusicAttribution } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';

type MusicMarqueeOverlayProps = {
  music: MusicAttribution;
  maxWidth?: number;
  animating?: boolean;
};

const SCROLL_SPEED_PX_PER_SEC = 42;
const PAUSE_MS = 1200;
const MAX_LABEL_WIDTH = 200;

export function MusicMarqueeOverlay({ music, maxWidth = MAX_LABEL_WIDTH, animating = false }: MusicMarqueeOverlayProps) {
  const label = useMemo(
    () => (music.artist ? `${music.artist} · ${music.displayTitle}` : music.displayTitle),
    [music.artist, music.displayTitle],
  );

  const [viewportWidth, setViewportWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);

  const needsScroll = textWidth > viewportWidth && viewportWidth > 0;
  const scrollDistance = Math.max(0, textWidth - viewportWidth + spacing.sm);

  useEffect(() => {
    if (!needsScroll || !animating) {
      cancelAnimation(translateX);
      translateX.value = 0;
      return;
    }

    const durationMs = Math.max(1800, (scrollDistance / SCROLL_SPEED_PX_PER_SEC) * 1000);

    translateX.value = withRepeat(
      withSequence(
        withTiming(0, { duration: PAUSE_MS, easing: Easing.linear }),
        withTiming(-scrollDistance, { duration: durationMs, easing: Easing.linear }),
        withTiming(-scrollDistance, { duration: PAUSE_MS, easing: Easing.linear }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
    );

    return () => {
      cancelAnimation(translateX);
    };
  }, [needsScroll, animating, scrollDistance, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Pressable
      style={styles.wrap}
      onPress={() => router.push(`/music/${music.trackId}` as never)}
      hitSlop={8}
    >
      <SpinningVinylIcon spinning={animating} size={22} />

      <View
        style={[styles.viewport, { maxWidth }]}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w > 0 && w !== viewportWidth) setViewportWidth(w);
        }}
      >
        <Animated.View style={[styles.track, animatedStyle]}>
          <Text
            variant="caption"
            style={styles.label}
            numberOfLines={1}
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              if (w > 0 && w !== textWidth) setTextWidth(w);
            }}
          >
            {label}
          </Text>
          {needsScroll ? (
            <Text variant="caption" style={[styles.label, styles.gapLabel]} numberOfLines={1}>
              {label}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    maxWidth: '88%',
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  viewport: {
    overflow: 'hidden',
    flexShrink: 1,
    minWidth: 48,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gapLabel: {
    marginLeft: spacing.lg,
  },
});
