/** Yakınlık yarıçapı (metre) */
export const PROXIMITY_MATCH_RADIUS_M = 500;

/** Konum yayın aralığı (ms) */
export const PROXIMITY_PRESENCE_INTERVAL_MS = 12_000;

/** Minimum hareket mesafesi (metre) */
export const PROXIMITY_PRESENCE_DISTANCE_M = 20;

/** Yakındaki aday kontrol aralığı (ms) */
export const PROXIMITY_CANDIDATE_POLL_MS = 10_000;

/** Realtime presence olayı sonrası aday araması debounce (ms) */
export const PROXIMITY_REALTIME_DEBOUNCE_MS = 2_500;

/** Konum yayını sonrası minimum aday arama aralığı (ms) */
export const PROXIMITY_PUBLISH_POLL_MIN_MS = 4_000;

/** Hayır sonrası tekrar eşleşme bekleme süresi (gün) — sunucu tarafında da uygulanır */
export const PROXIMITY_DECLINE_COOLDOWN_DAYS = 1;

export const PROXIMITY_MATCH_ACCENT = '#E85D5D';

export const PROXIMITY_MATCH_ROUTES = {
  matches: '/proximity-matches',
} as const;
