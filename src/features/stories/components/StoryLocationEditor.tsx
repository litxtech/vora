import { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { StoryLocationBadge } from '@/features/stories/components/StoryLocationBadge';
import type { SelectedLocation } from '@/features/compose/components/LocationPicker';
import {
  clampStoryLocationXNorm,
  clampStoryLocationYNorm,
  STORY_LOCATION_BADGE_HEIGHT,
  storyLocationSubtitle,
  type StoryLocationPosition,
} from '@/features/stories/utils/storyLocation';

type StoryLocationEditorProps = {
  location: SelectedLocation;
  position: StoryLocationPosition;
  onPositionChange: (position: StoryLocationPosition) => void;
  onPress?: () => void;
  enabled?: boolean;
};

export function StoryLocationEditor({
  location,
  position,
  onPositionChange,
  onPress,
  enabled = true,
}: StoryLocationEditorProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
    }
  }, []);

  const handleMove = useCallback(
    (dx: number, dy: number) => {
      if (layout.width <= 0 || layout.height <= 0) return;
      // yNorm rozetin alt kenarı; sürüklerken üst-sol (left/top) sabit noktadan hesapla.
      const baseX = position.xNorm * layout.width;
      const baseY = position.yNorm * layout.height - STORY_LOCATION_BADGE_HEIGHT;
      onPositionChange({
        xNorm: clampStoryLocationXNorm((baseX + dx) / layout.width),
        yNorm: clampStoryLocationYNorm((baseY + dy + STORY_LOCATION_BADGE_HEIGHT) / layout.height),
      });
    },
    [layout.height, layout.width, onPositionChange, position.xNorm, position.yNorm],
  );

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="box-none">
      {layout.width > 0 ? (
        <DraggableLocationBadge
          label={location.label}
          subtitle={storyLocationSubtitle(location)}
          position={position}
          layout={layout}
          enabled={enabled}
          onMove={handleMove}
          onPress={onPress}
        />
      ) : null}
    </View>
  );
}

type DraggableLocationBadgeProps = {
  label: string;
  subtitle: string | null;
  position: StoryLocationPosition;
  layout: { width: number; height: number };
  enabled: boolean;
  onMove: (dx: number, dy: number) => void;
  onPress?: () => void;
};

function DraggableLocationBadge({
  label,
  subtitle,
  position,
  layout,
  enabled,
  onMove,
  onPress,
}: DraggableLocationBadgeProps) {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  const commit = useCallback(
    (dx: number, dy: number) => {
      onMove(dx, dy);
    },
    [onMove],
  );

  const pan = Gesture.Pan()
    .enabled(enabled)
    .onUpdate((e) => {
      dragX.value = e.translationX;
      dragY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(commit)(e.translationX, e.translationY);
      dragX.value = 0;
      dragY.value = 0;
    });

  // %-translateY kullanma — RN’de parent yüksekliğine sapıp rozeti kart dışına (yukarı) atıyordu.
  const style = useAnimatedStyle(() => ({
    left: position.xNorm * layout.width + dragX.value,
    top:
      position.yNorm * layout.height -
      STORY_LOCATION_BADGE_HEIGHT +
      dragY.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.anchor, style]} pointerEvents="box-none">
        <View style={styles.badgeHost}>
          <StoryLocationBadge
            label={label}
            subtitle={subtitle}
            onPress={onPress}
            draggable={enabled}
            inline
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    zIndex: 12,
  },
  badgeHost: {
    position: 'relative',
    left: 0,
    bottom: 0,
  },
});
