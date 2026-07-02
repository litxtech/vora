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

export function MusicRangeTrimSlider({
  trackDurationSec,
  startSec,
  endSec,
  onRangeChange,
}: MusicRangeTrimSliderProps) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const secToX = (sec: number) => {
    if (trackWidth <= 0 || trackDurationSec <= 0) return 0;
    return (sec / trackDurationSec) * trackWidth;
  };

  const grantSecRef = useRef(0);

  const makeHandlePan = (edge: 'start' | 'end') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        grantSecRef.current = edge === 'start' ? startSec : endSec;
      },
      onPanResponderMove: (_, gesture) => {
        if (trackWidth <= 0) return;
        const deltaSec = (gesture.dx / trackWidth) * trackDurationSec;
        if (edge === 'start') {
          const maxStart = Math.max(0, endSec - MIN_PHOTO_MUSIC_CLIP_SEC);
          onRangeChange(
            snapSec(clampMusicRange(grantSecRef.current + deltaSec, 0, maxStart)),
            endSec,
          );
        } else {
          const minEnd = Math.min(trackDurationSec, startSec + MIN_PHOTO_MUSIC_CLIP_SEC);
          onRangeChange(
            startSec,
            snapSec(clampMusicRange(grantSecRef.current + deltaSec, minEnd, trackDurationSec)),
          );
        }
      },
    });

  const startPan = useMemo(
    () => makeHandlePan('start'),
    [endSec, onRangeChange, startSec, trackDurationSec, trackWidth],
  );

  const endPan = useMemo(
    () => makeHandlePan('end'),
    [endSec, onRangeChange, startSec, trackDurationSec, trackWidth],
  );

  const selectionLeft = trackDurationSec > 0 ? (startSec / trackDurationSec) * 100 : 0;
  const selectionWidth = trackDurationSec > 0 ? ((endSec - startSec) / trackDurationSec) * 100 : 0;
  const clipSec = Math.max(0, endSec - startSec);

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
      >
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
        <View
          style={[styles.handleTouch, { left: secToX(startSec) - HANDLE_TOUCH / 2 }]}
          {...startPan.panHandlers}
        >
          <View
            style={[
              styles.handleVisual,
              { borderColor: colors.accent, backgroundColor: colors.background },
            ]}
          />
        </View>
        <View
          style={[styles.handleTouch, { left: secToX(endSec) - HANDLE_TOUCH / 2 }]}
          {...endPan.panHandlers}
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
        Tutamaçları sürükleyerek başlangıç ve bitişi ayarlayın
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
