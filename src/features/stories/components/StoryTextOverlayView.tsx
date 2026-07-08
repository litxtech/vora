import { Platform, StyleSheet, Text as RNText, View } from 'react-native';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import { STORY_TEXT_BOUNDS } from '@/features/stories/utils/storyTextOverlays';

type StoryTextOverlayViewProps = {
  overlays: StudioTextOverlay[];
};

/** Yayınlanmış hikâyede metin katmanı. */
export function StoryTextOverlayView({ overlays }: StoryTextOverlayViewProps) {
  const visible = overlays.filter((item) => item.text.trim());
  if (visible.length === 0) return null;

  return (
    <View style={styles.layer} pointerEvents="none" collapsable={false}>
      {visible.map((item) => {
        const label = item.text.trim();
        const textColor = item.color === '#000000' ? '#FFFFFF' : item.color || '#FFFFFF';
        const x = Math.min(Math.max(item.x, STORY_TEXT_BOUNDS.minX), STORY_TEXT_BOUNDS.maxX);
        const y = Math.min(Math.max(item.y, STORY_TEXT_BOUNDS.minY), STORY_TEXT_BOUNDS.maxY);

        return (
          <View
            key={item.id}
            style={[
              styles.wrap,
              {
                left: `${x * 100}%`,
                top: `${y * 100}%`,
              },
            ]}
            collapsable={false}
          >
            <RNText
              style={[
                styles.text,
                {
                  fontSize: item.fontSize,
                  lineHeight: Math.round(item.fontSize * 1.28),
                  color: textColor,
                  fontWeight: item.fontFamily === 'bold' ? '800' : '600',
                },
              ]}
              numberOfLines={8}
            >
              {label}
            </RNText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    elevation: 30,
    overflow: 'hidden',
  },
  wrap: {
    position: 'absolute',
    maxWidth: '88%',
  },
  text: {
    textAlign: 'center',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
});
