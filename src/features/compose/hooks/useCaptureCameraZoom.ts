import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  CAPTURE_LINEAR_ZOOM_MAX,
  CAPTURE_LINEAR_ZOOM_MIN,
  CAPTURE_PINCH_SENSITIVITY,
  CAPTURE_ZOOM_INDICATOR_HIDE_MS,
  IOS_LENS_TELEPHOTO,
  IOS_LENS_ULTRA_WIDE,
  IOS_LENS_WIDE,
} from '@/features/compose/constants/cameraZoom';
import {
  clampLinearZoom,
  displayZoomToLinear,
  linearZoomToDisplay,
  railPositionToLinear,
} from '@/features/compose/utils/cameraZoom';

function clampLinearZoomWorklet(value: number): number {
  'worklet';
  return Math.min(CAPTURE_LINEAR_ZOOM_MAX, Math.max(CAPTURE_LINEAR_ZOOM_MIN, value));
}

type UseCaptureCameraZoomOptions = {
  enabled: boolean;
  resetKey: string;
  onFlipCamera: () => void;
};

type ZoomPreset = {
  id: string;
  label: string;
  linearZoom: number;
  lens?: string;
};

function resolveIosPresets(lenses: string[]): ZoomPreset[] {
  const presets: ZoomPreset[] = [];

  if (lenses.includes(IOS_LENS_ULTRA_WIDE)) {
    presets.push({
      id: '0.5x',
      label: '.5',
      linearZoom: 0,
      lens: IOS_LENS_ULTRA_WIDE,
    });
  }

  presets.push({
    id: '1x',
    label: '1x',
    linearZoom: 0,
    lens: lenses.includes(IOS_LENS_WIDE) ? IOS_LENS_WIDE : undefined,
  });

  if (lenses.includes(IOS_LENS_TELEPHOTO)) {
    presets.push({
      id: '2x',
      label: '2',
      linearZoom: 0,
      lens: IOS_LENS_TELEPHOTO,
    });
  } else {
    presets.push({
      id: '2x-digital',
      label: '2',
      linearZoom: displayZoomToLinear(2),
    });
  }

  return presets;
}

export function useCaptureCameraZoom({
  enabled,
  resetKey,
  onFlipCamera,
}: UseCaptureCameraZoomOptions) {
  const [linearZoom, setLinearZoom] = useState(0);
  const [selectedLens, setSelectedLens] = useState<string | undefined>(undefined);
  const [availableLenses, setAvailableLenses] = useState<string[]>([]);
  const [indicatorVisible, setIndicatorVisible] = useState(false);
  const [activePresetId, setActivePresetId] = useState('1x');

  const linearZoomRef = useRef(0);
  const hideIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHapticDisplayRef = useRef(1);

  const savedLinear = useSharedValue(0);
  const isPinching = useSharedValue(false);

  const displayZoom = linearZoomToDisplay(linearZoom);

  const presets = useMemo(() => {
    if (Platform.OS === 'ios' && availableLenses.length > 0) {
      return resolveIosPresets(availableLenses);
    }
    return [
      { id: '1x', label: '1x', linearZoom: 0 },
      { id: '2x', label: '2', linearZoom: displayZoomToLinear(2) },
      { id: '3x', label: '3', linearZoom: displayZoomToLinear(3) },
    ] satisfies ZoomPreset[];
  }, [availableLenses]);

  const clearHideIndicatorTimer = useCallback(() => {
    if (hideIndicatorTimerRef.current) {
      clearTimeout(hideIndicatorTimerRef.current);
      hideIndicatorTimerRef.current = null;
    }
  }, []);

  const scheduleHideIndicator = useCallback(() => {
    clearHideIndicatorTimer();
    hideIndicatorTimerRef.current = setTimeout(() => {
      setIndicatorVisible(false);
    }, CAPTURE_ZOOM_INDICATOR_HIDE_MS);
  }, [clearHideIndicatorTimer]);

  const showIndicator = useCallback(() => {
    setIndicatorVisible(true);
    scheduleHideIndicator();
  }, [scheduleHideIndicator]);

  const syncPresetFromZoom = useCallback(
    (nextLinear: number, nextLens?: string) => {
      const matched = presets.find((preset) => {
        if (preset.lens) return preset.lens === nextLens && Math.abs(nextLinear) < 0.02;
        return Math.abs(preset.linearZoom - nextLinear) < 0.04;
      });
      setActivePresetId(matched?.id ?? '');
    },
    [presets],
  );

  const commitLinearZoom = useCallback(
    (nextLinear: number, options?: { lens?: string; haptic?: boolean }) => {
      const clamped = clampLinearZoom(nextLinear);
      linearZoomRef.current = clamped;
      setLinearZoom(clamped);

      if (options?.lens !== undefined) {
        setSelectedLens(options.lens);
      }

      syncPresetFromZoom(clamped, options?.lens ?? selectedLens);

      const nextDisplay = linearZoomToDisplay(clamped);
      const crossedInteger =
        Math.floor(nextDisplay) !== Math.floor(lastHapticDisplayRef.current) &&
        nextDisplay >= 1.8;
      if (options?.haptic || crossedInteger) {
        void Haptics.selectionAsync();
      }
      lastHapticDisplayRef.current = nextDisplay;
      showIndicator();
    },
    [selectedLens, showIndicator, syncPresetFromZoom],
  );

  const resetZoom = useCallback(() => {
    linearZoomRef.current = 0;
    savedLinear.value = 0;
    lastHapticDisplayRef.current = 1;
    setLinearZoom(0);
    setSelectedLens(undefined);
    setActivePresetId('1x');
    setIndicatorVisible(false);
    clearHideIndicatorTimer();
  }, [clearHideIndicatorTimer, savedLinear]);

  useEffect(() => {
    resetZoom();
  }, [resetKey, resetZoom]);

  useEffect(() => {
    linearZoomRef.current = linearZoom;
    savedLinear.value = linearZoom;
  }, [linearZoom, savedLinear]);

  useEffect(() => {
    return () => clearHideIndicatorTimer();
  }, [clearHideIndicatorTimer]);

  const handleFlipCamera = useCallback(() => {
    resetZoom();
    onFlipCamera();
  }, [onFlipCamera, resetZoom]);

  const applyPreset = useCallback(
    (preset: ZoomPreset) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      commitLinearZoom(preset.linearZoom, { lens: preset.lens, haptic: true });
      setActivePresetId(preset.id);
    },
    [commitLinearZoom],
  );

  const handleAvailableLensesChanged = useCallback(
    (lenses: string[]) => {
      setAvailableLenses(lenses);
      if (Platform.OS === 'ios' && lenses.includes(IOS_LENS_WIDE) && !selectedLens) {
        setSelectedLens(IOS_LENS_WIDE);
      }
    },
    [selectedLens],
  );

  const updateZoomFromPinch = useCallback(
    (nextLinear: number) => {
      commitLinearZoom(nextLinear);
    },
    [commitLinearZoom],
  );

  const finishPinch = useCallback(() => {
    scheduleHideIndicator();
  }, [scheduleHideIndicator]);

  const updateZoomFromRail = useCallback(
    (position: number) => {
      commitLinearZoom(railPositionToLinear(position));
    },
    [commitLinearZoom],
  );

  const handleZoomRailStart = useCallback(() => {
    showIndicator();
  }, [showIndicator]);

  const handleZoomRailEnd = useCallback(() => {
    scheduleHideIndicator();
  }, [scheduleHideIndicator]);

  const updateZoomFromPinchRef = useRef(updateZoomFromPinch);
  const finishPinchRef = useRef(finishPinch);
  const showIndicatorRef = useRef(showIndicator);
  const handleFlipCameraRef = useRef(handleFlipCamera);

  useEffect(() => {
    updateZoomFromPinchRef.current = updateZoomFromPinch;
    finishPinchRef.current = finishPinch;
    showIndicatorRef.current = showIndicator;
    handleFlipCameraRef.current = handleFlipCamera;
  }, [finishPinch, handleFlipCamera, showIndicator, updateZoomFromPinch]);

  const invokeFlipCamera = useCallback(() => {
    handleFlipCameraRef.current();
  }, []);

  const invokeUpdatePinch = useCallback((value: number) => {
    updateZoomFromPinchRef.current(value);
  }, []);

  const invokeFinishPinch = useCallback(() => {
    finishPinchRef.current();
  }, []);

  const invokeShowIndicator = useCallback(() => {
    showIndicatorRef.current();
  }, []);

  const previewGesture = useMemo(() => {
    const doubleTap = Gesture.Tap()
      .enabled(enabled)
      .numberOfTaps(2)
      .maxDuration(250)
      .onEnd(() => {
        runOnJS(invokeFlipCamera)();
      });

    const pinch = Gesture.Pinch()
      .enabled(enabled)
      .onStart(() => {
        isPinching.value = true;
        savedLinear.value = linearZoomRef.current;
        runOnJS(invokeShowIndicator)();
      })
      .onUpdate((event) => {
        'worklet';
        const next = clampLinearZoomWorklet(
          savedLinear.value * event.scale ** CAPTURE_PINCH_SENSITIVITY,
        );
        runOnJS(invokeUpdatePinch)(next);
      })
      .onEnd(() => {
        isPinching.value = false;
        runOnJS(invokeFinishPinch)();
      })
      .onFinalize(() => {
        isPinching.value = false;
      });

    return Gesture.Simultaneous(pinch, doubleTap);
  }, [enabled, invokeFinishPinch, invokeFlipCamera, invokeShowIndicator, invokeUpdatePinch, isPinching, savedLinear]);

  return {
    linearZoom,
    displayZoom,
    selectedLens,
    indicatorVisible,
    activePresetId,
    presets,
    previewGesture,
    applyPreset,
    handleAvailableLensesChanged,
    updateZoomFromRail,
    handleZoomRailStart,
    handleZoomRailEnd,
    flipCameraWithReset: handleFlipCamera,
    resetZoom,
  };
}
