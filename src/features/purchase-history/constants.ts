export const PURCHASE_HISTORY_ROUTE = '/settings/purchase-history';

/** Satın alma anından itibaren itiraz penceresi. */
export const DISPUTE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export const DISPUTE_REASON_MIN = 10;
export const DISPUTE_REASON_MAX = 800;

export const PURCHASE_HISTORY_NOTICE =
  'İtiraz süresi satın alma tarihinden itibaren 3 gün ile sınırlıdır.';

export const USAGE_LABELS = {
  using: 'Kullanıyor',
  used: 'Kullandı',
  unused: 'Kullanılmadı',
} as const;

export const DISPUTE_STATUS_LABELS = {
  open: 'İtirazınız alındı',
  reviewing: 'İtiraz inceleniyor',
  accepted: 'İtiraz kabul edildi',
  rejected: 'İtiraz reddedildi',
} as const;

export const PREMIUM_PACKAGE_LABELS: Record<string, string> = {
  monthly: 'Vora Premium · Aylık',
  yearly: 'Vora Premium · Yıllık',
};

export const SUPPORT_PACKAGE_LABELS: Record<string, string> = {
  supporter_159: 'Platform desteği · Destekçi',
  supporter_259: 'Platform desteği · Gönüllü',
  supporter_359: 'Platform desteği · Elçi',
};

export const SHOP_BOOST_PACKAGE_LABELS: Record<string, string> = {
  starter: 'Mağaza vitrini · Başlangıç',
  standard: 'Mağaza vitrini · Standart',
  premium: 'Mağaza vitrini · Premium',
};

export const PROVIDER_LABELS: Record<string, string> = {
  apple: 'App Store',
  google: 'Google Play',
  stripe: 'Stripe',
};

export const SHOP_SCOPE_LABELS: Record<string, string> = {
  region: 'Bölgesel',
  karadeniz: 'Karadeniz geneli',
};
