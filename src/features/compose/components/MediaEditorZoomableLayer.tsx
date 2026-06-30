import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { ReactNode } from 'react';
import {
  clampZoomPan,
  computeContainSize,
  type MediaEditorZoomState,
} from '@/features/compose/utils/mediaEditorZoom';

const MAX_ZOOM_FACTOR = 4;

type Props = {
  children: ReactNode;
  enabled?: boolean;
  containerWidth: number;
  containerHeight: number;
  mediaWidth: number;
  mediaHeight: number;
  zoom: MediaEditorZoomState;
  onZoomChange: (zoom: MediaEditorZoomState) => void;
};

export function MediaEditorZoomableLayer({
  children,
  enabled = true,
  containerWidth,
  containerHeight,
  mediaWidth,
  mediaHeight,
  zoom,
  onZoomChange,
}: Props) {
  const { width: baseWidth, height: baseHeight, coverScale } = useMemo(
    () => computeContainSize(mediaWidth, mediaHeight, containerWidth, containerHeight),
    [mediaWidth, mediaHeight, containerWidth, containerHeight],
  );

  const maxScale = Math.max(coverScale * MAX_ZOOM_FACTOR, 1);

  const scale = useSharedValue(zoom.zoomScale);
  const savedScale = useSharedValue(zoom.zoomScale);
  const translateX = useSharedValue(zoom.zoomTranslateX);
  const translateY = useSharedValue(zoom.zoomTranslateY);
  const savedTranslateX = useSharedValue(zoom.zoomTranslateX);
  const savedTranslateY = useSharedValue(zoom.zoomTranslateY);

  useEffect(() => {
    scale.value = zoom.zoomScale;
    savedScale.value = zoom.zoomScale;
    translateX.value = zoom.zoomTranslateX;
    translateY.value = zoom.zoomTranslateY;
    savedTranslateX.value = zoom.zoomTranslateX;
    savedTranslateY.value = zoom.zoomTranslateY;
  }, [
    zoom.zoomScale,
    zoom.zoomTranslateX,
    zoom.zoomTranslateY,
    scale,
    savedScale,
    translateX,
    translateY,
    savedTranslateX,
    savedTranslateY,
  ]);

  const commitZoom = useCallback(
    (nextScale: number, nextX: number, nextY: number) => {
      onZoomChange(
        clampZoomPan(
          nextScale,
          nextX,
          nextY,
          baseWidth,
          baseHeight,
          containerWidth,
          containerHeight,
          maxScale,
        ),
      );
    },
    [onZoomChange, baseWidth, baseHeight, containerWidth, containerHeight, maxScale],
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(enabled)
        .onStart(() => {
          savedScale.value = scale.value;
        })
        .onUpdate((e) => {
          const next = savedScale.value * e.scale;
          scale.value = Math.min(maxScale, Math.max(1, next));
        })
        .onEnd(() => {
          runOnJS(commitZoom)(scale.value, translateX.value, translateY.value);
        }),
    [enabled, maxScale, commitZoom, savedScale, scale, translateX, translateY],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .minPointers(1)
        .maxPointers(1)
        .onStart(() => {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        })
        .onUpdate((e) => {
          if (scale.value <= 1) return;
          translateX.value = savedTranslateX.value + e.translationX;
          translateY.value = savedTranslateY.value + e.translationY;
        })
        .onEnd(() => {
          runOnJS(commitZoom)(scale.value, translateX.value, translateY.value);
        }),
    [enabled, commitZoom, savedScale, scale, savedTranslateX, translateX, translateY],
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(enabled)
        .numberOfTaps(2)
        .onEnd(() => {
          const targetScale = savedScale.value > 1.05 ? 1 : Math.min(maxScale, coverScale);
          scale.value = withTiming(targetScale);
          savedScale.value = targetScale;
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
          runOnJS(commitZoom)(targetScale, 0, 0);
        }),
    [enabled, coverScale, maxScale, commitZoom, savedScale, scale, translateX, translateY, savedTranslateX],
  );

  const composed = useMemo(
    () => Gesture.Simultaneous(pinch, pan, doubleTap),
    [pinch, pan, doubleTap],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (containerWidth <= 0 || containerHeight <= 0) {
    return <View style={styles.fill} />;
  }

  return (
    <View style={styles.clip}>
      <GestureDetector gesture={composed}>
        <View style={styles.centerStage}>
          <Animated.View style={[{ width: baseWidth, height: baseHeight }, animatedStyle]}>
            {children}
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  clip: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
