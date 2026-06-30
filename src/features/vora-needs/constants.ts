import type { CenterDef } from '@/features/centers/types';
import type {
  VoraNeedCategory,
  VoraNeedFeedTab,
  VoraNeedStatus,
  VoraNeedUrgency,
  VoraNeedVisibility,
} from '@/features/vora-needs/types';
import { toUserFacingError } from '@/lib/errors';

export const VORA_NEEDS_CENTER_DEF: CenterDef = {
  id: 'vora-needs',
  section: 59,
  route: '/vora-needs-center',
  title: 'İhtiyaç Ağı',
  subtitle: 'İhtiyaç paylaş, yardımlaş, iletişime geç',
  icon: 'hand-left',
  accent: '#7C4DFF',
  group: 'social',
  hasMap: true,
  hasCreate: true,
};

export const VORA_NEEDS_ACCENT = '#7C4DFF';

export const VORA_NEEDS_GRADIENT = ['#7C4DFF', '#B388FF'] as const;

/** Push bildirim event tipi — `app_system_config.vora_needs_push.enabled` ile açılır */
export const VORA_NEED_PUSH_EVENT = 'vora_need_published' as const;
export const VORA_NEED_PUSH_CONFIG_KEY = 'vora_needs_push' as const;

export const VORA_NEED_FEED_TABS: { id: VoraNeedFeedTab; label: string; icon: string }[] = [
  { id: 'all', label: 'Tümü', icon: 'grid-outline' },
  { id: 'global', label: 'Genel', icon: 'globe-outline' },
  { id: 'city', label: 'Şehrim', icon: 'business-outline' },
  { id: 'nearby', label: 'Yakınım', icon: 'navigate-outline' },
  { id: 'urgent', label: 'Acil', icon: 'flash-outline' },
  { id: 'favorites', label: 'Favoriler', icon: 'heart-outline' },
  { id: 'mine', label: 'İlanlarım', icon: 'person-outline' },
];

export const VORA_NEED_CATEGORY_OPTIONS: {
  value: VoraNeedCategory;
  label: string;
  icon: string;
  color: string;
}[] = [
  { value: 'product', label: 'Ürün', icon: 'cube-outline', color: '#1E88E5' },
  { value: 'service', label: 'Hizmet', icon: 'construct-outline', color: '#43A047' },
  { value: 'help', label: 'Yardım', icon: 'heart-outline', color: '#E53935' },
  { value: 'job', label: 'İş', icon: 'briefcase-outline', color: '#FB8C00' },
];

export const VORA_NEED_VISIBILITY_OPTIONS: {
  value: VoraNeedVisibility;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'global',
    label: 'Genel (tüm platform)',
    description: 'Herkes görebilir',
    icon: 'globe-outline',
  },
  {
    value: 'city',
    label: 'Şehir bazlı',
    description: 'Aynı şehirdekiler görür',
    icon: 'business-outline',
  },
  {
    value: 'nearby',
    label: 'Yakınlık (GPS)',
    description: '5–10 km çevresindekiler görür',
    icon: 'navigate-outline',
  },
];

export const VORA_NEED_URGENCY_OPTIONS: { value: VoraNeedUrgency; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Acil' },
];

export const VORA_NEED_STATUS_LABELS: Record<VoraNeedStatus, string> = {
  active: 'Aktif',
  hidden: 'Gizli',
  removed: 'Kaldırıldı',
  reported: 'Şikayet edildi',
  reviewing: 'İnceleniyor',
};

export const VORA_NEED_VISIBILITY_LABELS: Record<VoraNeedVisibility, string> = {
  global: 'Genel',
  city: 'Şehir',
  nearby: 'Yakınlık',
};

export const NEARBY_NEED_RADIUS_KM = 10;

export const VORA_NEED_MIN_TITLE_LENGTH = 3;
export const VORA_NEED_MAX_TITLE_LENGTH = 120;
export const VORA_NEED_MIN_DESCRIPTION_LENGTH = 10;
export const VORA_NEED_MAX_DESCRIPTION_LENGTH = 3000;

export function mapVoraNeedError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('vora_needs_description_check')) {
    return `Açıklama en az ${VORA_NEED_MIN_DESCRIPTION_LENGTH}, en fazla ${VORA_NEED_MAX_DESCRIPTION_LENGTH} karakter olmalıdır.`;
  }
  if (lower.includes('vora_needs_title_check')) {
    return `Başlık en az ${VORA_NEED_MIN_TITLE_LENGTH}, en fazla ${VORA_NEED_MAX_TITLE_LENGTH} karakter olmalıdır.`;
  }
  return toUserFacingError(message, { fallback: 'İlan kaydedilemedi. Lütfen tekrar deneyin.' });
}

export const VORA_NEED_TAB_EMPTY_MESSAGES: Partial<Record<VoraNeedFeedTab, string>> = {
  all: 'Henüz ihtiyaç ilanı yok. İlk ilanı siz paylaşın.',
  global: 'Genel ilan bulunamadı.',
  city: 'Şehrinizde açık ilan yok.',
  nearby: 'Yakınınızda ihtiyaç ilanı yok.',
  urgent: 'Şu an acil ilan bulunmuyor.',
  favorites: 'Henüz favori ilanınız yok.',
  mine: 'Henüz ilan paylaşmadınız.',
};

export function voraNeedCategoryLabel(category: VoraNeedCategory | string): string {
  return VORA_NEED_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
}

export function voraNeedCategoryIcon(category: VoraNeedCategory | string): string {
  return VORA_NEED_CATEGORY_OPTIONS.find((o) => o.value === category)?.icon ?? 'ellipsis-horizontal-outline';
}

export function voraNeedCategoryColor(category: VoraNeedCategory | string): string {
  return VORA_NEED_CATEGORY_OPTIONS.find((o) => o.value === category)?.color ?? '#78909C';
}

export function voraNeedDetailPath(id: string): string {
  return `/detail/vora-needs/${id}`;
}

export function formatVoraNeedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
