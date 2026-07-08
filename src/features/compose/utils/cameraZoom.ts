import {
  CAPTURE_LINEAR_ZOOM_MAX,
  CAPTURE_LINEAR_ZOOM_MIN,
  CAPTURE_MAX_DISPLAY_ZOOM,
  CAPTURE_MIN_DISPLAY_ZOOM,
} from '@/features/compose/constants/cameraZoom';
import {
  IOS_LENS_TELEPHOTO,
  IOS_LENS_ULTRA_WIDE,
  IOS_LENS_WIDE,
} from '@/features/compose/constants/cameraZoom';

/** Android linear 0 konumu — zoom ratio ≈1x (minZoom ile maxZoom arası) */
export const ANDROID_LINEAR_AT_1X = 0.055;

export function clampLinearZoom(value: number): number {
  return Math.min(CAPTURE_LINEAR_ZOOM_MAX, Math.max(CAPTURE_LINEAR_ZOOM_MIN, value));
}

export function clampDisplayZoom(value: number, maxDisplay = CAPTURE_MAX_DISPLAY_ZOOM): number {
  return Math.min(maxDisplay, Math.max(CAPTURE_MIN_DISPLAY_ZOOM, value));
}

export function linearZoomToDisplay(
  linear: number,
  maxDisplay = CAPTURE_MAX_DISPLAY_ZOOM,
): number {
  const clamped = clampLinearZoom(linear);
  if (clamped <= ANDROID_LINEAR_AT_1X) {
    const t = ANDROID_LINEAR_AT_1X > 0 ? clamped / ANDROID_LINEAR_AT_1X : 0;
    return CAPTURE_MIN_DISPLAY_ZOOM + t * (1 - CAPTURE_MIN_DISPLAY_ZOOM);
  }
  const t = (clamped - ANDROID_LINEAR_AT_1X) / (1 - ANDROID_LINEAR_AT_1X);
  return 1 + t * (maxDisplay - 1);
}

export function displayZoomToLinear(
  display: number,
  maxDisplay = CAPTURE_MAX_DISPLAY_ZOOM,
): number {
  const d = clampDisplayZoom(display, maxDisplay);
  if (d <= CAPTURE_MIN_DISPLAY_ZOOM) return CAPTURE_LINEAR_ZOOM_MIN;
  if (d <= 1) {
    const t = (d - CAPTURE_MIN_DISPLAY_ZOOM) / (1 - CAPTURE_MIN_DISPLAY_ZOOM);
    return clampLinearZoom(t * ANDROID_LINEAR_AT_1X);
  }
  return clampLinearZoom(
    ANDROID_LINEAR_AT_1X + ((d - 1) / (maxDisplay - 1)) * (1 - ANDROID_LINEAR_AT_1X),
  );
}

/** Dijital zoom segmenti: 1x–segmentMax aralığını linear 0–1'e map eder. */
function segmentLinear(display: number, segmentMin: number, segmentMax: number): number {
  if (display <= segmentMin) return CAPTURE_LINEAR_ZOOM_MIN;
  if (segmentMax <= segmentMin) return CAPTURE_LINEAR_ZOOM_MIN;
  return clampLinearZoom((display - segmentMin) / (segmentMax - segmentMin));
}

export type CaptureZoomState = {
  linearZoom: number;
  lens?: string;
  displayZoom: number;
};

/** Pinch / rail için display zoom → lens + expo-camera linear zoom */
export function resolveCaptureZoomFromDisplay(
  displayZoom: number,
  options: {
    isIos: boolean;
    availableLenses: string[];
  },
): CaptureZoomState {
  const display = clampDisplayZoom(displayZoom);

  if (options.isIos && options.availableLenses.length > 0) {
    const lenses = options.availableLenses;
    const hasUltra = lenses.includes(IOS_LENS_ULTRA_WIDE);
    const hasWide = lenses.includes(IOS_LENS_WIDE);
    const hasTele = lenses.includes(IOS_LENS_TELEPHOTO);

    if (hasUltra && display < 1) {
      return {
        lens: IOS_LENS_ULTRA_WIDE,
        linearZoom: CAPTURE_LINEAR_ZOOM_MIN,
        displayZoom: display,
      };
    }

    if (hasTele && display >= 2) {
      return {
        lens: IOS_LENS_TELEPHOTO,
        linearZoom: segmentLinear(display, 2, CAPTURE_MAX_DISPLAY_ZOOM),
        displayZoom: display,
      };
    }

    const wideMax = hasTele ? 2 : CAPTURE_MAX_DISPLAY_ZOOM;
    return {
      lens: hasWide ? IOS_LENS_WIDE : undefined,
      linearZoom: display <= 1 ? CAPTURE_LINEAR_ZOOM_MIN : segmentLinear(display, 1, wideMax),
      displayZoom: display,
    };
  }

  return {
    linearZoom: displayZoomToLinear(display),
    displayZoom: display,
  };
}

export function formatCaptureZoomLabel(display: number): string {
  if (display >= 10) return `${Math.round(display)}x`;
  const rounded = Math.round(display * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}x`;
}

export function applyPinchToLinearZoom(
  savedLinear: number,
  pinchScale: number,
  sensitivity: number,
): number {
  return clampLinearZoom(savedLinear * pinchScale ** sensitivity);
}

/** Dikey rail konumundan (0 üst = 8x, 1 alt = 0.5x) display zoom */
export function railPositionToDisplayZoom(position: number): number {
  const clamped = Math.min(1, Math.max(0, position));
  return (
    CAPTURE_MAX_DISPLAY_ZOOM -
    clamped * (CAPTURE_MAX_DISPLAY_ZOOM - CAPTURE_MIN_DISPLAY_ZOOM)
  );
}

/** Display zoom'dan rail konumu */
export function displayToRailPosition(display: number): number {
  const clamped = clampDisplayZoom(display);
  return (
    (CAPTURE_MAX_DISPLAY_ZOOM - clamped) /
    (CAPTURE_MAX_DISPLAY_ZOOM - CAPTURE_MIN_DISPLAY_ZOOM)
  );
}

/** Dikey rail konumundan (0 üst, 1 alt) linear zoom */
export function railPositionToLinear(position: number): number {
  return displayZoomToLinear(railPositionToDisplayZoom(position));
}

/** Linear zoom'dan rail konumu */
export function linearToRailPosition(linear: number): number {
  return displayToRailPosition(linearZoomToDisplay(linear));
}
