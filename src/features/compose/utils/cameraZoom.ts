import {
  CAPTURE_LINEAR_ZOOM_MAX,
  CAPTURE_LINEAR_ZOOM_MIN,
  CAPTURE_MAX_DISPLAY_ZOOM,
} from '@/features/compose/constants/cameraZoom';

export function clampLinearZoom(value: number): number {
  return Math.min(CAPTURE_LINEAR_ZOOM_MAX, Math.max(CAPTURE_LINEAR_ZOOM_MIN, value));
}

export function linearZoomToDisplay(
  linear: number,
  maxDisplay = CAPTURE_MAX_DISPLAY_ZOOM,
): number {
  const clamped = clampLinearZoom(linear);
  return 1 + clamped * (maxDisplay - 1);
}

export function displayZoomToLinear(
  display: number,
  maxDisplay = CAPTURE_MAX_DISPLAY_ZOOM,
): number {
  if (display <= 1) return CAPTURE_LINEAR_ZOOM_MIN;
  return clampLinearZoom((display - 1) / (maxDisplay - 1));
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

/** Dikey rail konumundan (0 üst, 1 alt) linear zoom */
export function railPositionToLinear(position: number): number {
  return clampLinearZoom(1 - position);
}

/** Linear zoom'dan rail konumu */
export function linearToRailPosition(linear: number): number {
  return 1 - clampLinearZoom(linear);
}
