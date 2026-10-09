import type { CenterDef } from '@/features/centers/types';

export const VORA_CANLAR_CENTER_DEF: CenterDef = {
  id: 'vora-canlar',
  section: 60,
  route: '/vora-canlar',
  title: 'Vora Canlar',
  subtitle: 'Hayvan kurtarma, tedavi ve dayanışma',
  icon: 'paw',
  accent: '#C47B4A',
  group: 'social',
  hasCreate: true,
};

export const CANLAR_ACCENT = '#C47B4A';
export const CANLAR_POLICY_VERSION = '2026-10-09';
export const CANLAR_MIN_DONATION_MINOR = 1000;
export const CANLAR_MAX_DONATION_MINOR = 50_000_000;

export const CANLAR_COMPANY = {
  name: 'LITXTECH LLC',
  email: 'support@litxtech.com',
  address: '15442 VENTURA BLVD STE 201-183',
} as const;

/** Yapılandırılmamış dış servisler. Arayüz bunları varmış gibi göstermez. */
export const CANLAR_UNCONFIGURED = {
  stripeConnect:
    'Bu Stripe hesabında Connect / connected account akışı yok. Doğrudan kliniğe otomatik transfer yapılmaz. Ödeme, yönetici onaylı ve referanslı manuel kayıtla izlenir.',
  identityLiveness:
    'Kimlik belgesi yüklemek canlılık kontrolü değildir. Vora’nın mevcut kimlik incelemesi kullanılır. Ayrı bir canlılık veya kimlik eşleştirme sağlayıcısı yapılandırılmamıştır.',
  processorFee:
    'İşlem ücreti için sabit bir oran kullanılmaz. Kesin ücret, Stripe bakiye hareketi geldikten sonra bağış kaydına yazılır.',
} as const;

export const SPECIES_OPTIONS = [
  { id: 'cat', label: 'Kedi' },
  { id: 'dog', label: 'Köpek' },
  { id: 'bird', label: 'Kuş' },
  { id: 'other', label: 'Diğer' },
] as const;

export const URGENCY_OPTIONS = [
  { id: 'normal', label: 'Normal' },
  { id: 'urgent', label: 'Acil' },
  { id: 'critical', label: 'Çok acil' },
] as const;

export const RESCUE_STATUS_LABELS: Record<string, string> = {
  new_report: 'Yeni ihbar',
  awaiting_review: 'İnceleme bekliyor',
  verifying: 'Doğrulanıyor',
  rescue_planned: 'Kurtarma planlanıyor',
  team_dispatched: 'Kurtarma ekibi yönlendirildi',
  rescued: 'Kurtarıldı',
  vet_assessment: 'Veteriner değerlendirmesinde',
  treatment: 'Tedavi devam ediyor',
  recovery: 'İyileşme sürecinde',
  rehomed: 'Güvenli yuvaya yerleştirildi',
  completed: 'Başarıyla sonuçlandı',
  lost: 'Hayvan kaybedildi',
  cancelled: 'İptal edildi',
  duplicate: 'Mükerrer kayıt',
};

export const TREATMENT_LABELS: Record<string, string> = {
  unknown: 'Tedavi bilgisi yok',
  not_needed: 'Tedavi gerekmiyor',
  assessment: 'Değerlendirme',
  ongoing: 'Tedavi sürüyor',
  recovery: 'İyileşme',
  completed: 'Tedavi tamamlandı',
  lost: 'Kaybedildi',
};

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  in_review: 'İnceleme bekliyor',
  needs_info: 'Ek bilgi gerekli',
  approved: 'Onaylandı',
  live: 'Yayında',
  paused: 'Geçici olarak durduruldu',
  goal_met: 'Hedef tamamlandı',
  expired: 'Süresi doldu',
  rejected: 'Reddedildi',
  cancelled: 'İptal edildi',
  report_pending: 'Sonuç raporu bekliyor',
  closed: 'Sonuçlandırıldı',
};

export const DONATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Ödeme bekleniyor',
  succeeded: 'Ödeme kesinleşti',
  failed: 'Ödeme başarısız',
  refunded: 'İade edildi',
  partially_refunded: 'Kısmi iade',
  disputed: 'Ters ibraz incelemesinde',
};

export const PAYOUT_MODEL_LABELS: Record<string, string> = {
  beneficiary: 'Yetkili kampanya sahibi',
  clinic: 'Klinik veya veteriner',
  supplier: 'Doğrulanmış tedarikçi',
};

export function formatMinor(amount: number | null | undefined, currency = 'try'): string {
  if (amount == null || Number.isNaN(amount)) return 'Henüz belli değil';
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(amount));
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole.toLocaleString('tr-TR')},${frac} ${currency.toUpperCase()}`;
}
