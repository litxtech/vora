import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  CAPTURE_LINEAR_ZOOM_MIN,
  CAPTURE_MAX_DISPLAY_ZOOM,
  CAPTURE_MIN_DISPLAY_ZOOM,
  CAPTURE_PINCH_SENSITIVITY,
  CAPTURE_ZOOM_INDICATOR_HIDE_MS,
  IOS_LENS_TELEPHOTO,
  IOS_LENS_ULTRA_WIDE,
  IOS_LENS_WIDE,
} from '@/features/compose/constants/cameraZoom';
import {
  clampDisplayZoom,
  displayZoomToLinear,
  linearZoomToDisplay,
  railPositionToDisplayZoom,
  resolveCaptureZoomFromDisplay,
} from '@/features/compose/utils/cameraZoom';

type UseCaptureCameraZoomOptions = {
  enabled: boolean;
  /** Video kaydı sırasında yalnızca pinch — preset / rail gizlenir */
  recording?: boolean;
  resetKey: string;
  onFlipCamera: () => void;
};

type ZoomPreset = {
  id: string;
  label: string;
  displayZoom: number;
  linearZoom: number;
  lens?: string;
};

function resolveIosPresets(lenses: string[]): ZoomPreset[] {
  const presets: ZoomPreset[] = [];

  if (lenses.includes(IOS_LENS_ULTRA_WIDE)) {
    presets.push({
      id: '0.5x',
      label: '.5',
      displayZoom: CAPTURE_MIN_DISPLAY_ZOOM,
      linearZoom: 0,
      lens: IOS_LENS_ULTRA_WIDE,
    });
  }

  presets.push({
    id: '1x',
    label: '1x',
    displayZoom: 1,
    linearZoom: 0,
    lens: lenses.includes(IOS_LENS_WIDE) ? IOS_LENS_WIDE : undefined,
  });

  if (lenses.includes(IOS_LENS_TELEPHOTO)) {
    presets.push({
      id: '2x',
      label: '2',
      displayZoom: 2,
      linearZoom: 0,
      lens: IOS_LENS_TELEPHOTO,
    });
  } else {
    presets.push({
      id: '2x-digital',
      label: '2',
      displayZoom: 2,
      linearZoom: displayZoomToLinear(2),
    });
  }

  return presets;
}

export function useCaptureCameraZoom({
  enabled,
  recording = false,
  resetKey,
  onFlipCamera,
}: UseCaptureCameraZoomOptions) {
  const [linearZoom, setLinearZoom] = useState(0);
  const [selectedLens, setSelectedLens] = useState<string | undefined>(undefined);
  const [availableLenses, setAvailableLenses] = useState<string[]>([]);
  const [indicatorVisible, setIndicatorVisible] = useState(false);
  const [activePresetId, setActivePresetId] = useState('1x');
  const [displayZoom, setDisplayZoom] = useState(1);

  const linearZoomRef = useRef(0);
  const displayZoomRef = useRef(1);
  const hideIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHapticDisplayRef = useRef(1);
  const selectedLensRef = useRef<string | undefined>(undefined);
  const recordingLensRef = useRef<string | undefined>(undefined);
  const isPinchingRef = useRef(false);
  const pinchThrottleRef = useRef(0);

  selectedLensRef.current = selectedLens;

  useEffect(() => {
    if (recording) {
      if (recordingLensRef.current === undefined) {
        recordingLensRef.current = selectedLensRef.current;
      }
      return;
    }
    recordingLensRef.current = undefined;
  }, [recording]);

  const savedDisplay = useSharedValue(1);
  const isPinching = useSharedValue(false);

  const presets = useMemo(() => {
    if (Platform.OS === 'ios' && availableLenses.length > 0) {
      return resolveIosPresets(availableLenses);
    }
    return [
      {
        id: '0.5x',
        label: '.5',
        displayZoom: CAPTURE_MIN_DISPLAY_ZOOM,
        linearZoom: CAPTURE_LINEAR_ZOOM_MIN,
      },
      {
        id: '1x',
        label: '1x',
        displayZoom: 1,
        linearZoom: displayZoomToLinear(1),
      },
      {
        id: '2x',
        label: '2',
        displayZoom: 2,
        linearZoom: displayZoomToLinear(2),
      },
      {
        id: '5x',
        label: '5',
        displayZoom: 5,
        linearZoom: displayZoomToLinear(5),
      },
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
    (nextDisplay: number, nextLens?: string) => {
      const matched = presets.find((preset) => {
        if (preset.lens) {
          return preset.lens === nextLens && Math.abs(preset.displayZoom - nextDisplay) < 0.12;
        }
        return Math.abs(preset.displayZoom - nextDisplay) < 0.12;
      });
      setActivePresetId(matched?.id ?? '');
    },
    [presets],
  );

  const commitDisplayZoom = useCallback(
    (nextDisplay: number, options?: { lens?: string; linearZoom?: number; haptic?: boolean }) => {
      let resolved =
        options?.lens != null && options.linearZoom != null
          ? {
              displayZoom: clampDisplayZoom(nextDisplay),
              lens: options.lens,
              linearZoom: options.linearZoom,
            }
          : resolveCaptureZoomFromDisplay(nextDisplay, {
              isIos: Platform.OS === 'ios',
              availableLenses,
            });

      if (recording) {
        const display = clampDisplayZoom(nextDisplay);
        resolved = {
          displayZoom: display,
          lens: recordingLensRef.current ?? selectedLensRef.current,
          linearZoom: displayZoomToLinear(display),
        };
      }

      linearZoomRef.current = resolved.linearZoom;
      displayZoomRef.current = resolved.displayZoom;
      setLinearZoom(resolved.linearZoom);
      setDisplayZoom(resolved.displayZoom);
      setSelectedLens(resolved.lens);

      syncPresetFromZoom(resolved.displayZoom, resolved.lens);

      const crossedInteger =
        Math.floor(resolved.displayZoom) !== Math.floor(lastHapticDisplayRef.current) &&
        resolved.displayZoom >= 1.8;
      if (options?.haptic || crossedInteger) {
        void Haptics.selectionAsync();
      }
      lastHapticDisplayRef.current = resolved.displayZoom;
      showIndicator();
    },
    [availableLenses, recording, showIndicator, syncPresetFromZoom],
  );

  const resetZoom = useCallback(() => {
    linearZoomRef.current = 0;
    displayZoomRef.current = 1;
    savedDisplay.value = 1;
    lastHapticDisplayRef.current = 1;
    setLinearZoom(0);
    setDisplayZoom(1);
    setSelectedLens(undefined);
    setActivePresetId('1x');
    setIndicatorVisible(false);
    clearHideIndicatorTimer();
  }, [clearHideIndicatorTimer, savedDisplay]);

  useEffect(() => {
    resetZoom();
  }, [resetKey, resetZoom]);

  useEffect(() => {
    linearZoomRef.current = linearZoom;
    displayZoomRef.current = displayZoom;
    savedDisplay.value = displayZoom;
  }, [displayZoom, linearZoom, savedDisplay]);

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
      commitDisplayZoom(preset.displayZoom, {
        lens: preset.lens,
        linearZoom: preset.linearZoom,
        haptic: true,
      });
      setActivePresetId(preset.id);
    },
    [commitDisplayZoom],
  );

  const handleAvailableLensesChanged = useCallback(
    (lenses: string[]) => {
      setAvailableLenses(lenses);
      if (Platform.OS !== 'ios' || lenses.length === 0) return;
      if (lenses.includes(IOS_LENS_WIDE)) {
        setSelectedLens((current) => current ?? IOS_LENS_WIDE);
      }
      if (lenses.includes(IOS_LENS_ULTRA_WIDE) && displayZoomRef.current < 1) {
        setSelectedLens(IOS_LENS_ULTRA_WIDE);
      }
    },
    [],
  );

  const refreshAvailableLenses = useCallback(
    async (fetchLenses: () => Promise<string[]>) => {
      if (Platform.OS !== 'ios') return;
      try {
        const lenses = await fetchLenses();
        handleAvailableLensesChanged(lenses);
        if (lenses.length === 0) {
          await new Promise((resolve) => setTimeout(resolve, 350));
          handleAvailableLensesChanged(await fetchLenses());
        }
      } catch {
        // lens listesi alınamazsa dijital zoom devam eder
      }
    },
    [handleAvailableLensesChanged],
  );

  const updateZoomFromPinchDisplay = useCallback(
    (nextDisplay: number) => {
      const now = Date.now();
      if (recording && now - pinchThrottleRef.current < 48) return;
      pinchThrottleRef.current = now;
      commitDisplayZoom(nextDisplay);
    },
    [commitDisplayZoom, recording],
  );

  const finishPinch = useCallback(() => {
    scheduleHideIndicator();
  }, [scheduleHideIndicator]);

  const updateZoomFromRail = useCallback(
    (position: number) => {
      commitDisplayZoom(railPositionToDisplayZoom(position));
    },
    [commitDisplayZoom],
  );

  const handleZoomRailStart = useCallback(() => {
    showIndicator();
  }, [showIndicator]);

  const handleZoomRailEnd = useCallback(() => {
    scheduleHideIndicator();
  }, [scheduleHideIndicator]);

  const updateZoomFromPinchDisplayRef = useRef(updateZoomFromPinchDisplay);
  const finishPinchRef = useRef(finishPinch);
  const showIndicatorRef = useRef(showIndicator);
  const handleFlipCameraRef = useRef(handleFlipCamera);

  useEffect(() => {
    updateZoomFromPinchDisplayRef.current = updateZoomFromPinchDisplay;
    finishPinchRef.current = finishPinch;
    showIndicatorRef.current = showIndicator;
    handleFlipCameraRef.current = handleFlipCamera;
  }, [finishPinch, handleFlipCamera, showIndicator, updateZoomFromPinchDisplay]);

  const invokeFlipCamera = useCallback(() => {
    handleFlipCameraRef.current();
  }, []);

  const invokeUpdatePinchDisplay = useCallback((value: number) => {
    updateZoomFromPinchDisplayRef.current(value);
  }, []);

  const invokeFinishPinch = useCallback(() => {
    finishPinchRef.current();
  }, []);

  const setPinching = useCallback((value: boolean) => {
    isPinchingRef.current = value;
  }, []);

  const invokeSetPinching = useCallback((value: boolean) => {
    setPinching(value);
  }, [setPinching]);

  const invokeShowIndicator = useCallback(() => {
    showIndicatorRef.current();
  }, []);

  const pinchEnabled = enabled;
  const flipOnDoubleTap = enabled && !recording;

  const previewGesture = useMemo(() => {
    const doubleTap = Gesture.Tap()
      .enabled(flipOnDoubleTap)
      .numberOfTaps(2)
      .maxDuration(250)
      .onEnd(() => {
        runOnJS(invokeFlipCamera)();
      });

    const pinch = Gesture.Pinch()
      .enabled(pinchEnabled)
      .simultaneousWithExternalGesture(Gesture.Native())
      .onStart(() => {
        isPinching.value = true;
        savedDisplay.value = displayZoomRef.current;
        runOnJS(invokeSetPinching)(true);
        runOnJS(invokeShowIndicator)();
      })
      .onUpdate((event) => {
        'worklet';
        const raw = savedDisplay.value * event.scale ** CAPTURE_PINCH_SENSITIVITY;
        const next = Math.min(
          CAPTURE_MAX_DISPLAY_ZOOM,
          Math.max(CAPTURE_MIN_DISPLAY_ZOOM, raw),
        );
        runOnJS(invokeUpdatePinchDisplay)(next);
      })
      .onEnd(() => {
        isPinching.value = false;
        runOnJS(invokeSetPinching)(false);
        runOnJS(invokeFinishPinch)();
      })
      .onFinalize(() => {
        isPinching.value = false;
        runOnJS(invokeSetPinching)(false);
      });

    return Gesture.Simultaneous(pinch, doubleTap);
  }, [
    flipOnDoubleTap,
    invokeFinishPinch,
    invokeFlipCamera,
    invokeSetPinching,
    invokeShowIndicator,
    invokeUpdatePinchDisplay,
    isPinching,
    pinchEnabled,
    savedDisplay,
  ]);

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
    refreshAvailableLenses,
    updateZoomFromRail,
    handleZoomRailStart,
    handleZoomRailEnd,
    flipCameraWithReset: handleFlipCamera,
    resetZoom,
    showManualControls: !recording,
    isPinchingRef,
  };
}
