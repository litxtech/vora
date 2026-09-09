import { useEffect, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOMED_THRESHOLD = 1.04;

type UseStoryViewerMediaZoomOptions = {
  resetKey: string;
  enabled: boolean;
};

export function useStoryViewerMediaZoom({ resetKey, enabled }: UseStoryViewerMediaZoomOptions) {
  const scale = useSharedValue(MIN_ZOOM);
  const savedScale = useSharedValue(MIN_ZOOM);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const isZoomed = useSharedValue(0);

  const resetZoom = () => {
    'worklet';
    scale.value = withTiming(MIN_ZOOM);
    savedScale.value = MIN_ZOOM;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    isZoomed.value = 0;
  };

  useEffect(() => {
    scale.value = MIN_ZOOM;
    savedScale.value = MIN_ZOOM;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    isZoomed.value = 0;
  }, [resetKey, isZoomed, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY]);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(enabled)
        .onStart(() => {
          savedScale.value = scale.value;
        })
        .onUpdate((e) => {
          const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, savedScale.value * e.scale));
          scale.value = next;
          isZoomed.value = next > ZOOMED_THRESHOLD ? 1 : 0;
        })
        .onEnd(() => {
          savedScale.value = scale.value;
          if (scale.value <= ZOOMED_THRESHOLD) {
            scale.value = withTiming(MIN_ZOOM);
            savedScale.value = MIN_ZOOM;
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            isZoomed.value = 0;
          }
        }),
    [enabled, isZoomed, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY],
  );

  const zoomPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .minPointers(1)
        .maxPointers(1)
        .manualActivation(true)
        .onTouchesMove((_, state) => {
          if (scale.value > ZOOMED_THRESHOLD) {
            state.activate();
          } else {
            state.fail();
          }
        })
        .onStart(() => {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        })
        .onUpdate((e) => {
          translateX.value = savedTranslateX.value + e.translationX;
          translateY.value = savedTranslateY.value + e.translationY;
        })
        .onEnd(() => {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        }),
    [enabled, savedTranslateX, savedTranslateY, scale, translateX, translateY],
  );

  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(enabled)
        .numberOfTaps(2)
        .maxDistance(12)
        .onEnd(() => {
          if (scale.value > ZOOMED_THRESHOLD) {
            scale.value = withTiming(MIN_ZOOM);
            savedScale.value = MIN_ZOOM;
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            isZoomed.value = 0;
            return;
          }
          const target = 2;
          scale.value = withTiming(target);
          savedScale.value = target;
          isZoomed.value = 1;
        }),
    [enabled, isZoomed, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY],
  );

  const mediaZoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return {
    isZoomed,
    mediaZoomStyle,
    pinchGesture,
    zoomPanGesture,
    doubleTapGesture,
    resetZoom,
  };
}

export function isStoryViewerMediaZoomed(isZoomed: SharedValue<number>): boolean {
  'worklet';
  return isZoomed.value === 1;
}
