/** Yüzen görüşme balonu — ekran koordinatları normalize (0–1). */
export const CALL_FLOAT_DEFAULT_POSITION = { x: 0.78, y: 0.38 };
export const CALL_FLOAT_SIZE = 68;
/** Görüntülü görüşme küçültüldüğünde video PiP boyutu */
export const CALL_FLOAT_VIDEO = { width: 120, height: 168, radius: 18 };

/** Görüşme ekranı tasarım token'ları — WhatsApp / FaceTime tarzı koyu UI */
export const CALL_DESIGN = {
  bg: '#0A0E14',
  videoBg: '#000000',
  heroAvatarSize: 140,
  heroAvatarRing: 3,
  localPreview: { width: 120, height: 168, radius: 18 },
  controlMd: 64,
  controlLg: 72,
  glassBarRadius: 28,
  pulse: {
    ringCount: 3,
    baseSize: 140,
    expandBy: 52,
    durationMs: 2200,
    staggerMs: 480,
    incomingColor: 'rgba(52, 199, 89, 0.45)',
    outgoingColor: 'rgba(30, 136, 229, 0.42)',
    videoColor: 'rgba(0, 191, 165, 0.38)',
  },
  gradients: {
    screen: ['#050810', '#0B1220', '#141C2B', '#0A0E14'] as const,
    videoTopFade: ['rgba(0,0,0,0.72)', 'rgba(0,0,0,0.28)', 'transparent'] as const,
    videoBottomFade: ['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)'] as const,
  },
} as const;

/** Push bildirim kategorisi — kilit ekranı Cevapla / Reddet (CallKit yok). */
export const INCOMING_CALL_NOTIFICATION_CATEGORY = 'vora_incoming_call';
export const INCOMING_CALL_ACTION_ACCEPT = 'CALL_ACCEPT';
export const INCOMING_CALL_ACTION_DECLINE = 'CALL_DECLINE';
/** Android bildirim kanalı — telefon varsayılan zil sesi */
export const INCOMING_CALL_ANDROID_SOUND = 'default';

/** Çalma süresi — sonra cevapsız sayılır. */
export const CALL_RING_TIMEOUT_MS = 18_000;

/** Gelen zil / giden çalma sesi döngü süresi (saniye). */
export const CALL_RINGTONE_LOOP_SEC = 4;

export const PREMIUM_CALL_REQUIRED_MESSAGE =
  'Sesli ve görüntülü arama için Premium abonelik gerekir.';

export const PREMIUM_CALL_GATE_COPY = {
  title: 'Premium ile arama yapın',
  subtitle: 'Sesli ve görüntülü görüşme başlatmak için Vora Premium aboneliği gerekir.',
} as const;
