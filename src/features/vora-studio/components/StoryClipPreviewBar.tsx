import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

type StoryClipPreviewBarProps = {
  playheadSec: number;
  trimStartSec: number;
  trimEndSec: number;
  durationSec: number;
};

/** Kırpma önizlemesinde seçili klip içinde oynatma göstergesi. */
export function StoryClipPreviewBar({
  playheadSec,
  trimStartSec,
  trimEndSec,
  durationSec,
}: StoryClipPreviewBarProps) {
  const { colors } = useTheme();

  const clipDuration = Math.max(0.1, trimEndSec - trimStartSec);
  const clipProgress = Math.min(1, Math.max(0, (playheadSec - trimStartSec) / clipDuration));

  const windowLeft = durationSec > 0 ? trimStartSec / durationSec : 0;
  const windowWidth = durationSec > 0 ? clipDuration / durationSec : 1;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.track}>
        <View
          style={[
            styles.window,
            {
              left: `${windowLeft * 100}%`,
              width: `${windowWidth * 100}%`,
              backgroundColor: `${colors.primary}55`,
            },
          ]}
        />
        <View
          style={[
            styles.fill,
            {
              left: `${windowLeft * 100}%`,
              width: `${windowWidth * clipProgress * 100}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
        <View
          style={[
            styles.playhead,
            {
              left: `${(windowLeft + windowWidth * clipProgress) * 100}%`,
              backgroundColor: '#fff',
              borderColor: colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'visible',
  },
  window: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  playhead: {
    position: 'absolute',
    top: -3,
    width: 10,
    height: 10,
    marginLeft: -5,
    borderRadius: 5,
    borderWidth: 2,
  },
});
