export type MediaEditorZoomState = {
  zoomScale: number;
  zoomTranslateX: number;
  zoomTranslateY: number;
};

export const DEFAULT_ZOOM: MediaEditorZoomState = {
  zoomScale: 1,
  zoomTranslateX: 0,
  zoomTranslateY: 0,
};

export function computeContainSize(
  mediaW: number,
  mediaH: number,
  containerW: number,
  containerH: number,
): { width: number; height: number; coverScale: number } {
  if (mediaW <= 0 || mediaH <= 0 || containerW <= 0 || containerH <= 0) {
    return { width: containerW, height: containerH, coverScale: 1 };
  }

  const mediaAspect = mediaW / mediaH;
  const viewAspect = containerW / containerH;

  let width: number;
  let height: number;
  if (mediaAspect > viewAspect) {
    width = containerW;
    height = containerW / mediaAspect;
  } else {
    height = containerH;
    width = containerH * mediaAspect;
  }

  const coverScale = Math.max(containerW / width, containerH / height);
  return { width, height, coverScale };
}

export function clampZoomPan(
  scale: number,
  translateX: number,
  translateY: number,
  baseWidth: number,
  baseHeight: number,
  containerWidth: number,
  containerHeight: number,
  maxScale: number,
): MediaEditorZoomState {
  const nextScale = Math.min(maxScale, Math.max(1, scale));
  const scaledW = baseWidth * nextScale;
  const scaledH = baseHeight * nextScale;
  const maxX = Math.max(0, (scaledW - containerWidth) / 2);
  const maxY = Math.max(0, (scaledH - containerHeight) / 2);

  return {
    zoomScale: nextScale,
    zoomTranslateX: Math.min(maxX, Math.max(-maxX, translateX)),
    zoomTranslateY: Math.min(maxY, Math.max(-maxY, translateY)),
  };
}
