import { Ionicons } from '@expo/vector-icons';

export type VoraAiIconName = keyof typeof Ionicons.glyphMap;

export const VORA_AI_PROFILE_ID = 'f0000000-0000-4000-8000-00000000a101';
export const VORA_AI_USERNAME = 'VoraAI';
export const VORA_AI_DISPLAY_NAME = 'Vora AI';
export const VORA_AI_BIO = 'Karadeniz\'in yapay zekâ destekli rehberi.';
export const VORA_AI_BADGE_LABEL = 'AI';
export const VORA_AI_BADGE_COLOR = '#80DEEA';
export const VORA_AI_ACCENT = '#4DD0E1';

export type VoraAiModuleId =
  | 'master'
  | 'presence'
  | 'posts'
  | 'reels'
  | 'map'
  | 'events'
  | 'comments'
  | 'moderation'
  | 'recommendations'
  | 'news'
  | 'trends'
  | 'map_animation'
  | 'vision';

export const VORA_AI_MODULES: { id: VoraAiModuleId; label: string }[] = [
  { id: 'posts', label: 'Gönderiler' },
  { id: 'reels', label: 'Reels' },
  { id: 'map', label: 'Harita' },
  { id: 'events', label: 'Etkinlik' },
  { id: 'comments', label: 'Yorumlar' },
  { id: 'moderation', label: 'Moderasyon' },
  { id: 'recommendations', label: 'Öneriler' },
  { id: 'news', label: 'Haber' },
  { id: 'trends', label: 'Trendler' },
  { id: 'map_animation', label: 'Harita Canlandırma' },
  { id: 'vision', label: 'Görsel & Video' },
];

export const VORA_AI_PRESENCE_CATEGORIES: { id: string; label: string }[] = [
  { id: 'general', label: 'Genel' },
  { id: 'daily', label: 'Günlük' },
  { id: 'entertainment', label: 'Eğlence' },
  { id: 'event', label: 'Etkinlik' },
  { id: 'business', label: 'İşletme' },
  { id: 'news', label: 'Haber' },
  { id: 'traffic', label: 'Trafik' },
  { id: 'job', label: 'İş' },
  { id: 'lost_found', label: 'Kayıp' },
  { id: 'emergency', label: 'Acil' },
];

export const VORA_AI_PRESENCE_INTERVALS = [
  { minutes: 30, label: '30 dk' },
  { minutes: 60, label: '1 saat' },
  { minutes: 120, label: '2 saat' },
  { minutes: 240, label: '4 saat' },
  { minutes: 360, label: '6 saat' },
  { minutes: 720, label: '12 saat' },
] as const;

export const VORA_AI_PRESENCE_MAX_POSTS = [5, 10, 15, 25, 50] as const;

export const VORA_AI_PERSONA_GENDER_OPTIONS = [
  { id: 'mixed' as const, label: 'Karışık' },
  { id: 'female' as const, label: 'Kadın' },
  { id: 'male' as const, label: 'Erkek' },
];

export const VORA_AI_DAILY_PERSONA_QUOTAS = [10, 25, 50, 100] as const;

export const VORA_AI_PERSONA_USERNAME_STYLES = [
  { id: 'underscore' as const, label: 'elif_yilmaz' },
  { id: 'dot' as const, label: 'elif.yilmaz' },
  { id: 'compact' as const, label: 'elifyilmaz' },
  { id: 'plain' as const, label: 'elif' },
] as const;

export const VORA_AI_PERSONA_AVATAR_MODES = [
  { id: 'always' as const, label: 'Her zaman foto' },
  { id: 'never' as const, label: 'Foto yok' },
  { id: 'random' as const, label: '%50 rastgele' },
] as const;

export const VORA_AI_PERSONA_BATCH_PRESETS = [1, 5, 10, 25, 50, 100] as const;

export const VORA_AI_PRESENCE_PHOTO_CHANCE_OPTIONS = [
  { value: 0.35, label: '%35' },
  { value: 0.5, label: '%50' },
  { value: 0.65, label: '%65' },
  { value: 0.8, label: '%80' },
  { value: 1, label: 'Her zaman' },
] as const;

export type VoraAiPostActionId =
  | 'summarize'
  | 'explain'
  | 'observe'
  | 'similar'
  | 'location'
  | 'event_time'
  | 'directions'
  | 'news';

export const VORA_AI_POST_ACTIONS: {
  id: VoraAiPostActionId;
  label: string;
  icon: VoraAiIconName;
}[] = [
  { id: 'summarize', label: 'Bu gönderiyi özetle', icon: 'document-text-outline' },
  { id: 'explain', label: 'Bana açıkla', icon: 'bulb-outline' },
  { id: 'observe', label: 'Görseli/videoyu incele', icon: 'eye-outline' },
  { id: 'similar', label: 'Benzer gönderiler göster', icon: 'copy-outline' },
  { id: 'location', label: 'Bu yer neresi?', icon: 'location-outline' },
  { id: 'event_time', label: 'Bu etkinlik ne zaman?', icon: 'calendar-outline' },
  { id: 'directions', label: 'Yol tarifi ver', icon: 'navigate-outline' },
  { id: 'news', label: 'İlgili haberleri göster', icon: 'newspaper-outline' },
];

export type VoraAiReelActionId =
  | 'analyze'
  | 'observe'
  | 'location'
  | 'venue'
  | 'music'
  | 'similar';

export const VORA_AI_REEL_ACTIONS: {
  id: VoraAiReelActionId;
  label: string;
  icon: VoraAiIconName;
}[] = [
  { id: 'analyze', label: 'Videoyu analiz et', icon: 'scan-outline' },
  { id: 'observe', label: 'Görseli detaylı incele', icon: 'eye-outline' },
  { id: 'location', label: 'Videodaki yeri tahmin et', icon: 'location-outline' },
  { id: 'venue', label: 'Mekân bilgisi ver', icon: 'business-outline' },
  { id: 'music', label: 'Müzik bilgisini ver', icon: 'musical-notes-outline' },
  { id: 'similar', label: 'Benzer videolar öner', icon: 'film-outline' },
];

export const VORA_AI_MAP_CATEGORIES = [
  { id: 'restaurant', label: 'Restoran', icon: 'restaurant-outline' as const },
  { id: 'event', label: 'Etkinlik', icon: 'calendar-outline' as const },
  { id: 'traffic', label: 'Trafik', icon: 'car-outline' as const },
  { id: 'concert', label: 'Konser', icon: 'musical-notes-outline' as const },
  { id: 'historic', label: 'Tarihi yerler', icon: 'library-outline' as const },
  { id: 'hotel', label: 'Oteller', icon: 'bed-outline' as const },
  { id: 'cafe', label: 'Kafeler', icon: 'cafe-outline' as const },
];

export const VORA_AI_EVENT_PROMPTS = [
  { id: 'tonight', label: 'Bu akşam ne yapabilirim?', icon: 'moon-outline' as const },
  { id: 'weather', label: 'Hava durumuna göre öner', icon: 'partly-sunny-outline' as const },
  { id: 'group', label: 'Arkadaş grubuna uygun', icon: 'people-outline' as const },
];

export const VORA_AI_COMMENT_PROMPTS = [
  { id: 'observe', label: 'Görseli/videoyu incele', action: 'observe' as const },
  { id: 'where', label: 'Bu yer neresi?', action: 'ask' as const, question: 'Bu görseldeki veya videodaki yer neresi? Karadeniz bağlamında açıkla.' },
  { id: 'what', label: 'Ne görüyorsun?', action: 'ask' as const, question: 'Bu paylaşımda ne görüyorsun? Detaylı ve bilgilendirici anlat.' },
  { id: 'tips', label: 'Öneri ver', action: 'ask' as const, question: 'Bu içerikten yola çıkarak ziyaret veya keşif önerileri sun.' },
] as const;

export const VORA_AI_DISCOVERY_ACTIONS: {
  id: string;
  label: string;
  icon: VoraAiIconName;
  module: VoraAiModuleId;
  action: string;
}[] = [
  ...VORA_AI_EVENT_PROMPTS.map((prompt) => ({
    ...prompt,
    module: 'events' as const,
    action: prompt.id,
  })),
  { id: 'digest', label: 'Günün haber özeti', icon: 'newspaper-outline', module: 'news', action: 'digest' },
  { id: 'personal', label: 'Sana özel öneriler', icon: 'heart-outline', module: 'recommendations', action: 'personal' },
];
