import { StyleSheet, View } from 'react-native';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import { StoryTextLayersRenderer } from '@/features/stories/components/text/StoryTextLayersRenderer';

type StoryTextOverlayViewProps = {
  overlays: StudioTextOverlay[];
};

/** Yayınlanmış hikâyede metin katmanları */
export function StoryTextOverlayView({ overlays }: StoryTextOverlayViewProps) {
  if (overlays.length === 0) return null;

  return (
    <View style={styles.host} pointerEvents="none" collapsable={false}>
      <StoryTextLayersRenderer layers={overlays} />
    </View>
  );
}

/** @deprecated StoryTextLayersRenderer kullanın */
export { StoryTextLayersRenderer };

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    elevation: 80,
  },
});
