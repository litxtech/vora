import type { PushAutomationTriggerType } from '@/features/push-automation/types';

export const PUSH_TRIGGER_LABELS: Record<PushAutomationTriggerType, string> = {
  manual: 'Manuel',
  scheduled: 'Planlı',
  interval: 'Periyodik',
  feed_activity: 'Canlı akış',
};

export const PUSH_SEND_MODE_OPTIONS = [
  { id: 'now' as const, label: 'Hemen gönder' },
  { id: 'scheduled' as const, label: 'Zamanla' },
];

export const PUSH_REGION_OPTIONS = [
  { id: 'all', label: 'Tüm şehirler' },
] as const;

/** Boş = tıklanınca yalnızca bildirim kutusuna gider, sayfa açılmaz */
export const PUSH_DEEP_LINK_NONE = '';

export const PUSH_DEEP_LINK_PRESETS = [
  { id: PUSH_DEEP_LINK_NONE, label: 'Yönlendirme yok' },
  { id: '/(tabs)', label: 'Ana akış' },
  { id: '/(tabs)/reels', label: 'Reels' },
  { id: '/(tabs)/map', label: 'Harita' },
  { id: '/notifications', label: 'Bildirimler' },
] as const;

export const PUSH_AUTOMATION_TRIGGER_OPTIONS: {
  id: PushAutomationTriggerType;
  label: string;
  description: string;
}[] = [
  {
    id: 'feed_activity',
    label: 'Canlı akış',
    description: 'Bölgede yeni gönderi eşiğine ulaşınca otomatik gönder',
  },
  {
    id: 'interval',
    label: 'Periyodik',
    description: 'Belirlediğiniz saat/gün aralığında tekrarla',
  },
  {
    id: 'scheduled',
    label: 'Planlı (tek sefer)',
    description: 'Seçtiğiniz tarih ve saatte bir kez gönder',
  },
  {
    id: 'manual',
    label: 'Manuel',
    description: 'Yalnızca panelden gönderilir',
  },
];

export const PUSH_TEMPLATE_BODY_VARIABLES = [
  { key: '{{post_count}}', label: 'Gönderi sayısı' },
  { key: '{{post_count_label}}', label: 'Gönderi sayısı (metin)' },
  { key: '{{region_name}}', label: 'Şehir adı' },
] as const;

export const PUSH_PREF_KEY_OPTIONS = [
  { id: 'system', label: 'Sistem duyuruları' },
  { id: 'feed', label: 'Canlı akış' },
  { id: 'nearby_events', label: 'Yakındaki olaylar' },
] as const;

export const QUICK_PUSH_DEFAULTS: Omit<
  import('@/features/push-automation/types').PushAutomationTemplateInput,
  'name' | 'slug' | 'title' | 'body'
> = {
  enabled: true,
  triggerType: 'manual',
  eventType: 'system',
  deepLink: PUSH_DEEP_LINK_NONE,
  regionIds: null,
  minPostsInWindow: 2,
  activityWindowMinutes: 30,
  userCooldownHours: 90,
  regionCooldownMinutes: 45,
  intervalHours: null,
  intervalDays: null,
  sortOrder: 0,
  prefKey: 'system',
};

/** @deprecated QUICK_PUSH_DEFAULTS kullanın */
export const DEFAULT_PUSH_TEMPLATE = {
  ...QUICK_PUSH_DEFAULTS,
  enabled: false,
  triggerType: 'feed_activity' as const,
  eventType: 'feed_activity',
  prefKey: 'feed',
};
