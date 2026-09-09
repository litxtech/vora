import { useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { formatCapClock } from '@/features/caps/constants';
import { captureThumbnail } from '@/features/vora-studio/services/videoThumbnails';
import { getMuxThumbnailUrl } from '@/lib/mux/client';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const FRAME_COUNT = 24;
const STRIP_HEIGHT = 56;

type CapsStudioFilmstripProps = {
  /** Yerel video URI veya boş (Mux için playbackId). */
  localUri?: string | null;
  muxPlaybackId?: string | null;
  durationMs: number;
  windowStartMs: number;
  clipLengthMs: number;
  onSeekMs: (ms: number) => void;
  onWindowStartMsChange: (ms: number) => void;
};

export function CapsStudioFilmstrip({
  localUri,
  muxPlaybackId,
  durationMs,
  windowStartMs,
  clipLengthMs,
  onSeekMs,
  onWindowStartMsChange,
}: CapsStudioFilmstripProps) {
  const { colors } = useTheme();
  const [frames, setFrames] = useState<string[]>([]);
  const [trackW, setTrackW] = useState(1);
  const durationSV = useSharedValue(Math.max(1, durationMs));
  const dragBaseSV = useSharedValue(windowStartMs);
  const clipSV = useSharedValue(clipLengthMs);
  const widthSV = useSharedValue(1);

  useEffect(() => {
    durationSV.value = Math.max(1, durationMs);
    clipSV.value = clipLengthMs;
  }, [durationMs, clipLengthMs, durationSV, clipSV]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (muxPlaybackId) {
        const list = Array.from({ length: FRAME_COUNT }, (_, i) => {
          const t =
            FRAME_COUNT <= 1
              ? 0
              : (i / (FRAME_COUNT - 1)) * Math.max(0, durationMs / 1000 - 0.05);
          return getMuxThumbnailUrl(muxPlaybackId, Math.max(0, t));
        });
        if (!cancelled) setFrames(list);
        return;
      }
      if (!localUri || durationMs <= 0) {
        if (!cancelled) setFrames([]);
        return;
      }
      const list = await Promise.all(
        Array.from({ length: FRAME_COUNT }, (_, i) => {
          const t =
            FRAME_COUNT <= 1
              ? 0
              : (i / (FRAME_COUNT - 1)) * Math.max(0, durationMs / 1000 - 0.05);
          return captureThumbnail(localUri, t);
        }),
      );
      if (!cancelled) setFrames(list.filter((u): u is string => Boolean(u)));
    })();
    return () => {
      cancelled = true;
    };
  }, [localUri, muxPlaybackId, durationMs]);

  const maxStart = Math.max(0, durationMs - clipLengthMs);
  const windowLeft = durationMs > 0 ? (windowStartMs / durationMs) * trackW : 0;
  const windowWidth = durationMs > 0 ? (clipLengthMs / durationMs) * trackW : 0;

  const labels = useMemo(() => {
    const step = durationMs > 600_000 ? 60_000 : durationMs > 120_000 ? 30_000 : 10_000;
    const out: number[] = [];
    for (let t = 0; t <= durationMs; t += step) out.push(t);
    return out.slice(0, 8);
  }, [durationMs]);

  const commitStart = (ms: number) => {
    const next = Math.min(maxStart, Math.max(0, Math.round(ms)));
    onWindowStartMsChange(next);
    onSeekMs(next);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      dragBaseSV.value = windowStartMs;
    })
    .onUpdate((e) => {
      const ratio = e.translationX / Math.max(1, widthSV.value);
      const delta = ratio * durationSV.value;
      const next = Math.min(
        Math.max(0, durationSV.value - clipSV.value),
        Math.max(0, dragBaseSV.value + delta),
      );
      runOnJS(commitStart)(next);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      const ratio = e.x / Math.max(1, widthSV.value);
      const ms = ratio * durationSV.value;
      runOnJS(commitStart)(ms);
    });

  const gestures = Gesture.Simultaneous(pan, doubleTap);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.max(1, e.nativeEvent.layout.width);
    setTrackW(w);
    widthSV.value = w;
  };

  return (
    <View style={styles.wrap}>
      <Text variant="caption" secondary style={styles.clock}>
        {formatCapClock(windowStartMs)}
      </Text>
      <GestureDetector gesture={gestures}>
        <Animated.View
          style={[styles.track, { backgroundColor: colors.surfaceElevated }]}
          onLayout={onLayout}
        >
          <View style={styles.framesRow}>
            {frames.map((uri, i) => (
              <Image key={`${uri}-${i}`} source={{ uri }} style={styles.frame} contentFit="cover" />
            ))}
            {frames.length === 0
              ? Array.from({ length: 8 }).map((_, i) => (
                  <View
                    key={`ph-${i}`}
                    style={[styles.frame, { backgroundColor: colors.border }]}
                  />
                ))
              : null}
          </View>
          <View
            pointerEvents="none"
            style={[
              styles.window,
              {
                left: windowLeft,
                width: Math.max(24, windowWidth),
                borderColor: colors.primary,
              },
            ]}
          />
        </Animated.View>
      </GestureDetector>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.labels}>
        {labels.map((t) => (
          <Pressable key={t} onPress={() => commitStart(Math.min(maxStart, t))} style={styles.labelBtn}>
            <Text variant="caption" secondary>
              {formatCapClock(t)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  clock: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  track: {
    height: STRIP_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  framesRow: { flex: 1, flexDirection: 'row' },
  frame: { flex: 1, height: '100%' },
  window: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(14,165,233,0.18)',
  },
  labels: { gap: spacing.md, paddingHorizontal: spacing.xs },
  labelBtn: { paddingVertical: 2 },
});
