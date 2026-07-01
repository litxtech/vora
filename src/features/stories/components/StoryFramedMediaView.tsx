import { useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import type { ReactNode } from 'react';
import {
  computeStoryFramingMetrics,
  DEFAULT_STORY_FRAMING,
  storyFramingToPixels,
  type StoryFraming,
} from '@/features/stories/utils/storyFraming';

type StoryFramedMediaViewProps = {
  framing: StoryFraming;
  children: ReactNode;
};

/** İzleyicide veya statik önizlemede kaydırılmış / yakınlaştırılmış hikâye medyası. */
export function StoryFramedMediaView({ framing, children }: StoryFramedMediaViewProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
    }
  }, []);

  const metrics = computeStoryFramingMetrics(
    framing.mediaWidth,
    framing.mediaHeight,
    layout.width,
    layout.height,
  );
  const pixels = storyFramingToPixels(framing, layout.width, layout.height);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: framing.backgroundColor ?? DEFAULT_STORY_FRAMING.backgroundColor },
      ]}
      onLayout={onLayout}
    >
      {layout.width > 0 ? (
        <View style={styles.stage}>
          <View
            style={{
              width: metrics.baseWidth,
              height: metrics.baseHeight,
              transform: [
                { translateX: pixels.translateX },
                { translateY: pixels.translateY },
                { scale: pixels.zoom },
              ],
            }}
          >
            {children}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
