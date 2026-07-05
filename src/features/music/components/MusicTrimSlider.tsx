import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
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

  useEffect(() => {
    startSecRef.current = startSec;
  }, [startSec]);

  useEffect(() => {
    trackWidthRef.current = trackWidth;
  }, [trackWidth]);

  const commitStart = useCallback(
    (sec: number) => {
      onStartChange(sec);
    },
    [onStartChange],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const trackPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-4, 4])
        .failOffsetY([-12, 12])
        .onStart(() => {
          grantStartRef.current = startSecRef.current;
        })
        .onUpdate((event) => {
          const width = trackWidthRef.current;
          if (width <= 0 || trackDurationSec <= 0) return;
          const deltaSec = (event.translationX / width) * trackDurationSec;
          const next = snapSec(
            clampMusicRange(grantStartRef.current + deltaSec, 0, maxStart),
          );
          runOnJS(commitStart)(next);
        }),
    [commitStart, maxStart, trackDurationSec],
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

      <GestureDetector gesture={trackPan}>
        <View
          style={[styles.track, { backgroundColor: `${colors.textMuted}20` }]}
          onLayout={onLayout}
          collapsable={false}
        >
          <View
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
            style={[
              styles.handleTouch,
              {
                left: handleCenterX - HANDLE_TOUCH / 2,
              },
            ]}
            pointerEvents="none"
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
      </GestureDetector>
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
