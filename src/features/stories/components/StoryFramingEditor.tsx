import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  runOnJS,
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
  /** true = yalnızca jest katmanı; medya altta StoryFramedMediaView ile render edilir */
  overlayOnly?: boolean;
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
  overlayOnly = false,
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

  const gestureActive = enabled && mediaGesturesEnabled && interactive && !overlayOnly;
  const overlayGesturesEnabled = enabled && mediaGesturesEnabled && overlayOnly;
  const gesturesEnabled = gestureActive || overlayGesturesEnabled;

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(gesturesEnabled)
        .onStart(() => {
          savedScale.value = scale.value;
        })
        .onUpdate((e) => {
          const next = savedScale.value * e.scale;
          scale.value = Math.min(metrics.maxZoom, Math.max(metrics.minZoom, next));
          if (overlayOnly) {
            runOnJS(commitFraming)(scale.value, translateX.value, translateY.value);
          }
        })
        .onEnd(() => {
          runOnJS(commitFraming)(scale.value, translateX.value, translateY.value);
        }),
    [commitFraming, gesturesEnabled, metrics.maxZoom, metrics.minZoom, overlayOnly, savedScale, scale, translateX, translateY],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(gesturesEnabled)
        .minPointers(1)
        .maxPointers(1)
        .onStart(() => {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        })
        .onUpdate((e) => {
          translateX.value = savedTranslateX.value + e.translationX;
          translateY.value = savedTranslateY.value + e.translationY;
          if (overlayOnly) {
            runOnJS(commitFraming)(scale.value, translateX.value, translateY.value);
          }
        })
        .onEnd(() => {
          runOnJS(commitFraming)(scale.value, translateX.value, translateY.value);
        }),
    [commitFraming, gesturesEnabled, overlayOnly, savedTranslateX, savedTranslateY, scale, translateX, translateY],
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(gesturesEnabled)
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
      gesturesEnabled,
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

  const hasLayout = layout.width > 0 && layout.height > 0;

  if (overlayOnly) {
    return (
      <GestureDetector gesture={composed}>
        <View
          style={[styles.root, styles.overlayRoot]}
          onLayout={onLayout}
          collapsable={false}
        >
          <View style={styles.gestureFill} pointerEvents="box-none">
            {children}
          </View>
        </View>
      </GestureDetector>
    );
  }

  // Tek stabil ağaç: medya transformu statik View ile (Animated yerine) — yerel görsel kaybını önler.
  const zoom = Math.max(0.05, pixels.zoom);

  return (
    <GestureDetector gesture={composed}>
      <View
        style={[styles.root, { backgroundColor: framing.backgroundColor ?? DEFAULT_STORY_FRAMING.backgroundColor }]}
        onLayout={onLayout}
        collapsable={false}
      >
        <View style={styles.stage} pointerEvents="box-none">
          {hasLayout ? (
            <View
              style={{
                width: metrics.baseWidth,
                height: metrics.baseHeight,
                transform: [
                  { translateX: pixels.translateX },
                  { translateY: pixels.translateY },
                  { scale: zoom },
                ],
              }}
              pointerEvents="none"
            >
              {children}
            </View>
          ) : (
            <View style={styles.fallback} pointerEvents="none">
              {children}
            </View>
          )}
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
  overlayRoot: {
    backgroundColor: 'transparent',
  },
  gestureFill: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    width: '100%',
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
