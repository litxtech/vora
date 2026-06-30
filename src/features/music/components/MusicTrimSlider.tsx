import { useMemo, useState } from 'react';
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

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          if (trackWidth <= 0) return;
          const ratio = clampMusicRange(gesture.moveX / trackWidth, 0, 1);
          onStartChange(Math.round(ratio * maxStart * 10) / 10);
        },
      }),
    [maxStart, onStartChange, trackWidth],
  );

  const selectionLeft = maxStart > 0 ? (startSec / maxStart) * 100 : 0;
  const selectionWidth = trackDurationSec > 0 ? (clipDurationSec / trackDurationSec) * 100 : 100;

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
        {...panResponder.panHandlers}
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
            styles.handle,
            {
              left: `${Math.min(selectionLeft + Math.min(selectionWidth, 100 - selectionLeft) / 2, 98)}%`,
              borderColor: colors.accent,
              backgroundColor: colors.background,
            },
          ]}
        />
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
    height: 28,
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
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    marginLeft: -7,
    top: 7,
  },
});
