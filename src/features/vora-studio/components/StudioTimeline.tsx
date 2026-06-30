import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { captureThumbnail } from '@/features/vora-studio/services/videoThumbnails';
import { useStudioEditorStore } from '@/features/vora-studio/store/editorStore';
import { formatStudioTime } from '@/features/vora-studio/utils/time';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const TRACK_HEIGHT = 52;
const HANDLE_WIDTH = 26;
const HANDLE_HEIGHT = 64;
const PLAYHEAD_SIZE = 16;
const TRACK_OUTER_HEIGHT = HANDLE_HEIGHT + 8;
const MIN_TRIM_SEC = 0.5;
const FILMSTRIP_FRAMES = 6;

function clampWorklet(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

type DragTarget = 'start' | 'end' | 'playhead' | null;

export function StudioTimeline() {
  const { colors, isDark } = useTheme();
  const sourceUri = useStudioEditorStore((s) => s.sourceUri);
  const durationSec = useStudioEditorStore((s) => s.durationSec);
  const trimStartSec = useStudioEditorStore((s) => s.trimStartSec);
  const trimEndSec = useStudioEditorStore((s) => s.trimEndSec);
  const playheadSec = useStudioEditorStore((s) => s.playheadSec);
  const setTrimStart = useStudioEditorStore((s) => s.setTrimStart);
  const setTrimEnd = useStudioEditorStore((s) => s.setTrimEnd);
  const setPlayhead = useStudioEditorStore((s) => s.setPlayhead);

  const [filmstrip, setFilmstrip] = useState<string[]>([]);
  const draggingRef = useRef<DragTarget>(null);
  const panOriginSV = useSharedValue(0);

  const trackWidth = useSharedValue(1);
  const durationSV = useSharedValue(durationSec);
  const trimStartSV = useSharedValue(trimStartSec);
  const trimEndSV = useSharedValue(trimEndSec);
  const playheadSV = useSharedValue(playheadSec);

  useEffect(() => {
    durationSV.value = durationSec;
    if (!draggingRef.current) {
      trimStartSV.value = trimStartSec;
      trimEndSV.value = trimEndSec;
      playheadSV.value = playheadSec;
    }
  }, [
    durationSec,
    trimStartSec,
    trimEndSec,
    playheadSec,
    durationSV,
    trimStartSV,
    trimEndSV,
    playheadSV,
  ]);

  useEffect(() => {
    if (!sourceUri || durationSec <= 0) {
      setFilmstrip([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      const frames = await Promise.all(
        Array.from({ length: FILMSTRIP_FRAMES }, (_, index) => {
          const timeSec =
            FILMSTRIP_FRAMES === 1
              ? 0
              : (index / (FILMSTRIP_FRAMES - 1)) * durationSec;
          return captureThumbnail(sourceUri, timeSec);
        }),
      );
      if (!cancelled) {
        setFilmstrip(frames.filter((uri): uri is string => !!uri));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceUri, durationSec]);

  const onLayout = (event: LayoutChangeEvent) => {
    trackWidth.value = Math.max(1, event.nativeEvent.layout.width);
  };

  const hapticTick = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const commitTrimStart = useCallback(
    (sec: number) => {
      setTrimStart(sec);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [setTrimStart],
  );

  const commitTrimEnd = useCallback(
    (sec: number) => {
      setTrimEnd(sec);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [setTrimEnd],
  );

  const commitPlayhead = useCallback(
    (sec: number) => {
      setPlayhead(sec);
    },
    [setPlayhead],
  );

  const beginDrag = useCallback((target: DragTarget) => {
    draggingRef.current = target;
  }, []);

  const endDrag = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const startGesture = Gesture.Pan()
    .hitSlop({ left: 20, right: 20, top: 24, bottom: 24 })
    .onStart(() => {
      panOriginSV.value = trimStartSV.value;
      runOnJS(beginDrag)('start');
    })
    .onUpdate((e) => {
      const width = trackWidth.value;
      const duration = durationSV.value;
      if (width <= 0 || duration <= 0) return;
      const deltaSec = (e.translationX / width) * duration;
      const next = clampWorklet(
        panOriginSV.value + deltaSec,
        0,
        trimEndSV.value - MIN_TRIM_SEC,
      );
      trimStartSV.value = next;
      playheadSV.value = clampWorklet(playheadSV.value, next, trimEndSV.value);
    })
    .onEnd(() => {
      runOnJS(commitTrimStart)(trimStartSV.value);
      runOnJS(endDrag)();
    });

  const endGesture = Gesture.Pan()
    .hitSlop({ left: 20, right: 20, top: 24, bottom: 24 })
    .onStart(() => {
      panOriginSV.value = trimEndSV.value;
      runOnJS(beginDrag)('end');
    })
    .onUpdate((e) => {
      const width = trackWidth.value;
      const duration = durationSV.value;
      if (width <= 0 || duration <= 0) return;
      const deltaSec = (e.translationX / width) * duration;
      const next = clampWorklet(
        panOriginSV.value + deltaSec,
        trimStartSV.value + MIN_TRIM_SEC,
        duration,
      );
      trimEndSV.value = next;
      playheadSV.value = clampWorklet(playheadSV.value, trimStartSV.value, next);
    })
    .onEnd(() => {
      runOnJS(commitTrimEnd)(trimEndSV.value);
      runOnJS(endDrag)();
    });

  const playheadGesture = Gesture.Pan()
    .hitSlop({ left: 16, right: 16, top: 20, bottom: 20 })
    .onStart(() => {
      panOriginSV.value = playheadSV.value;
      runOnJS(beginDrag)('playhead');
    })
    .onUpdate((e) => {
      const width = trackWidth.value;
      const duration = durationSV.value;
      if (width <= 0 || duration <= 0) return;
      const deltaSec = (e.translationX / width) * duration;
      const next = clampWorklet(
        panOriginSV.value + deltaSec,
        trimStartSV.value,
        trimEndSV.value,
      );
      playheadSV.value = next;
      runOnJS(commitPlayhead)(next);
    })
    .onEnd(() => {
      runOnJS(hapticTick)();
      runOnJS(endDrag)();
    });

  const scrubGesture = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .onUpdate((e) => {
      const width = trackWidth.value;
      const duration = durationSV.value;
      if (width <= 0 || duration <= 0) return;
      const ratio = clampWorklet(e.x / width, 0, 1);
      const sec = ratio * duration;
      const next = clampWorklet(sec, trimStartSV.value, trimEndSV.value);
      playheadSV.value = next;
      runOnJS(commitPlayhead)(next);
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    const width = trackWidth.value;
    const duration = durationSV.value;
    if (width <= 0 || duration <= 0) return;
    const ratio = clampWorklet(e.x / width, 0, 1);
    const sec = ratio * duration;
    const next = clampWorklet(sec, trimStartSV.value, trimEndSV.value);
    playheadSV.value = next;
    runOnJS(commitPlayhead)(next);
    runOnJS(hapticTick)();
  });

  const trackGesture = Gesture.Simultaneous(tapGesture, scrubGesture);

  const leftDimStyle = useAnimatedStyle(() => {
    const width = trackWidth.value;
    const duration = durationSV.value;
    if (duration <= 0) return { width: 0 };
    return { width: (trimStartSV.value / duration) * width };
  });

  const rightDimStyle = useAnimatedStyle(() => {
    const width = trackWidth.value;
    const duration = durationSV.value;
    if (duration <= 0) return { width: 0 };
    return { width: ((duration - trimEndSV.value) / duration) * width };
  });

  const selectionStyle = useAnimatedStyle(() => {
    const width = trackWidth.value;
    const duration = durationSV.value;
    if (duration <= 0) return { left: 0, width: 0 };
    const left = (trimStartSV.value / duration) * width;
    const right = (trimEndSV.value / duration) * width;
    return { left, width: Math.max(12, right - left) };
  });

  const playheadLineStyle = useAnimatedStyle(() => {
    const width = trackWidth.value;
    const duration = durationSV.value;
    if (duration <= 0) return { left: 0 };
    return { left: (playheadSV.value / duration) * width - 1 };
  });

  const playheadKnobStyle = useAnimatedStyle(() => {
    const width = trackWidth.value;
    const duration = durationSV.value;
    if (duration <= 0) return { left: 0 };
    return { left: (playheadSV.value / duration) * width - PLAYHEAD_SIZE / 2 };
  });

  const startHandleStyle = useAnimatedStyle(() => {
    const width = trackWidth.value;
    const duration = durationSV.value;
    if (duration <= 0) return { left: -HANDLE_WIDTH / 2 };
    return { left: (trimStartSV.value / duration) * width - HANDLE_WIDTH / 2 };
  });

  const endHandleStyle = useAnimatedStyle(() => {
    const width = trackWidth.value;
    const duration = durationSV.value;
    if (duration <= 0) return { left: -HANDLE_WIDTH / 2 };
    return { left: (trimEndSV.value / duration) * width - HANDLE_WIDTH / 2 };
  });

  const trimDuration = Math.max(0, trimEndSec - trimStartSec);
  const accent = colors.primary;

  return (
    <View style={styles.wrap}>
      <View style={styles.statsRow}>
        <View style={[styles.statChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceElevated, borderColor: colors.border }]}>
          <Text variant="caption" secondary>
            Başlangıç
          </Text>
          <Text variant="label" style={{ fontVariant: ['tabular-nums'] }}>
            {formatStudioTime(trimStartSec)}
          </Text>
        </View>
        <View style={[styles.statChip, styles.statChipAccent, { backgroundColor: `${accent}18`, borderColor: `${accent}55` }]}>
          <Text variant="caption" style={{ color: accent }}>
            Süre
          </Text>
          <Text variant="label" style={{ color: accent, fontVariant: ['tabular-nums'] }}>
            {formatStudioTime(trimDuration)}
          </Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceElevated, borderColor: colors.border }]}>
          <Text variant="caption" secondary>
            Bitiş
          </Text>
          <Text variant="label" style={{ fontVariant: ['tabular-nums'] }}>
            {formatStudioTime(trimEndSec)}
          </Text>
        </View>
      </View>

      <View style={styles.trackOuter} onLayout={onLayout}>
        <GestureDetector gesture={trackGesture}>
          <View
            style={[
              styles.track,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            {filmstrip.length > 0 ? (
              <View style={styles.filmstrip} pointerEvents="none">
                {filmstrip.map((uri, index) => (
                  <Image
                    key={`${uri}-${index}`}
                    source={{ uri }}
                    style={styles.filmstripFrame}
                    contentFit="cover"
                  />
                ))}
              </View>
            ) : (
              <View
                pointerEvents="none"
                style={[styles.filmstripFallback, { backgroundColor: `${accent}22` }]}
              />
            )}

            <View style={styles.tickRow} pointerEvents="none">
              {Array.from({ length: 5 }).map((_, index) => (
                <View
                  key={index}
                  style={[styles.tick, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]}
                />
              ))}
            </View>

            <Animated.View pointerEvents="none" style={[styles.dim, leftDimStyle]} />
            <Animated.View pointerEvents="none" style={[styles.dim, styles.dimRight, rightDimStyle]} />

            <Animated.View
              pointerEvents="none"
              style={[styles.selection, selectionStyle, { borderColor: accent }]}
            />

            <Animated.View
              pointerEvents="none"
              style={[styles.playheadLine, playheadLineStyle, { backgroundColor: '#fff' }]}
            />
          </View>
        </GestureDetector>

        <GestureDetector gesture={playheadGesture}>
          <Animated.View style={[styles.playheadKnob, playheadKnobStyle]}>
            <View style={[styles.playheadKnobInner, { borderColor: accent }]} />
          </Animated.View>
        </GestureDetector>

        <GestureDetector gesture={startGesture}>
          <Animated.View style={[styles.handle, startHandleStyle, { backgroundColor: accent }]}>
            <View style={styles.handleBar} />
            <View style={styles.handleBar} />
          </Animated.View>
        </GestureDetector>

        <GestureDetector gesture={endGesture}>
          <Animated.View style={[styles.handle, endHandleStyle, { backgroundColor: accent }]}>
            <View style={styles.handleBar} />
            <View style={styles.handleBar} />
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.labels}>
        <Text variant="caption" secondary>
          {formatStudioTime(0)}
        </Text>
        <Text variant="caption" secondary>
          {formatStudioTime(durationSec)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2,
    alignItems: 'center',
  },
  statChipAccent: {
    flex: 1.1,
  },
  trackOuter: {
    height: TRACK_OUTER_HEIGHT,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  filmstrip: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  filmstripFrame: {
    flex: 1,
    height: '100%',
  },
  filmstripFallback: {
    ...StyleSheet.absoluteFillObject,
  },
  tickRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    alignItems: 'stretch',
  },
  tick: {
    width: 1,
    marginVertical: 6,
    borderRadius: 1,
  },
  dim: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  dimRight: {
    left: undefined,
    right: 0,
  },
  selection: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  playheadLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  playheadKnob: {
    position: 'absolute',
    top: (TRACK_OUTER_HEIGHT - TRACK_HEIGHT) / 2 + (TRACK_HEIGHT - PLAYHEAD_SIZE) / 2,
    width: PLAYHEAD_SIZE,
    height: PLAYHEAD_SIZE,
    zIndex: 4,
  },
  playheadKnobInner: {
    flex: 1,
    borderRadius: PLAYHEAD_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  handle: {
    position: 'absolute',
    top: (TRACK_OUTER_HEIGHT - HANDLE_HEIGHT) / 2,
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    zIndex: 5,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  handleBar: {
    width: 3,
    height: 22,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
});
