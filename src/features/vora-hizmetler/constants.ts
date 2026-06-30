import type { CenterDef } from '@/features/centers/types';
import type {
  ProviderBadge,
  ServiceCategory,
  ServiceRequestStatus,
  ServiceUrgency,
} from '@/features/vora-hizmetler/types';
import { toUserFacingError } from '@/lib/errors';

export const VORA_HIZMETLER_CENTER_DEF: CenterDef = {
  id: 'vora-hizmetler',
  section: 61,
  route: '/vora-hizmetler',
  title: 'Vora Hizmetler',
  subtitle: 'Usta keşfet · talep oluştur · güvenli ödeme',
  icon: 'construct',
  accent: '#0EA5E9',
  group: 'economy',
  hasMap: true,
  hasCreate: true,
};

export const VORA_HIZMETLER_ACCENT = VORA_HIZMETLER_CENTER_DEF.accent;
export const VORA_HIZMETLER_GRADIENT = ['#0EA5E9', '#38BDF8'] as const;

export const VORA_HIZMETLER_PUSH_EVENT = 'vora_service_request_published' as const;
export const VORA_HIZMETLER_PUSH_CONFIG_KEY = 'vora_hizmetler_push' as const;

export const SERVICE_MIN_TITLE_LENGTH = 3;
export const SERVICE_MAX_TITLE_LENGTH = 120;
export const SERVICE_MIN_DESCRIPTION_LENGTH = 10;
export const SERVICE_MAX_DESCRIPTION_LENGTH = 3000;

export const SERVICE_MAP_RADIUS_OPTIONS = [5, 10, 20, 50] as const;
export const DEFAULT_SERVICE_MAP_RADIUS_KM = 10;

export const SERVICE_CATEGORY_OPTIONS: {
  value: ServiceCategory;
  label: string;
  icon: string;
  color: string;
}[] = [
  { value: 'elektrik', label: 'Elektrik', icon: 'flash-outline', color: '#F59E0B' },
  { value: 'su_tesisati', label: 'Su Tesisatı', icon: 'water-outline', color: '#0EA5E9' },
  { value: 'boya', label: 'Boya', icon: 'color-palette-outline', color: '#8B5CF6' },
  { value: 'alci', label: 'Alçı', icon: 'construct-outline', color: '#78716C' },
  { value: 'insaat', label: 'İnşaat', icon: 'business-outline', color: '#64748B' },
  { value: 'klima', label: 'Klima', icon: 'snow-outline', color: '#06B6D4' },
  { value: 'kombi', label: 'Kombi', icon: 'flame-outline', color: '#EF4444' },
  { value: 'mobilya', label: 'Mobilya', icon: 'bed-outline', color: '#A16207' },
  { value: 'marangoz', label: 'Marangoz', icon: 'hammer-outline', color: '#92400E' },
  { value: 'oto_tamir', label: 'Oto Tamir', icon: 'car-outline', color: '#1E40AF' },
  { value: 'cekici', label: 'Çekici', icon: 'car-sport-outline', color: '#374151' },
  { value: 'lastik', label: 'Lastik', icon: 'ellipse-outline', color: '#111827' },
  { value: 'bilgisayar', label: 'Bilgisayar', icon: 'laptop-outline', color: '#6366F1' },
  { value: 'yazilim', label: 'Yazılım', icon: 'code-slash-outline', color: '#7C3AED' },
  { value: 'web_tasarim', label: 'Web Tasarım', icon: 'globe-outline', color: '#2563EB' },
  { value: 'fotografci', label: 'Fotoğrafçı', icon: 'camera-outline', color: '#DB2777' },
  { value: 'kameraman', label: 'Kameraman', icon: 'videocam-outline', color: '#BE185D' },
  { value: 'dugun_organizasyon', label: 'Düğün Organizasyonu', icon: 'heart-outline', color: '#EC4899' },
  { value: 'kuafor', label: 'Kuaför', icon: 'cut-outline', color: '#F472B6' },
  { value: 'guzellik', label: 'Güzellik Uzmanı', icon: 'sparkles-outline', color: '#C026D3' },
  { value: 'temizlik', label: 'Temizlik', icon: 'sparkles-outline', color: '#10B981' },
  { value: 'nakliye', label: 'Nakliye', icon: 'cube-outline', color: '#059669' },
  { value: 'veteriner', label: 'Veteriner', icon: 'paw-outline', color: '#84CC16' },
  { value: 'bahcivan', label: 'Bahçıvan', icon: 'leaf-outline', color: '#22C55E' },
  { value: 'ozel_ders', label: 'Özel Ders', icon: 'book-outline', color: '#0891B2' },
  { value: 'avukat', label: 'Avukat', icon: 'document-text-outline', color: '#475569' },
  { value: 'muhasebeci', label: 'Muhasebeci', icon: 'calculator-outline', color: '#334155' },
  { value: 'diger', label: 'Diğer', icon: 'ellipsis-horizontal-outline', color: '#78909C' },
];

export type ServiceProfessionOption = {
  id: string;
  label: string;
  category: ServiceCategory;
  icon: string;
  color: string;
};

/** Tüm meslekler — merkez arama ve usta profili seçimi için */
export const SERVICE_PROFESSION_OPTIONS: ServiceProfessionOption[] = [
  { id: 'elektrikci', label: 'Elektrikçi', category: 'elektrik', icon: 'flash-outline', color: '#F59E0B' },
  { id: 'aydinlatma', label: 'Aydınlatma Montaj', category: 'elektrik', icon: 'bulb-outline', color: '#F59E0B' },
  { id: 'jenerator', label: 'Jeneratör Teknisyeni', category: 'elektrik', icon: 'battery-charging-outline', color: '#F59E0B' },
  { id: 'tesisatci', label: 'Tesisatçı', category: 'su_tesisati', icon: 'water-outline', color: '#0EA5E9' },
  { id: 'sihhi_tesisat', label: 'Sıhhi Tesisatçı', category: 'su_tesisati', icon: 'water-outline', color: '#0EA5E9' },
  { id: 'kacak_tespit', label: 'Kaçak Tespiti', category: 'su_tesisati', icon: 'search-outline', color: '#0EA5E9' },
  { id: 'boyaci', label: 'Boyacı', category: 'boya', icon: 'color-palette-outline', color: '#8B5CF6' },
  { id: 'badana', label: 'Badana Ustası', category: 'boya', icon: 'brush-outline', color: '#8B5CF6' },
  { id: 'alcipan', label: 'Alçıpan Ustası', category: 'alci', icon: 'construct-outline', color: '#78716C' },
  { id: 'asma_tavan', label: 'Asma Tavan', category: 'alci', icon: 'layers-outline', color: '#78716C' },
  { id: 'insaat_ustasi', label: 'İnşaat Ustası', category: 'insaat', icon: 'business-outline', color: '#64748B' },
  { id: 'duvar_ustasi', label: 'Duvar Ustası', category: 'insaat', icon: 'grid-outline', color: '#64748B' },
  { id: 'demirci', label: 'Demirci', category: 'insaat', icon: 'hammer-outline', color: '#64748B' },
  { id: 'fayans', label: 'Fayans & Seramik', category: 'insaat', icon: 'apps-outline', color: '#64748B' },
  { id: 'mantolama', label: 'Mantolama', category: 'insaat', icon: 'shield-outline', color: '#64748B' },
  { id: 'klima', label: 'Klima Teknisyeni', category: 'klima', icon: 'snow-outline', color: '#06B6D4' },
  { id: 'sogutma', label: 'Soğutma Sistemleri', category: 'klima', icon: 'thermometer-outline', color: '#06B6D4' },
  { id: 'kombi', label: 'Kombi Teknisyeni', category: 'kombi', icon: 'flame-outline', color: '#EF4444' },
  { id: 'dogalgaz', label: 'Doğalgaz Tesisatçısı', category: 'kombi', icon: 'flame-outline', color: '#EF4444' },
  { id: 'mobilya_montaj', label: 'Mobilya Montaj', category: 'mobilya', icon: 'bed-outline', color: '#A16207' },
  { id: 'dosemeci', label: 'Döşemeci', category: 'mobilya', icon: 'bed-outline', color: '#A16207' },
  { id: 'marangoz', label: 'Marangoz', category: 'marangoz', icon: 'hammer-outline', color: '#92400E' },
  { id: 'dograma', label: 'Doğrama Ustası', category: 'marangoz', icon: 'square-outline', color: '#92400E' },
  { id: 'mutfak_dolabi', label: 'Mutfak Dolabı', category: 'marangoz', icon: 'restaurant-outline', color: '#92400E' },
  { id: 'oto_tamir', label: 'Oto Tamircisi', category: 'oto_tamir', icon: 'car-outline', color: '#1E40AF' },
  { id: 'oto_elektrik', label: 'Oto Elektrikçisi', category: 'oto_tamir', icon: 'car-sport-outline', color: '#1E40AF' },
  { id: 'kaporta', label: 'Kaporta & Boya', category: 'oto_tamir', icon: 'color-fill-outline', color: '#1E40AF' },
  { id: 'cekici', label: 'Çekici / Kurtarıcı', category: 'cekici', icon: 'car-sport-outline', color: '#374151' },
  { id: 'lastikci', label: 'Lastikçi', category: 'lastik', icon: 'ellipse-outline', color: '#111827' },
  { id: 'bilgisayar', label: 'Bilgisayar Teknisyeni', category: 'bilgisayar', icon: 'laptop-outline', color: '#6366F1' },
  { id: 'telefon_tamir', label: 'Telefon Tamircisi', category: 'bilgisayar', icon: 'phone-portrait-outline', color: '#6366F1' },
  { id: 'yazilim', label: 'Yazılım Geliştirici', category: 'yazilim', icon: 'code-slash-outline', color: '#7C3AED' },
  { id: 'mobil_yazilim', label: 'Mobil Uygulama', category: 'yazilim', icon: 'phone-portrait-outline', color: '#7C3AED' },
  { id: 'web_tasarim', label: 'Web Tasarımcı', category: 'web_tasarim', icon: 'globe-outline', color: '#2563EB' },
  { id: 'seo', label: 'SEO & Dijital Pazarlama', category: 'web_tasarim', icon: 'trending-up-outline', color: '#2563EB' },
  { id: 'fotografci', label: 'Fotoğrafçı', category: 'fotografci', icon: 'camera-outline', color: '#DB2777' },
  { id: 'drone', label: 'Drone Operatörü', category: 'fotografci', icon: 'airplane-outline', color: '#DB2777' },
  { id: 'kameraman', label: 'Kameraman', category: 'kameraman', icon: 'videocam-outline', color: '#BE185D' },
  { id: 'video_editor', label: 'Video Editör', category: 'kameraman', icon: 'film-outline', color: '#BE185D' },
  { id: 'dugun_org', label: 'Düğün Organizasyonu', category: 'dugun_organizasyon', icon: 'heart-outline', color: '#EC4899' },
  { id: 'dj', label: 'DJ & Ses Sistemi', category: 'dugun_organizasyon', icon: 'musical-notes-outline', color: '#EC4899' },
  { id: 'gelin_sac', label: 'Gelin Saçı & Makyaj', category: 'dugun_organizasyon', icon: 'sparkles-outline', color: '#EC4899' },
  { id: 'kuafor', label: 'Kuaför / Berber', category: 'kuafor', icon: 'cut-outline', color: '#F472B6' },
  { id: 'guzellik', label: 'Güzellik Uzmanı', category: 'guzellik', icon: 'sparkles-outline', color: '#C026D3' },
  { id: 'protez_tirnak', label: 'Protez Tırnak', category: 'guzellik', icon: 'hand-left-outline', color: '#C026D3' },
  { id: 'ev_temizlik', label: 'Ev Temizliği', category: 'temizlik', icon: 'home-outline', color: '#10B981' },
  { id: 'ofis_temizlik', label: 'Ofis Temizliği', category: 'temizlik', icon: 'business-outline', color: '#10B981' },
  { id: 'hali_yikama', label: 'Halı Yıkama', category: 'temizlik', icon: 'water-outline', color: '#10B981' },
  { id: 'dis_cephe', label: 'Dış Cephe Temizliği', category: 'temizlik', icon: 'sparkles-outline', color: '#10B981' },
  { id: 'nakliyeci', label: 'Nakliyeci', category: 'nakliye', icon: 'cube-outline', color: '#059669' },
  { id: 'evden_eve', label: 'Evden Eve Taşıma', category: 'nakliye', icon: 'home-outline', color: '#059669' },
  { id: 'veteriner', label: 'Veteriner', category: 'veteriner', icon: 'paw-outline', color: '#84CC16' },
  { id: 'pet_bakim', label: 'Pet Bakım', category: 'veteriner', icon: 'paw-outline', color: '#84CC16' },
  { id: 'bahcivan', label: 'Bahçıvan', category: 'bahcivan', icon: 'leaf-outline', color: '#22C55E' },
  { id: 'peyzaj', label: 'Peyzaj Mimarı', category: 'bahcivan', icon: 'flower-outline', color: '#22C55E' },
  { id: 'ozel_ders', label: 'Özel Ders Öğretmeni', category: 'ozel_ders', icon: 'book-outline', color: '#0891B2' },
  { id: 'matematik', label: 'Matematik Özel Ders', category: 'ozel_ders', icon: 'calculator-outline', color: '#0891B2' },
  { id: 'ingilizce', label: 'İngilizce Özel Ders', category: 'ozel_ders', icon: 'language-outline', color: '#0891B2' },
  { id: 'muzik_ders', label: 'Müzik Dersi', category: 'ozel_ders', icon: 'musical-note-outline', color: '#0891B2' },
  { id: 'avukat', label: 'Avukat', category: 'avukat', icon: 'document-text-outline', color: '#475569' },
  { id: 'hukuk_danisman', label: 'Hukuk Danışmanı', category: 'avukat', icon: 'scale-outline', color: '#475569' },
  { id: 'muhasebeci', label: 'Muhasebeci', category: 'muhasebeci', icon: 'calculator-outline', color: '#334155' },
  { id: 'mali_musavir', label: 'Mali Müşavir', category: 'muhasebeci', icon: 'stats-chart-outline', color: '#334155' },
  { id: 'cam_balkon', label: 'Cam Balkon', category: 'diger', icon: 'scan-outline', color: '#78909C' },
  { id: 'guvenlik_kamera', label: 'Güvenlik Kamera', category: 'diger', icon: 'videocam-outline', color: '#78909C' },
  { id: 'celik_kapi', label: 'Çelik Kapı', category: 'diger', icon: 'lock-closed-outline', color: '#78909C' },
  { id: 'asansor', label: 'Asansör Bakım', category: 'diger', icon: 'arrow-up-outline', color: '#78909C' },
  { id: 'beyaz_esya', label: 'Beyaz Eşya Servisi', category: 'diger', icon: 'tv-outline', color: '#78909C' },
  { id: 'kurye', label: 'Kurye', category: 'diger', icon: 'bicycle-outline', color: '#78909C' },
  { id: 'cocuk_bakici', label: 'Çocuk Bakıcısı', category: 'diger', icon: 'happy-outline', color: '#78909C' },
  { id: 'yasli_bakim', label: 'Yaşlı Bakım', category: 'diger', icon: 'heart-outline', color: '#78909C' },
  { id: 'grafik', label: 'Grafik Tasarımcı', category: 'diger', icon: 'color-palette-outline', color: '#78909C' },
  { id: 'sosyal_medya', label: 'Sosyal Medya Yöneticisi', category: 'diger', icon: 'share-social-outline', color: '#78909C' },
  { id: 'emlak', label: 'Emlak Danışmanı', category: 'diger', icon: 'home-outline', color: '#78909C' },
  { id: 'diger', label: 'Diğer Hizmetler', category: 'diger', icon: 'ellipsis-horizontal-outline', color: '#78909C' },
];

export function filterServiceProfessions(query: string): ServiceProfessionOption[] {
  const normalized = query.trim().toLocaleLowerCase('tr');
  if (!normalized) return SERVICE_PROFESSION_OPTIONS;
  return SERVICE_PROFESSION_OPTIONS.filter((option) =>
    option.label.toLocaleLowerCase('tr').includes(normalized),
  );
}

export const SERVICE_URGENCY_OPTIONS: { value: ServiceUrgency; label: string; icon: string }[] = [
  { value: 'now', label: 'Şimdi', icon: 'flash-outline' },
  { value: 'today', label: 'Bugün', icon: 'today-outline' },
  { value: 'tomorrow', label: 'Yarın', icon: 'calendar-outline' },
  { value: 'this_week', label: 'Bu Hafta', icon: 'calendar-number-outline' },
];

export const SERVICE_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  pending_offers: 'Teklif Bekleniyor',
  offer_accepted: 'Teklif Kabul Edildi',
  en_route: 'Yolda',
  in_progress: 'İş Başladı',
  completed: 'İş Tamamlandı',
  rated: 'Puanlandı',
  cancelled: 'İptal Edildi',
};

export const OFFER_STATUS_LABELS: Record<
  import('@/features/vora-hizmetler/types').ServiceOfferStatus,
  string
> = {
  pending: 'Bekliyor',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
  withdrawn: 'Geri Çekildi',
};

export const SERVICE_STATUS_FLOW: ServiceRequestStatus[] = [
  'pending_offers',
  'offer_accepted',
  'en_route',
  'in_progress',
  'completed',
  'rated',
];

export const PROVIDER_BADGE_DEFS: {
  id: ProviderBadge;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { id: 'verified', label: 'Onaylı Usta', emoji: '✔', color: '#10B981' },
  { id: 'top_choice', label: 'En Çok Tercih Edilen', emoji: '🥇', color: '#F59E0B' },
  { id: 'emergency', label: 'Acil Servis', emoji: '⚡', color: '#EF4444' },
  { id: 'premium', label: 'Premium', emoji: '⭐', color: '#8B5CF6' },
  { id: 'best_service', label: 'En İyi Hizmet', emoji: '🏆', color: '#0EA5E9' },
  { id: 'fast_response', label: 'Hızlı Yanıt', emoji: '🚀', color: '#06B6D4' },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'stripe' as const, label: 'Stripe', icon: 'card-outline', recommended: true },
] as const;

export const HIZMET_CUSTOMER_ACCENT = VORA_HIZMETLER_ACCENT;
export const HIZMET_PROVIDER_ACCENT = '#10B981';

export const HIZMET_HUB_TABS = [
  {
    id: 'jobs' as const,
    label: 'İş İlanları',
    icon: 'briefcase-outline' as const,
    hint: 'Açık iş ilanlarını inceleyin. Usta iseniz teklif verin.',
  },
  {
    id: 'active' as const,
    label: 'Aktif İşler',
    icon: 'hammer-outline' as const,
    hint: 'Kabul ettiğiniz işleri yönetin, durumu güncelleyin.',
  },
  {
    id: 'providers' as const,
    label: 'Ustalar',
    icon: 'construct-outline' as const,
    hint: 'Puanlı ustaları bulun; ilanınızla başvuru gönderin.',
  },
  {
    id: 'mine' as const,
    label: 'İlanlarım',
    icon: 'document-text-outline' as const,
    hint: 'Verdiğiniz ilanları yönetin veya yeni ilan açın.',
  },
  {
    id: 'offers' as const,
    label: 'Teklifler',
    icon: 'pricetags-outline' as const,
    hint: 'Gelen ve gönderdiğiniz teklifleri takip edin.',
  },
] as const;

/** @deprecated HIZMET_HUB_TABS kullanın */
export const HIZMET_ROLE_OPTIONS = [
  {
    id: 'customer' as const,
    label: 'Usta Arıyorum',
    subtitle: 'İş yaptıracağım · talep oluştururum',
    icon: 'person-outline' as const,
    accent: HIZMET_CUSTOMER_ACCENT,
  },
  {
    id: 'provider' as const,
    label: 'İş Arıyorum',
    subtitle: 'Ustayım · işlere teklif veririm',
    icon: 'construct-outline' as const,
    accent: HIZMET_PROVIDER_ACCENT,
  },
];

export const HIZMET_CUSTOMER_TABS = [
  {
    id: 'discover' as const,
    label: 'Usta Keşfet',
    icon: 'compass-outline' as const,
    hint: 'Meslek veya isimle usta bulun, puan ve yorumları inceleyin.',
  },
  {
    id: 'requests' as const,
    label: 'Taleplerim',
    icon: 'document-text-outline' as const,
    hint: 'Usta talebi oluşturun, açık talepleri görün, acil çağırın.',
  },
  {
    id: 'offers' as const,
    label: 'Gelen Teklifler',
    icon: 'mail-open-outline' as const,
    hint: 'Taleplerinize ustaların gönderdiği teklifleri karşılaştırın.',
  },
];

export const HIZMET_PROVIDER_TABS = [
  {
    id: 'jobs' as const,
    label: 'İş Fırsatları',
    icon: 'briefcase-outline' as const,
    hint: 'Bölgenizdeki açık taleplere teklif verin.',
  },
  {
    id: 'profile' as const,
    label: 'Profilim',
    icon: 'id-card-outline' as const,
    hint: 'Kartvizitinizi, portfolyonuzu ve doğrulamalarınızı yönetin.',
  },
  {
    id: 'offers' as const,
    label: 'Tekliflerim',
    icon: 'send-outline' as const,
    hint: 'Verdiğiniz tekliflerin durumunu takip edin.',
  },
];

export function serviceCategoryLabel(category: ServiceCategory | string): string {
  return SERVICE_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
}

export function serviceCategoryIcon(category: ServiceCategory | string): string {
  return SERVICE_CATEGORY_OPTIONS.find((o) => o.value === category)?.icon ?? 'ellipsis-horizontal-outline';
}

export function serviceCategoryColor(category: ServiceCategory | string): string {
  return SERVICE_CATEGORY_OPTIONS.find((o) => o.value === category)?.color ?? '#78909C';
}

export function serviceUrgencyLabel(urgency: ServiceUrgency | string): string {
  return SERVICE_URGENCY_OPTIONS.find((o) => o.value === urgency)?.label ?? urgency;
}

export function serviceRequestDetailPath(id: string): string {
  return `/detail/vora-hizmetler/request/${id}`;
}

export function serviceRequestEditPath(id: string): string {
  return `/vora-hizmetler/edit-request?requestId=${encodeURIComponent(id)}`;
}

export function serviceProviderDetailPath(id: string): string {
  return `/detail/vora-hizmetler/provider/${id}`;
}

export function formatServiceDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatServicePrice(amount: number): string {
  return `${amount.toLocaleString('tr-TR')} TL`;
}

export function mapServiceError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('vora_service_requests_description_check')) {
    return `Açıklama en az ${SERVICE_MIN_DESCRIPTION_LENGTH} karakter olmalıdır.`;
  }
  if (lower.includes('vora_service_request_not_editable')) {
    return 'Bu talep artık düzenlenemez.';
  }
  if (lower.includes('vora_service_request_not_cancellable')) {
    return 'Bu ilan artık kaldırılamaz.';
  }
  if (lower.includes('request_not_open')) {
    return 'Bu ilan artık açık değil.';
  }
  if (lower.includes('not_request_owner')) {
    return 'Bu ilan size ait değil.';
  }
  if (lower.includes('provider_not_found')) {
    return 'Usta bulunamadı.';
  }
  if (lower.includes('cannot_invite_self')) {
    return 'Kendi profilinize davet gönderemezsiniz.';
  }
  if (lower.includes('vora_service_requests_title_check')) {
    return `Başlık ${SERVICE_MIN_TITLE_LENGTH}–${SERVICE_MAX_TITLE_LENGTH} karakter arasında olmalıdır.`;
  }
  return toUserFacingError(message, { fallback: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' });
}
