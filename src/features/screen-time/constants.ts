/** "Ekran Süresi" özelliği — uygulama yalnızca ön plandayken (açıkken) süre sayar. */

export const SCREEN_TIME_FEATURE_NAME = 'Ekran Süresi';

/** AsyncStorage anahtarı. Şema değişirse sürümü artır. */
export const SCREEN_TIME_STORAGE_KEY = 'screen-time:v1';

export const SCREEN_TIME_STORAGE_VERSION = 2;

/**
 * Arka plandan ön plana çok kısa sürede dönülürse (iOS denetim merkezi / bildirim
 * çekme gibi titremeler) yeni "açılış" saymamak için tolerans (ms).
 */
export const SCREEN_TIME_OPEN_GRACE_MS = 2500;

/** Günlük hedef için hazır seçenekler (dakika). */
export const SCREEN_TIME_GOAL_PRESETS = [30, 60, 90, 120, 180, 240] as const;

/** Kaç günlük günlük dökümü saklayalım (depolamayı sınırlamak için). */
export const SCREEN_TIME_RETENTION_DAYS = 90;

/** UI'da canlı sayaç güncelleme aralığı (yalnızca ekran açıkken çalışır). */
export const SCREEN_TIME_TICK_MS = 1000;

/** Tema vurgu rengi. */
export const SCREEN_TIME_ACCENT = '#22C55E';
