import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { MIN_PHOTO_MUSIC_CLIP_SEC } from '@/features/music/constants';
import { clampMusicRange, formatMusicDuration } from '@/features/music/utils/formatMusicTime';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicRangeTrimSliderProps = {
  trackDurationSec: number;
  startSec: number;
  endSec: number;
  onRangeChange: (startSec: number, endSec: number) => void;
};

function snapSec(value: number): number {
  return Math.round(value * 10) / 10;
}

const HANDLE_TOUCH = 48;
const HANDLE_VISUAL = 20;
const TRACK_HEIGHT = 44;

export function MusicRangeTrimSlider({
  trackDurationSec,
  startSec,
  endSec,
  onRangeChange,
}: MusicRangeTrimSliderProps) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const trackWidthRef = useRef(0);
  const startSecRef = useRef(startSec);
  const endSecRef = useRef(endSec);
  const grantSecRef = useRef(0);
  const grantWindowRef = useRef({ start: 0, end: 0 });

  useEffect(() => {
    startSecRef.current = startSec;
  }, [startSec]);

  useEffect(() => {
    endSecRef.current = endSec;
  }, [endSec]);

  useEffect(() => {
    trackWidthRef.current = trackWidth;
  }, [trackWidth]);

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const commitRange = useCallback(
    (nextStart: number, nextEnd: number) => {
      onRangeChange(nextStart, nextEnd);
    },
    [onRangeChange],
  );

  const makeHandlePan = useCallback(
    (edge: 'start' | 'end') =>
      Gesture.Pan()
        .hitSlop({ left: 14, right: 14, top: 18, bottom: 18 })
        .activeOffsetX([-3, 3])
        .failOffsetY([-14, 14])
        .onStart(() => {
          grantSecRef.current = edge === 'start' ? startSecRef.current : endSecRef.current;
        })
        .onUpdate((event) => {
          const width = trackWidthRef.current;
          if (width <= 0 || trackDurationSec <= 0) return;
          const deltaSec = (event.translationX / width) * trackDurationSec;
          if (edge === 'start') {
            const maxStart = Math.max(0, endSecRef.current - MIN_PHOTO_MUSIC_CLIP_SEC);
            const nextStart = snapSec(
              clampMusicRange(grantSecRef.current + deltaSec, 0, maxStart),
            );
            runOnJS(commitRange)(nextStart, endSecRef.current);
          } else {
            const minEnd = Math.min(
              trackDurationSec,
              startSecRef.current + MIN_PHOTO_MUSIC_CLIP_SEC,
            );
            const nextEnd = snapSec(
              clampMusicRange(grantSecRef.current + deltaSec, minEnd, trackDurationSec),
            );
            runOnJS(commitRange)(startSecRef.current, nextEnd);
          }
        }),
    [commitRange, trackDurationSec],
  );

  const startPan = useMemo(() => makeHandlePan('start'), [makeHandlePan]);
  const endPan = useMemo(() => makeHandlePan('end'), [makeHandlePan]);

  const windowPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-4, 4])
        .failOffsetY([-12, 12])
        .onStart(() => {
          grantWindowRef.current = {
            start: startSecRef.current,
            end: endSecRef.current,
          };
        })
        .onUpdate((event) => {
          const width = trackWidthRef.current;
          if (width <= 0 || trackDurationSec <= 0) return;
          const clipLen = grantWindowRef.current.end - grantWindowRef.current.start;
          const deltaSec = (event.translationX / width) * trackDurationSec;
          const maxStart = Math.max(0, trackDurationSec - clipLen);
          const nextStart = snapSec(
            clampMusicRange(grantWindowRef.current.start + deltaSec, 0, maxStart),
          );
          runOnJS(commitRange)(nextStart, snapSec(nextStart + clipLen));
        }),
    [commitRange, trackDurationSec],
  );

  const selectionLeft = trackDurationSec > 0 ? (startSec / trackDurationSec) * 100 : 0;
  const selectionWidth = trackDurationSec > 0 ? ((endSec - startSec) / trackDurationSec) * 100 : 0;
  const clipSec = Math.max(0, endSec - startSec);

  const secToX = (sec: number) => {
    if (trackWidth <= 0 || trackDurationSec <= 0) return 0;
    return (sec / trackDurationSec) * trackWidth;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <Text variant="caption" style={styles.labelText}>
          {formatMusicDuration(startSec)}
        </Text>
        <Text secondary variant="caption" style={styles.labelHint}>
          {formatMusicDuration(clipSec)} seçildi
        </Text>
        <Text variant="caption" style={styles.labelText}>
          {formatMusicDuration(endSec)}
        </Text>
      </View>

      <View
        style={[styles.track, { backgroundColor: `${colors.textMuted}20` }]}
        onLayout={onLayout}
        collapsable={false}
      >
        <GestureDetector gesture={windowPan}>
          <View
            style={[
              styles.selection,
              {
                left: `${selectionLeft}%`,
                width: `${selectionWidth}%`,
                backgroundColor: colors.accent,
              },
            ]}
          />
        </GestureDetector>

        <GestureDetector gesture={startPan}>
          <View
            style={[styles.handleTouch, { left: secToX(startSec) - HANDLE_TOUCH / 2 }]}
            collapsable={false}
          >
            <View
              style={[
                styles.handleVisual,
                { borderColor: colors.accent, backgroundColor: colors.background },
              ]}
            />
          </View>
        </GestureDetector>

        <GestureDetector gesture={endPan}>
          <View
            style={[styles.handleTouch, { left: secToX(endSec) - HANDLE_TOUCH / 2 }]}
            collapsable={false}
          >
            <View
              style={[
                styles.handleVisual,
                { borderColor: colors.accent, backgroundColor: colors.background },
              ]}
            />
          </View>
        </GestureDetector>
      </View>

      <Text secondary variant="caption" style={styles.hint}>
        Tutamaçları veya seçili bölümü sürükleyin
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  labels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelText: { fontSize: 12, fontWeight: '600', minWidth: 40 },
  labelHint: { fontSize: 11 },
  hint: { fontSize: 10, textAlign: 'center' },
  track: {
    width: '100%',
    height: TRACK_HEIGHT,
    borderRadius: radius.full,
    overflow: 'visible',
    justifyContent: 'center',
  },
  selection: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: radius.full,
    opacity: 0.35,
  },
  handleTouch: {
    position: 'absolute',
    width: HANDLE_TOUCH,
    height: HANDLE_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    top: (TRACK_HEIGHT - HANDLE_TOUCH) / 2,
    zIndex: 2,
  },
  handleVisual: {
    width: HANDLE_VISUAL,
    height: HANDLE_VISUAL,
    borderRadius: HANDLE_VISUAL / 2,
    borderWidth: 2.5,
  },
});
