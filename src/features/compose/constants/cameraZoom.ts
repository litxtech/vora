/** expo-camera `zoom` prop: 0 = geniş, 1 = cihazın maksimum dijital zoom'u */
export const CAPTURE_LINEAR_ZOOM_MIN = 0;
export const CAPTURE_LINEAR_ZOOM_MAX = 1;

/** Önizleme etiketinde gösterilen maksimum zoom (ör. 8x) */
export const CAPTURE_MAX_DISPLAY_ZOOM = 8;

/** Pinch hassasiyeti — düşük değer daha kontrollü zoom */
export const CAPTURE_PINCH_SENSITIVITY = 0.62;

/** Zoom göstergesi kaybolmadan önce bekleme (ms) */
export const CAPTURE_ZOOM_INDICATOR_HIDE_MS = 1800;

/** Dijital zoom ön ayarları (Android ve telefoto yoksa iOS) */
export const CAPTURE_DIGITAL_ZOOM_PRESETS = [1, 2, 3, 5] as const;

export const IOS_LENS_ULTRA_WIDE = 'builtInUltraWideCamera';
export const IOS_LENS_WIDE = 'builtInWideAngleCamera';
export const IOS_LENS_TELEPHOTO = 'builtInTelephotoCamera';
