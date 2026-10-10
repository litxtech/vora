import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
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
const HANDLE_SLOP = 36;

type DragMode = 'start' | 'end' | 'window';

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
  const durationRef = useRef(trackDurationSec);
  const onChangeRef = useRef(onRangeChange);
  const modeRef = useRef<DragMode>('window');
  const grantSecRef = useRef(0);
  const grantWindowRef = useRef({ start: 0, end: 0 });

  startSecRef.current = startSec;
  endSecRef.current = endSec;
  durationRef.current = trackDurationSec;
  onChangeRef.current = onRangeChange;

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    trackWidthRef.current = width;
    setTrackWidth(width);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (event) => {
          const width = trackWidthRef.current;
          const duration = durationRef.current;
          const start = startSecRef.current;
          const end = endSecRef.current;
          if (width <= 0 || duration <= 0) return;

          const x = event.nativeEvent.locationX;
          const startX = (start / duration) * width;
          const endX = (end / duration) * width;
          const distStart = Math.abs(x - startX);
          const distEnd = Math.abs(x - endX);

          if (distStart <= HANDLE_SLOP && distStart <= distEnd) {
            modeRef.current = 'start';
            grantSecRef.current = start;
            return;
          }
          if (distEnd <= HANDLE_SLOP) {
            modeRef.current = 'end';
            grantSecRef.current = end;
            return;
          }

          modeRef.current = 'window';
          const clipLen = Math.max(MIN_PHOTO_MUSIC_CLIP_SEC, end - start);
          if (x >= Math.min(startX, endX) && x <= Math.max(startX, endX)) {
            grantWindowRef.current = { start, end };
            return;
          }

          const tappedSec = (x / width) * duration;
          const maxStart = Math.max(0, duration - clipLen);
          const nextStart = snapSec(clampMusicRange(tappedSec - clipLen / 2, 0, maxStart));
          const nextEnd = snapSec(Math.min(duration, nextStart + clipLen));
          grantWindowRef.current = { start: nextStart, end: nextEnd };
          onChangeRef.current(nextStart, nextEnd);
        },
        onPanResponderMove: (_event, gesture) => {
          const width = trackWidthRef.current;
          const duration = durationRef.current;
          if (width <= 0 || duration <= 0) return;
          const deltaSec = (gesture.dx / width) * duration;

          if (modeRef.current === 'start') {
            const maxStart = Math.max(0, endSecRef.current - MIN_PHOTO_MUSIC_CLIP_SEC);
            const nextStart = snapSec(
              clampMusicRange(grantSecRef.current + deltaSec, 0, maxStart),
            );
            onChangeRef.current(nextStart, endSecRef.current);
            return;
          }

          if (modeRef.current === 'end') {
            const minEnd = Math.min(
              duration,
              startSecRef.current + MIN_PHOTO_MUSIC_CLIP_SEC,
            );
            const nextEnd = snapSec(
              clampMusicRange(grantSecRef.current + deltaSec, minEnd, duration),
            );
            onChangeRef.current(startSecRef.current, nextEnd);
            return;
          }

          const clipLen = grantWindowRef.current.end - grantWindowRef.current.start;
          const maxStart = Math.max(0, duration - clipLen);
          const nextStart = snapSec(
            clampMusicRange(grantWindowRef.current.start + deltaSec, 0, maxStart),
          );
          onChangeRef.current(nextStart, snapSec(Math.min(duration, nextStart + clipLen)));
        },
      }),
    [],
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
        {...pan.panHandlers}
      >
        <View
          pointerEvents="none"
          style={[
            styles.selection,
            {
              left: `${selectionLeft}%`,
              width: `${selectionWidth}%`,
              backgroundColor: colors.accent,
            },
          ]}
        />

        <View
          pointerEvents="none"
          style={[styles.handleTouch, { left: secToX(startSec) - HANDLE_TOUCH / 2 }]}
        >
          <View
            style={[
              styles.handleVisual,
              { borderColor: colors.accent, backgroundColor: colors.background },
            ]}
          />
        </View>

        <View
          pointerEvents="none"
          style={[styles.handleTouch, { left: secToX(endSec) - HANDLE_TOUCH / 2 }]}
        >
          <View
            style={[
              styles.handleVisual,
              { borderColor: colors.accent, backgroundColor: colors.background },
            ]}
          />
        </View>
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
