import type { BanDuration, BroadcastType, ReportQueueStatus } from '@/features/admin/types';
import type { Ionicons } from '@expo/vector-icons';
import type { ReportReason, UserRole } from '@/types/database';

export const REPORT_STATUS_LABELS: Record<ReportQueueStatus, string> = {
  pending: 'Bekliyor',
  reviewing: 'İnceleniyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  fake_account: 'Sahte Hesap',
  fraud: 'Dolandırıcılık',
  abuse: 'Taciz',
  threat: 'Tehdit',
  harassment: 'Hakaret',
  hate_speech: 'Nefret Söylemi',
  violence: 'Şiddet İçeriği',
  inappropriate: 'Uygunsuz İçerik',
  child_safety: 'Çocuk Güvenliği',
  personal_data: 'Kişisel Veri İhlali',
  misinformation: 'Sahte Haber',
};

export const BAN_DURATION_LABELS: Record<BanDuration, string> = {
  hours_24: '24 Saat',
  days_7: '7 Gün',
  days_30: '30 Gün',
  permanent: 'Kalıcı',
};

export const BROADCAST_TYPE_LABELS: Record<BroadcastType, string> = {
  system: 'Sistem duyurusu',
  emergency: 'Acil durum',
  update: 'Güncelleme',
};

export const ACTION_PERMISSION_KEYS = [
  'users.read',
  'users.edit',
  'users.ban',
  'content.moderate',
  'content.pin',
  'reports.resolve',
  'broadcasts.send',
  'revenue.read',
  'features.toggle',
] as const;

export const ACTION_PERMISSION_LABELS: Record<(typeof ACTION_PERMISSION_KEYS)[number], string> = {
  'users.read': 'Kullanıcıları görüntüleme',
  'users.edit': 'Kullanıcı profili düzenleme',
  'users.ban': 'Kullanıcı yasaklama',
  'content.moderate': 'İçerik moderasyonu',
  'content.pin': 'Gönderi sabitleme',
  'reports.resolve': 'Şikayet sonuçlandırma',
  'broadcasts.send': 'Toplu bildirim gönderme',
  'revenue.read': 'Gelir paneline erişim',
  'features.toggle': 'Özellik açma / kapama',
};

export const ACTION_PERMISSION_DESCRIPTIONS: Record<(typeof ACTION_PERMISSION_KEYS)[number], string> = {
  'users.read': 'Kullanıcı listesini ve profil detaylarını görebilir.',
  'users.edit': 'Kullanıcı adı, isim, fotoğraf ve diğer profil bilgilerini değiştirebilir.',
  'users.ban': 'Kullanıcıyı geçici veya kalıcı olarak yasaklayabilir.',
  'content.moderate': 'Gönderi, reel ve yorumları gizleyebilir veya kaldırabilir.',
  'content.pin': 'Akışta gönderi sabitleyebilir ve sabitlemeyi kaldırabilir.',
  'reports.resolve': 'Kullanıcı şikayetlerini inceleyip sonuçlandırabilir.',
  'broadcasts.send': 'Tüm kullanıcılara veya seçili gruba bildirim gönderebilir.',
  'revenue.read': 'Gelir özetini ve ödeme kayıtlarını görebilir.',
  'features.toggle': 'Uygulamadaki özellikleri açıp kapatabilir.',
};

export const PANEL_PERMISSION_PREFIX = 'panel.';

export function panelPermissionKey(menuId: string): string {
  return `${PANEL_PERMISSION_PREFIX}${menuId}`;
}

/** @deprecated Use ACTION_PERMISSION_LABELS + panel catalog labels */
export const PERMISSION_LABELS: Record<string, string> = { ...ACTION_PERMISSION_LABELS };

/** @deprecated Use ACTION_PERMISSION_DESCRIPTIONS + panel catalog descriptions */
export const PERMISSION_DESCRIPTIONS: Record<string, string> = { ...ACTION_PERMISSION_DESCRIPTIONS };

export const PERMISSION_GROUPS = [
  { id: 'actions', label: 'Temel işlemler' },
  { id: 'management', label: 'Yönetim modülleri' },
  { id: 'programs', label: 'Program modülleri' },
  { id: 'communications', label: 'İletişim modülleri' },
  { id: 'analytics', label: 'Analiz modülleri' },
] as const;

export type PermissionGroupId = (typeof PERMISSION_GROUPS)[number]['id'];

/** @deprecated Populated after ADMIN_MENU_SECTIONS via rebuildPermissionMetadata() */
export const PERMISSION_GROUP_MAP: Record<string, PermissionGroupId> = {
  'users.read': 'actions',
  'users.edit': 'actions',
  'users.ban': 'actions',
  'content.moderate': 'actions',
  'content.pin': 'actions',
  'reports.resolve': 'actions',
  'broadcasts.send': 'actions',
  'revenue.read': 'actions',
  'features.toggle': 'actions',
};

export const CONTRIBUTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  completed: 'Tamamlandı',
  failed: 'Başarısız',
  refunded: 'İade edildi',
};

export const EVENT_TICKET_STATUS_LABELS: Record<string, string> = {
  pending: 'Ödeme bekliyor',
  paid: 'Ödendi',
  canceled: 'İptal edildi',
  refunded: 'İade edildi',
};

export const STRIPE_SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  expired: 'Süresi dolmuş',
  canceled: 'İptal edilmiş',
  cancelled: 'İptal edilmiş',
  past_due: 'Ödeme gecikmiş',
};

export const STRIPE_PLAN_LABELS: Record<string, string> = {
  monthly: 'Aylık Premium',
  yearly: 'Yıllık Premium',
};

export const PREMIUM_PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  apple: 'App Store',
  google: 'Google Play',
  stripe: 'Stripe',
};

export const STRIPE_PAYMENT_TYPE_LABELS: Record<string, string> = {
  contribution: 'Platform desteği',
  event_ticket: 'Etkinlik bileti',
};

export const STRIPE_PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  completed: 'Ödendi',
  paid: 'Ödendi',
  failed: 'Başarısız',
  refunded: 'İade edildi',
  cancelled: 'İptal edildi',
  canceled: 'İptal edildi',
};

export const BUSINESS_STATUS_LABELS: Record<string, string> = {
  pending: 'Onay bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
};

export const MODERATION_TARGET_LABELS: Record<string, string> = {
  post: 'Gönderi',
  reel: 'Reel',
  comment: 'Yorum',
  user: 'Kullanıcı',
  incident: 'Harita olayı',
  message: 'Mesaj',
};

export const REVENUE_TYPE_LABELS: Record<string, string> = {
  premium_business: 'Premium işletmeler',
  sponsored_content: 'Sponsorlu içerikler',
  job_listing: 'İş ilanı gelirleri',
  advertisement: 'Reklam gelirleri',
  event_ticket: 'Etkinlik biletleri',
  platform_contribution: 'Platform destek katkıları',
  marketplace_commission: 'Yerel Pazar komisyonları',
  rides_commission: 'Paylaşımlı yolculuk komisyonları',
};

export type AdminMenuAccent = 'primary' | 'success' | 'warning' | 'danger' | 'accent';

export const ADMIN_MENU_SECTIONS = [
  {
    title: 'Yönetim',
    items: [
      { id: 'commerce-ops', label: 'Ekonomi Operasyon Merkezi', icon: 'layers-outline' as const, href: '/admin/commerce-ops', adminOnly: true, accent: 'accent' as const },
      { id: 'vora-hizmetler', label: 'Vora Hizmetler Ödemeleri', icon: 'construct-outline' as const, href: '/admin/vora-hizmetler', adminOnly: true, accent: 'primary' as const },
      { id: 'kuru', label: 'Jeton Ekonomisi', icon: 'wallet-outline' as const, href: '/admin/kuru', adminOnly: true, accent: 'warning' as const },
      { id: 'hotel-marketing', label: 'Otel Pazarlama', icon: 'bed-outline' as const, href: '/admin/hotel-marketing', adminOnly: true, accent: 'success' as const },
      { id: 'hotels', label: 'Otel İlanları', icon: 'bed' as const, href: '/admin/hotels', adminOnly: false, accent: 'success' as const },
      { id: 'features', label: 'Özellik Görünürlüğü', icon: 'eye-outline' as const, href: '/admin/features', adminOnly: true, accent: 'accent' as const },
      { id: 'appearance', label: 'Görünüm & Tasarım', icon: 'color-palette-outline' as const, href: '/admin/appearance', adminOnly: true, accent: 'accent' as const },
      { id: 'users', label: 'Kullanıcılar', icon: 'people-outline' as const, href: '/admin/users', adminOnly: false, accent: 'primary' as const },
      { id: 'staff', label: 'Yönetici Atama', icon: 'shield-checkmark-outline' as const, href: '/admin/staff', adminOnly: true, accent: 'danger' as const },
      { id: 'account-lifecycle', label: 'Hesap Yaşam Döngüsü', icon: 'sync-outline' as const, href: '/admin/account-lifecycle', adminOnly: true, accent: 'warning' as const },
      { id: 'support', label: 'Destek Talepleri', icon: 'chatbubbles-outline' as const, href: '/admin/support', adminOnly: true, accent: 'primary' as const },
      { id: 'live-support', label: 'Canlı Destek', icon: 'headset-outline' as const, href: '/admin/live-support', adminOnly: true, accent: 'primary' as const },
      { id: 'premium-support', label: 'Premium Abonelik Desteği', icon: 'diamond-outline' as const, href: '/admin/premium-support', adminOnly: true, accent: 'success' as const },
      { id: 'appeals', label: 'İtirazlar', icon: 'hand-left-outline' as const, href: '/admin/appeals', adminOnly: false, accent: 'warning' as const },
      { id: 'reports', label: 'Şikayetler', icon: 'flag-outline' as const, href: '/admin/reports', adminOnly: false, accent: 'warning' as const },
      { id: 'ai-moderation', label: 'AI Moderasyon', icon: 'sparkles-outline' as const, href: '/admin/ai-moderation', adminOnly: false, accent: 'warning' as const },
      { id: 'vora-ai', label: 'Vora AI', icon: 'sparkles' as const, href: '/admin/vora-ai', adminOnly: true, accent: 'accent' as const },
      { id: 'messaging', label: 'Mesaj Moderasyonu', icon: 'chatbox-outline' as const, href: '/admin/messaging', adminOnly: false, accent: 'primary' as const },
      { id: 'heyet', label: 'Heyet', icon: 'shield-checkmark-outline' as const, href: '/admin/heyet', adminOnly: true, accent: 'accent' as const },
      { id: 'content', label: 'İçerik', icon: 'document-text-outline' as const, href: '/admin/content', adminOnly: false, accent: 'accent' as const },
      { id: 'businesses', label: 'Kurumsal', icon: 'business-outline' as const, href: '/admin/businesses', adminOnly: true, accent: 'success' as const },
      { id: 'business-shops', label: 'İşletme Mağazaları', icon: 'storefront-outline' as const, href: '/admin/business-shops', adminOnly: true, accent: 'warning' as const },
      { id: 'account-links', label: 'Hesap Bağlama', icon: 'link-outline' as const, href: '/admin/account-links', adminOnly: true, accent: 'primary' as const },
      { id: 'identity-verification', label: 'Kimlik Doğrulama', icon: 'id-card-outline' as const, href: '/admin/identity-verification', adminOnly: true, accent: 'primary' as const },
      { id: 'jobs', label: 'İş İlanları', icon: 'briefcase-outline' as const, href: '/admin/jobs', adminOnly: false, accent: 'primary' as const },
      { id: 'personnel', label: 'Personel & İş Arayan', icon: 'person-add-outline' as const, href: '/admin/personnel', adminOnly: false, accent: 'primary' as const },
      { id: 'campaigns', label: 'Kurumsal Kampanyalar', icon: 'megaphone-outline' as const, href: '/admin/campaigns', adminOnly: false, accent: 'warning' as const },
      { id: 'calls', label: 'Arama Moderasyonu', icon: 'call-outline' as const, href: '/admin/calls', adminOnly: false, accent: 'danger' as const },
      { id: 'social-safety', label: 'Engelleme & Sessiz', icon: 'ban-outline' as const, href: '/admin/social-safety', adminOnly: false, accent: 'warning' as const },
      { id: 'events', label: 'Etkinlikler', icon: 'calendar-outline' as const, href: '/admin/events', adminOnly: false, accent: 'accent' as const },
      { id: 'lost-items', label: 'Kayıp Merkezi', icon: 'search-outline' as const, href: '/admin/lost-items', adminOnly: false, accent: 'danger' as const },
      { id: 'vora-needs', label: 'İhtiyaç Ağı', icon: 'hand-left-outline' as const, href: '/admin/vora-needs', adminOnly: false, accent: 'accent' as const },
      { id: 'izdivac', label: 'İzdivaç Erişimi', icon: 'heart-half-outline' as const, href: '/admin/izdivac', adminOnly: false, accent: 'danger' as const },
      { id: 'izdivac-badge-notes', label: 'İzdivaç Tik Notları', icon: 'ribbon-outline' as const, href: '/admin/izdivac-badge-notes', adminOnly: true, accent: 'danger' as const },
      { id: 'marketplace', label: 'Yerel Pazar', icon: 'storefront-outline' as const, href: '/admin/marketplace', adminOnly: false, accent: 'warning' as const },
      { id: 'rides', label: 'Paylaşımlı Yolculuk', icon: 'car-outline' as const, href: '/admin/rides', adminOnly: false, accent: 'primary' as const },
      { id: 'centers', label: 'Merkez Yönetimi', icon: 'grid-outline' as const, href: '/admin/centers', adminOnly: false, accent: 'accent' as const },
      { id: 'proximity-match', label: 'Yakınlık Eşleşmesi', icon: 'location-outline' as const, href: '/admin/proximity-match', adminOnly: false, accent: 'danger' as const },
      { id: 'explorer', label: 'Kaşif Modu', icon: 'compass-outline' as const, href: '/admin/explorer', adminOnly: false, accent: 'accent' as const },
    ],
  },
  {
    title: 'Programlar',
    items: [
      { id: 'reporter', label: 'Muhabir Başvuruları', icon: 'newspaper-outline' as const, href: '/admin/reporter', adminOnly: false, accent: 'primary' as const },
      { id: 'news-verification', label: 'Haber Doğrulama', icon: 'shield-checkmark-outline' as const, href: '/admin/news-verification', adminOnly: false, accent: 'success' as const },
      { id: 'verification-center', label: 'Doğrulama Merkezi', icon: 'shield-outline' as const, href: '/admin/verification-center', adminOnly: false, accent: 'accent' as const },
      { id: 'communities', label: 'Topluluklar', icon: 'people-circle-outline' as const, href: '/admin/communities', adminOnly: false, accent: 'primary' as const },
      { id: 'channels', label: 'Kanallar', icon: 'radio-outline' as const, href: '/admin/channels', adminOnly: false, accent: 'accent' as const },
      { id: 'ads', label: 'Reklamlar', icon: 'megaphone-outline' as const, href: '/admin/ads', adminOnly: true, accent: 'warning' as const },
      { id: 'platform-debts', label: 'Platform Borcu', icon: 'wallet-outline' as const, href: '/admin/platform-debts', adminOnly: true, accent: 'danger' as const },
      { id: 'platform-contributions', label: 'Platform Katkıları', icon: 'heart-outline' as const, href: '/admin/platform-contributions', adminOnly: true, accent: 'success' as const },
      { id: 'friend-invites', label: 'Arkadaş Daveti', icon: 'gift-outline' as const, href: '/admin/friend-invites', adminOnly: true, accent: 'primary' as const },
      { id: 'referral-earnings', label: 'VORADA Hakediş', icon: 'cash-outline' as const, href: '/admin/referral-earnings', adminOnly: true, accent: 'success' as const },
      { id: 'referral-finance', label: 'Hakediş Finans', icon: 'stats-chart-outline' as const, href: '/admin/referral-finance', adminOnly: true, accent: 'warning' as const },
      { id: 'referral-settings', label: 'Hakediş Ayarları', icon: 'options-outline' as const, href: '/admin/referral-settings', adminOnly: true, accent: 'accent' as const },
      { id: 'badges', label: 'Rozet Yönetimi', icon: 'ribbon-outline' as const, href: '/admin/badges', adminOnly: true, accent: 'accent' as const },
      { id: 'app-intro', label: 'Uygulama Tanıtımı', icon: 'images-outline' as const, href: '/admin/app-intro', adminOnly: true, accent: 'primary' as const },
      { id: 'announcements', label: 'Duyuru Panosu', icon: 'megaphone-outline' as const, href: '/admin/announcements', adminOnly: true, accent: 'warning' as const },
      { id: 'premium', label: 'Premiumlu Hesaplar', icon: 'diamond-outline' as const, href: '/admin/premium', adminOnly: true, accent: 'success' as const },
      { id: 'vcts', label: 'VCTS', icon: 'finger-print-outline' as const, href: '/admin/vcts', adminOnly: false, accent: 'danger' as const },
      { id: 'tasks', label: 'Günlük Görevler', icon: 'checkbox-outline' as const, href: '/admin/tasks', adminOnly: true, accent: 'primary' as const },
      { id: 'hashtags', label: 'Etiket Yönetimi', icon: 'pricetag-outline' as const, href: '/admin/hashtags', adminOnly: false, accent: 'accent' as const },
      { id: 'agenda', label: 'Gündem Yönetimi', icon: 'calendar-outline' as const, href: '/admin/agenda', adminOnly: false, accent: 'accent' as const },
      { id: 'profile-boost', label: 'Profil Öne Çıkarma', icon: 'rocket-outline' as const, href: '/admin/profile-boost', adminOnly: true, accent: 'success' as const },
      { id: 'feed-curation', label: 'Gönderi Sabitleme', icon: 'pin-outline' as const, href: '/admin/feed-curation', adminOnly: true, accent: 'warning' as const },
      { id: 'reels-curation', label: 'Reels Sabitleme', icon: 'film-outline' as const, href: '/admin/reels-curation', adminOnly: true, accent: 'warning' as const },
      { id: 'discovery-curation', label: 'Keşfet Kürasyonu', icon: 'compass-outline' as const, href: '/admin/discovery-curation', adminOnly: false, accent: 'accent' as const },
    ],
  },
  {
    title: 'İletişim',
    items: [
      { id: 'platform-guide', label: 'Platform Rehberi', icon: 'book-outline' as const, href: '/admin/platform-guide', adminOnly: true, accent: 'success' as const },
      { id: 'broadcasts', label: 'Bildirim Merkezi', icon: 'megaphone-outline' as const, href: '/admin/broadcasts', adminOnly: true, accent: 'primary' as const },
      { id: 'push-automation', label: 'Push Bildirimleri', icon: 'notifications-outline' as const, href: '/admin/push-automation', adminOnly: true, accent: 'primary' as const },
      { id: 'emergency', label: 'Acil Durum', icon: 'warning-outline' as const, href: '/admin/emergency', adminOnly: true, accent: 'danger' as const },
      { id: 'operations', label: 'Operasyon', icon: 'settings-outline' as const, href: '/admin/operations', adminOnly: true, accent: 'accent' as const },
      { id: 'sounds', label: 'Bildirim Sesleri', icon: 'musical-notes-outline' as const, href: '/admin/notification-sounds', adminOnly: true, accent: 'accent' as const },
      { id: 'music-library', label: 'Müzik Kütüphanesi', icon: 'disc-outline' as const, href: '/admin/music-library', adminOnly: true, accent: 'accent' as const },
      { id: 'user-sounds', label: 'Kullanıcı Sesleri', icon: 'mic-outline' as const, href: '/admin/user-sounds', adminOnly: true, accent: 'accent' as const },
      { id: 'notification-stats', label: 'Bildirim İstatistikleri', icon: 'analytics-outline' as const, href: '/admin/notification-stats', adminOnly: true, accent: 'success' as const },
    ],
  },
  {
    title: 'Analiz',
    items: [
      { id: 'map', label: 'Harita', icon: 'map-outline' as const, href: '/admin/map', adminOnly: false, accent: 'accent' as const },
      { id: 'logs', label: 'İşlem Kayıtları', icon: 'list-outline' as const, href: '/admin/logs', adminOnly: false, accent: 'primary' as const },
      { id: 'statistics', label: 'İstatistikler', icon: 'bar-chart-outline' as const, href: '/admin/statistics', adminOnly: false, accent: 'success' as const },
      { id: 'revenue', label: 'Gelir Paneli', icon: 'cash-outline' as const, href: '/admin/revenue', adminOnly: true, accent: 'warning' as const },
      { id: 'security', label: 'Güvenlik', icon: 'lock-closed-outline' as const, href: '/admin/security', adminOnly: true, accent: 'danger' as const },
      { id: 'permissions', label: 'Rol İzin Şablonları', icon: 'key-outline' as const, href: '/admin/permissions', adminOnly: true, accent: 'accent' as const },
      { id: 'system', label: 'Sistem', icon: 'server-outline' as const, href: '/admin/system', adminOnly: true, accent: 'primary' as const },
      { id: 'stripe', label: 'Ödeme ve İade', icon: 'card-outline' as const, href: '/admin/stripe', adminOnly: true, accent: 'warning' as const },
    ],
  },
] as const;

export const ASSIGNABLE_ROLES: UserRole[] = [
  'user',
  'verified_reporter',
  'moderator',
  'admin',
];

/** Yönetici atama ekranında seçilebilir roller (tam yetki dahil). */
export const STAFF_ASSIGNABLE_ROLES: UserRole[] = [
  'user',
  'moderator',
  'admin',
  'super_admin',
];

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  user: 'Standart kullanıcı. Yönetim paneline erişemez.',
  verified_reporter: 'Haber doğrulama yapabilir; yönetim paneline giremez.',
  moderator: 'Şikayet ve içerik moderasyonu. Gelir ve sistem ayarlarına erişemez.',
  admin: 'Tüm yönetim paneli. Rol atama ve kritik ayarları değiştirebilir.',
  super_admin: 'Uygulamanın tam kontrolü — tüm yetkiler açık, kısıtlama yok.',
};

export const ROLE_CAPABILITY_GROUPS: Record<
  UserRole,
  { label: string; included: boolean }[]
> = {
  user: [],
  verified_reporter: [],
  moderator: [
    { label: 'Kullanıcıları görüntüleme', included: true },
    { label: 'Ban ve içerik moderasyonu', included: true },
    { label: 'Şikayet sonuçlandırma', included: true },
    { label: 'Gelir ve ödeme paneli', included: false },
    { label: 'Özellik açma / kapama', included: false },
  ],
  admin: [
    { label: 'Tüm moderasyon işlemleri', included: true },
    { label: 'Toplu bildirim gönderme', included: true },
    { label: 'Gelir ve ödeme paneli', included: true },
    { label: 'Rol atama ve izin şablonları', included: true },
    { label: 'Özellik açma / kapama', included: true },
  ],
  super_admin: [
    { label: 'Admin panelindeki her şey', included: true },
    { label: 'Rol ve izin yönetimi', included: true },
    { label: 'Sistem ve güvenlik ayarları', included: true },
    { label: 'Ödeme iadesi ve gelir', included: true },
    { label: 'Kısıtlama yok — tam yetki', included: true },
  ],
};

const ADMIN_SECTION_GROUP_MAP: Record<string, PermissionGroupId> = {
  Yönetim: 'management',
  Programlar: 'programs',
  İletişim: 'communications',
  Analiz: 'analytics',
};

export type AdminPanelPermission = {
  key: string;
  menuId: string;
  label: string;
  section: string;
  groupId: PermissionGroupId;
  icon: (typeof ADMIN_MENU_SECTIONS)[number]['items'][number]['icon'];
  adminOnly: boolean;
  href: string;
};

export const ADMIN_PANEL_PERMISSION_CATALOG: AdminPanelPermission[] = ADMIN_MENU_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({
    key: panelPermissionKey(item.id),
    menuId: item.id,
    label: item.label,
    section: section.title,
    groupId: ADMIN_SECTION_GROUP_MAP[section.title] ?? 'management',
    icon: item.icon,
    adminOnly: item.adminOnly,
    href: item.href,
  })),
);

for (const item of ADMIN_PANEL_PERMISSION_CATALOG) {
  PERMISSION_LABELS[item.key] = item.label;
  PERMISSION_DESCRIPTIONS[item.key] = `${item.label} sayfasına erişim ve işlem yetkisi.`;
  PERMISSION_GROUP_MAP[item.key] = item.groupId;
}

export type RolePermissionPresetId = 'moderator' | 'admin' | 'full' | 'minimal';

export const ROLE_PERMISSION_PRESETS: Record<
  RolePermissionPresetId,
  { label: string; description: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  moderator: {
    label: 'Moderatör paketi',
    description: 'Şikayet, içerik ve temel moderasyon modülleri',
    icon: 'shield-outline',
  },
  admin: {
    label: 'Admin paketi',
    description: 'Tüm yönetim paneli modülleri ve işlemler',
    icon: 'shield-checkmark-outline',
  },
  full: {
    label: 'Tam yetki',
    description: 'Tüm modüller ve işlemler açık',
    icon: 'star',
  },
  minimal: {
    label: 'Minimum',
    description: 'Yalnızca şikayet ve içerik moderasyonu',
    icon: 'remove-circle-outline',
  },
};

function buildPresetValues(mode: RolePermissionPresetId): Record<string, boolean> {
  const values: Record<string, boolean> = {};

  const actionDefaults: Record<RolePermissionPresetId, Record<string, boolean>> = {
    moderator: {
      'users.read': true,
      'users.edit': false,
      'users.ban': true,
      'content.moderate': true,
      'content.pin': false,
      'reports.resolve': true,
      'broadcasts.send': false,
      'revenue.read': false,
      'features.toggle': false,
    },
    admin: Object.fromEntries(ACTION_PERMISSION_KEYS.map((key) => [key, true])),
    full: Object.fromEntries(ACTION_PERMISSION_KEYS.map((key) => [key, true])),
    minimal: {
      'users.read': true,
      'users.edit': false,
      'users.ban': false,
      'content.moderate': true,
      'content.pin': false,
      'reports.resolve': true,
      'broadcasts.send': false,
      'revenue.read': false,
      'features.toggle': false,
    },
  };

  for (const key of ACTION_PERMISSION_KEYS) {
    values[key] = actionDefaults[mode][key] ?? false;
  }

  for (const item of ADMIN_PANEL_PERMISSION_CATALOG) {
    if (mode === 'full' || mode === 'admin') {
      values[item.key] = true;
    } else if (mode === 'minimal') {
      values[item.key] = ['reports', 'content', 'appeals', 'ai-moderation', 'messaging', 'users'].includes(item.menuId);
    } else {
      values[item.key] = !item.adminOnly;
    }
  }

  return values;
}

export const ROLE_PERMISSION_PRESET_VALUES: Record<RolePermissionPresetId, Record<string, boolean>> = {
  moderator: buildPresetValues('moderator'),
  admin: buildPresetValues('admin'),
  full: buildPresetValues('full'),
  minimal: buildPresetValues('minimal'),
};

/** Rol atama ekranında hızlı seçim kartları */
export const STAFF_ROLE_QUICK_OPTIONS: {
  role: UserRole;
  preset: RolePermissionPresetId | null;
  highlight: string;
}[] = [
  { role: 'user', preset: null, highlight: 'Panel erişimi kaldırılır' },
  { role: 'moderator', preset: 'moderator', highlight: 'Şikayet ve içerik moderasyonu' },
  { role: 'admin', preset: 'admin', highlight: 'Tüm yönetim paneli' },
  { role: 'super_admin', preset: 'full', highlight: 'Kısıtlama yok — tam kontrol' },
];
