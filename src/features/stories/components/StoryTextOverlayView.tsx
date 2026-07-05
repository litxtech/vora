import { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { DraggableTextOverlay } from '@/features/vora-studio/components/DraggableTextOverlay';
import type { StudioTextOverlay } from '@/features/vora-studio/types';

type StoryTextOverlayViewProps = {
  overlays: StudioTextOverlay[];
};

export function StoryTextOverlayView({ overlays }: StoryTextOverlayViewProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
    }
  }, []);

  if (overlays.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {layout.width > 0
        ? overlays.map((item) => (
            <DraggableTextOverlay
              key={item.id}
              overlay={item}
              containerWidth={layout.width}
              containerHeight={layout.height}
              editable={false}
              visible
              selected={false}
              chrome="minimal"
            />
          ))
        : null}
    </View>
  );
}
