import { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { StoryLinkButton } from '@/features/stories/components/StoryLinkButton';
import { StorySwipeUpCta } from '@/features/stories/components/StorySwipeUpCta';
import {
  clampLinkNorm,
  type StoryLinkManifest,
} from '@/features/stories/utils/storyLinks';

type StoryLinkEditorProps = {
  links: StoryLinkManifest[];
  onLinksChange: (links: StoryLinkManifest[]) => void;
  enabled?: boolean;
};

type DraggableLinkProps = {
  link: StoryLinkManifest;
  layout: { width: number; height: number };
  enabled: boolean;
  onMove: (id: string, xNorm: number, yNorm: number) => void;
};

function DraggableLinkButton({ link, layout, enabled, onMove }: DraggableLinkProps) {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  const commit = useCallback(
    (dx: number, dy: number) => {
      const baseX = link.xNorm * layout.width;
      const baseY = link.yNorm * layout.height;
      onMove(
        link.id,
        clampLinkNorm((baseX + dx) / layout.width),
        clampLinkNorm((baseY + dy) / layout.height),
      );
    },
    [layout.height, layout.width, link.id, link.xNorm, link.yNorm, onMove],
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

  const style = useAnimatedStyle(() => ({
    left: link.xNorm * layout.width + dragX.value,
    top: link.yNorm * layout.height + dragY.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.anchor, style]}>
        <StoryLinkButton link={link} compact />
      </Animated.View>
    </GestureDetector>
  );
}

export function StoryLinkEditor({ links, onLinksChange, enabled = true }: StoryLinkEditorProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
    }
  }, []);

  const handleMove = useCallback(
    (id: string, xNorm: number, yNorm: number) => {
      onLinksChange(
        links.map((item) => (item.id === id ? { ...item, xNorm, yNorm } : item)),
      );
    },
    [links, onLinksChange],
  );

  if (links.length === 0) return null;

  if (links.length === 1) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <StorySwipeUpCta link={links[0]} preview />
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="box-none">
      {layout.width > 0
        ? links.map((link) => (
            <DraggableLinkButton
              key={link.id}
              link={link}
              layout={layout}
              enabled={enabled}
              onMove={handleMove}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    zIndex: 20,
  },
});
