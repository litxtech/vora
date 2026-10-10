import { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { formatAiMusicClock } from '@/features/ai-music/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AiMusicTransportProps = {
  playing: boolean;
  position: number;
  duration: number;
  onToggle: () => void;
  onSeek: (sec: number) => void;
  onSkip: (deltaSec: number) => void;
};

export function AiMusicTransport({
  playing,
  position,
  duration,
  onToggle,
  onSeek,
  onSkip,
}: AiMusicTransportProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    widthRef.current = next;
    setWidth(next);
  };

  const seekAt = useCallback(
    (x: number) => {
      const track = widthRef.current;
      const total = durationRef.current;
      if (track <= 0 || total <= 0) return;
      const ratio = Math.min(1, Math.max(0, x / track));
      onSeek(ratio * total);
    },
    [onSeek],
  );

  const scrub = useMemo(
    () =>
      Gesture.Pan()
        .hitSlop({ top: 16, bottom: 16 })
        .activeOffsetX([-2, 2])
        .failOffsetY([-14, 14])
        .onBegin((event) => {
          runOnJS(seekAt)(event.x);
        })
        .onUpdate((event) => {
          runOnJS(seekAt)(event.x);
        }),
    [seekAt],
  );

  const progress = duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;
  const head = width * progress;

  return (
    <View style={styles.wrap}>
      <View style={styles.controls}>
        <Pressable onPress={() => onSkip(-15)} hitSlop={8} style={styles.skip}>
          <Ionicons name="play-back" size={20} color={colors.text} />
          <Text variant="caption" style={styles.skipLabel}>15</Text>
        </Pressable>
        <Pressable
          onPress={onToggle}
          style={[styles.play, { backgroundColor: colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Duraklat' : 'Çal'}
        >
          <Ionicons name={playing ? 'pause' : 'play'} size={26} color="#fff" />
        </Pressable>
        <Pressable onPress={() => onSkip(15)} hitSlop={8} style={styles.skip}>
          <Ionicons name="play-forward" size={20} color={colors.text} />
          <Text variant="caption" style={styles.skipLabel}>15</Text>
        </Pressable>
      </View>

      <GestureDetector gesture={scrub}>
        <View style={styles.trackHit} onLayout={onLayout} collapsable={false}>
          <View style={[styles.track, { backgroundColor: `${colors.textMuted}28` }]}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
          </View>
          <View style={[styles.head, { left: Math.max(0, head - 7), backgroundColor: colors.accent }]} />
        </View>
      </GestureDetector>

      <View style={styles.times}>
        <Text variant="caption" style={{ fontWeight: '700' }}>{formatAiMusicClock(position)}</Text>
        <Text secondary variant="caption">{formatAiMusicClock(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  skip: { width: 48, alignItems: 'center', justifyContent: 'center' },
  skipLabel: { fontSize: 10, fontWeight: '700', marginTop: -2 },
  play: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackHit: {
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
  head: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    top: 7,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
