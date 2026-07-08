import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { ReactNode } from 'react';
import {
  clampStoryFraming,
  computeStoryFramingMetrics,
  DEFAULT_STORY_FRAMING,
  STORY_AUTO_FRAME_ZOOM,
  storyFramingToPixels,
  type StoryFraming,
} from '@/features/stories/utils/storyFraming';

type StoryFramingEditorProps = {
  children: ReactNode;
  framing: StoryFraming;
  onFramingChange: (framing: StoryFraming) => void;
  mediaWidth: number;
  mediaHeight: number;
  enabled?: boolean;
  /** Metin sürüklenirken / pinch yapılırken medya jestlerini kapat */
  mediaGesturesEnabled?: boolean;
  /**
   * false = pinch/pan/double-tap kapalı.
   * Ağaç aynı kalır — interactive flip ile remount / siyah ekran olmaz (IG tarzı).
   */
  interactive?: boolean;
};

export function StoryFramingEditor({
  children,
  framing,
  onFramingChange,
  mediaWidth,
  mediaHeight,
  enabled = true,
  mediaGesturesEnabled = true,
  interactive = true,
}: StoryFramingEditorProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const autoFitMediaKeyRef = useRef('');

  const metrics = useMemo(
    () => computeStoryFramingMetrics(mediaWidth, mediaHeight, layout.width, layout.height),
    [layout.height, layout.width, mediaHeight, mediaWidth],
  );

  const pixels = useMemo(
    () => storyFramingToPixels(framing, layout.width, layout.height),
    [framing, layout.height, layout.width],
  );

  const scale = useSharedValue(pixels.zoom);
  const savedScale = useSharedValue(pixels.zoom);
  const translateX = useSharedValue(pixels.translateX);
  const translateY = useSharedValue(pixels.translateY);
  const savedTranslateX = useSharedValue(pixels.translateX);
  const savedTranslateY = useSharedValue(pixels.translateY);

  useEffect(() => {
    scale.value = pixels.zoom;
    savedScale.value = pixels.zoom;
    translateX.value = pixels.translateX;
    translateY.value = pixels.translateY;
    savedTranslateX.value = pixels.translateX;
    savedTranslateY.value = pixels.translateY;
  }, [
    pixels.translateX,
    pixels.translateY,
    pixels.zoom,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
  ]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
    }
  }, []);

  const commitFraming = useCallback(
    (nextZoom: number, nextX: number, nextY: number) => {
      if (layout.width <= 0 || layout.height <= 0) return;
      const next = clampStoryFraming(
        {
          ...framing,
          zoom: nextZoom,
          translateXNorm: nextX / layout.width,
          translateYNorm: nextY / layout.height,
        },
        metrics.baseWidth,
        metrics.baseHeight,
        layout.width,
        layout.height,
        metrics.minZoom,
        metrics.maxZoom,
      );
      onFramingChange(next);
    },
    [framing, layout.height, layout.width, metrics, onFramingChange],
  );

  useEffect(() => {
    const mediaKey = `${mediaWidth}x${mediaHeight}`;
    if (autoFitMediaKeyRef.current === mediaKey) return;
    if (layout.width <= 0 || layout.height <= 0 || mediaWidth <= 0 || mediaHeight <= 0) return;

    autoFitMediaKeyRef.current = mediaKey;
    const next = clampStoryFraming(
      {
        ...framing,
        zoom: STORY_AUTO_FRAME_ZOOM,
        translateXNorm: 0,
        translateYNorm: 0,
        mediaWidth,
        mediaHeight,
      },
      metrics.baseWidth,
      metrics.baseHeight,
      layout.width,
      layout.height,
      metrics.minZoom,
      metrics.maxZoom,
    );
    onFramingChange(next);
  }, [
    framing,
    layout.height,
    layout.width,
    mediaHeight,
    mediaWidth,
    metrics.baseHeight,
    metrics.baseWidth,
    metrics.maxZoom,
    metrics.minZoom,
    onFramingChange,
  ]);

  const gestureActive = enabled && mediaGesturesEnabled && interactive;

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(gestureActive)
        .onStart(() => {
          savedScale.value = scale.value;
        })
        .onUpdate((e) => {
          const next = savedScale.value * e.scale;
          scale.value = Math.min(metrics.maxZoom, Math.max(metrics.minZoom, next));
        })
        .onEnd(() => {
          runOnJS(commitFraming)(scale.value, translateX.value, translateY.value);
        }),
    [commitFraming, gestureActive, metrics.maxZoom, metrics.minZoom, savedScale, scale, translateX, translateY],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(gestureActive)
        .minPointers(1)
        .maxPointers(1)
        .onStart(() => {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        })
        .onUpdate((e) => {
          translateX.value = savedTranslateX.value + e.translationX;
          translateY.value = savedTranslateY.value + e.translationY;
        })
        .onEnd(() => {
          runOnJS(commitFraming)(scale.value, translateX.value, translateY.value);
        }),
    [commitFraming, gestureActive, savedTranslateX, savedTranslateY, scale, translateX, translateY],
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(gestureActive)
        .numberOfTaps(2)
        .onEnd(() => {
          const atFit = Math.abs(savedScale.value - metrics.minZoom) < 0.06;
          const targetZoom = atFit ? 1 : metrics.minZoom;
          scale.value = withTiming(targetZoom);
          savedScale.value = targetZoom;
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
          runOnJS(commitFraming)(targetZoom, 0, 0);
        }),
    [
      commitFraming,
      gestureActive,
      metrics.minZoom,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      scale,
      translateX,
      translateY,
    ],
  );

  const composed = useMemo(() => Gesture.Simultaneous(pinch, pan, doubleTap), [doubleTap, pan, pinch]);

  const mediaStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const hasLayout = layout.width > 0 && layout.height > 0;

  // Tek stabil ağaç: Text/Müzik modunda remount yok → Image/Video siyah ekrana düşmez.
  // Layout hazır olmasa da aynı Animated.View altında render — fallback ↔ stage swap yok.
  return (
    <GestureDetector gesture={composed}>
      <View
        style={[styles.root, { backgroundColor: framing.backgroundColor ?? DEFAULT_STORY_FRAMING.backgroundColor }]}
        onLayout={onLayout}
        collapsable={false}
      >
        <View style={styles.stage} pointerEvents="box-none">
          <Animated.View
            style={[
              hasLayout
                ? { width: metrics.baseWidth, height: metrics.baseHeight }
                : styles.mediaFill,
              mediaStyle,
            ]}
            pointerEvents="none"
          >
            {children}
          </Animated.View>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  mediaFill: {
    ...StyleSheet.absoluteFillObject,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
