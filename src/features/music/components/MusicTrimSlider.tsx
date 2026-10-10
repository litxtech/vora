import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { clampMusicRange, formatMusicDuration } from '@/features/music/utils/formatMusicTime';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicTrimSliderProps = {
  trackDurationSec: number;
  clipDurationSec: number;
  startSec: number;
  onStartChange: (sec: number) => void;
};

function snapSec(value: number): number {
  return Math.round(value * 10) / 10;
}

const HANDLE_TOUCH = 44;
const HANDLE_VISUAL = 20;

export function MusicTrimSlider({
  trackDurationSec,
  clipDurationSec,
  startSec,
  onStartChange,
}: MusicTrimSliderProps) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const maxStart = Math.max(0, trackDurationSec - clipDurationSec);
  const endSec = Math.min(startSec + clipDurationSec, trackDurationSec);

  const trackWidthRef = useRef(0);
  const startSecRef = useRef(startSec);
  const grantStartRef = useRef(0);
  const maxStartRef = useRef(maxStart);
  const durationRef = useRef(trackDurationSec);
  const clipRef = useRef(clipDurationSec);
  const onChangeRef = useRef(onStartChange);

  startSecRef.current = startSec;
  maxStartRef.current = maxStart;
  durationRef.current = trackDurationSec;
  clipRef.current = clipDurationSec;
  onChangeRef.current = onStartChange;

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
          const clip = clipRef.current;
          if (width <= 0 || duration <= 0) {
            grantStartRef.current = startSecRef.current;
            return;
          }
          const tappedSec = (event.nativeEvent.locationX / width) * duration;
          const next = snapSec(
            clampMusicRange(tappedSec - clip / 2, 0, maxStartRef.current),
          );
          grantStartRef.current = next;
          onChangeRef.current(next);
        },
        onPanResponderMove: (_event, gesture) => {
          const width = trackWidthRef.current;
          const duration = durationRef.current;
          if (width <= 0 || duration <= 0) return;
          const deltaSec = (gesture.dx / width) * duration;
          const next = snapSec(
            clampMusicRange(grantStartRef.current + deltaSec, 0, maxStartRef.current),
          );
          onChangeRef.current(next);
        },
      }),
    [],
  );

  const selectionLeft = trackDurationSec > 0 ? (startSec / trackDurationSec) * 100 : 0;
  const selectionWidth = trackDurationSec > 0 ? (clipDurationSec / trackDurationSec) * 100 : 100;
  const handleCenterX =
    trackWidth > 0
      ? ((startSec + clipDurationSec / 2) / trackDurationSec) * trackWidth
      : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <Text variant="caption" style={styles.labelText}>
          {formatMusicDuration(startSec)}
        </Text>
        <Text secondary variant="caption" style={styles.labelHint}>
          {formatMusicDuration(clipDurationSec)} kullanılacak
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
              width: `${Math.min(selectionWidth, 100 - selectionLeft)}%`,
              backgroundColor: colors.accent,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.handleTouch,
            {
              left: handleCenterX - HANDLE_TOUCH / 2,
            },
          ]}
        >
          <View
            style={[
              styles.handleVisual,
              {
                borderColor: colors.accent,
                backgroundColor: colors.background,
              },
            ]}
          />
        </View>
      </View>
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
  track: {
    width: '100%',
    height: 44,
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
    top: (44 - HANDLE_TOUCH) / 2,
  },
  handleVisual: {
    width: HANDLE_VISUAL,
    height: HANDLE_VISUAL,
    borderRadius: HANDLE_VISUAL / 2,
    borderWidth: 2.5,
  },
});
