import { useMemo, useState } from 'react';
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

  const xToSec = (x: number) => {
    if (trackWidth <= 0 || trackDurationSec <= 0) return 0;
    return snapSec(clampMusicRange((x / trackWidth) * trackDurationSec, 0, trackDurationSec));
  };

  const startPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          const nextStart = xToSec(gesture.moveX);
          const maxStart = Math.max(0, endSec - MIN_PHOTO_MUSIC_CLIP_SEC);
          onRangeChange(snapSec(clampMusicRange(nextStart, 0, maxStart)), endSec);
        },
      }),
    [endSec, onRangeChange, trackWidth, trackDurationSec],
  );

  const endPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          const nextEnd = xToSec(gesture.moveX);
          const minEnd = Math.min(trackDurationSec, startSec + MIN_PHOTO_MUSIC_CLIP_SEC);
          onRangeChange(startSec, snapSec(clampMusicRange(nextEnd, minEnd, trackDurationSec)));
        },
      }),
    [onRangeChange, startSec, trackDurationSec, trackWidth],
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
          style={[
            styles.handle,
            {
              left: secToX(startSec) - 8,
              borderColor: colors.accent,
              backgroundColor: colors.background,
            },
          ]}
          {...startPan.panHandlers}
        />
        <View
          style={[
            styles.handle,
            {
              left: secToX(endSec) - 8,
              borderColor: colors.accent,
              backgroundColor: colors.background,
            },
          ]}
          {...endPan.panHandlers}
        />
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
    height: 32,
    borderRadius: radius.full,
    overflow: 'visible',
    justifyContent: 'center',
  },
  selection: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: radius.full,
    opacity: 0.35,
  },
  handle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    top: 8,
  },
});
