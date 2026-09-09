import { type ReactNode, type RefObject } from 'react';
import { StyleSheet, View, type View as RNView } from 'react-native';
import { storyCardFrameStyle } from '@/features/stories/utils/storyCardChrome';
import type { StoryCardMetrics } from '@/features/stories/hooks/useStoryCardMetrics';

type StoryPublishCanvasProps = {
  captureRef?: RefObject<RNView | null>;
  mediaNode: ReactNode;
  metrics: StoryCardMetrics | null;
  children?: ReactNode;
};

/** Hikâye kartı — medya altta, rozetler üst katmanda. */
export function StoryPublishCanvas({
  captureRef,
  mediaNode,
  metrics,
  children,
}: StoryPublishCanvasProps) {
  const canMeasure = Boolean(metrics && metrics.cardWidth > 8 && metrics.cardHeight > 8);

  if (!canMeasure || !metrics) {
    return null;
  }

  return (
    <View style={styles.stageHost} pointerEvents="box-none">
      <View
        ref={captureRef}
        collapsable={false}
        style={[
          storyCardFrameStyle.frame,
          styles.cardShell,
          { width: metrics.cardWidth, height: metrics.cardHeight },
        ]}
      >
        <View style={styles.mediaClip} pointerEvents="box-none" collapsable={false}>
          {mediaNode}
        </View>

        <View style={styles.chromeLayer} pointerEvents="box-none">
          {children}
        </View>
      </View>
    </View>
  );
}

export const StoryPublishOverlay = StoryPublishCanvas;

const styles = StyleSheet.create({
  stageHost: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardShell: {
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  mediaClip: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  chromeLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    pointerEvents: 'box-none',
  },
});
