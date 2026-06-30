import { REGIONS } from '@/constants/regions';
import type { AdCtaLabel, AdType } from '@/features/ads/types';
import type { Ionicons } from '@expo/vector-icons';

export const AD_TYPES: {
  id: AdType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { id: 'feed', label: 'Feed Reklamı', icon: 'newspaper-outline', color: '#7C3AED' },
  { id: 'reels', label: 'Reels Reklamı', icon: 'play-circle-outline', color: '#E91E63' },
  { id: 'map', label: 'Harita Reklamı', icon: 'map-outline', color: '#00BFA5' },
  { id: 'business', label: 'İşletme Reklamı', icon: 'storefront-outline', color: '#FF8F00' },
];

export const AD_STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  pending: 'Onay Bekliyor',
  active: 'Aktif',
  paused: 'Duraklatıldı',
  ended: 'Sona Erdi',
};

export const INTEREST_OPTIONS = [
  'Spor',
  'Haber',
  'Etkinlik',
  'İş',
  'Turizm',
  'Yemek',
  'Teknoloji',
  'Emlak',
];

export function adTypeMeta(type: AdType) {
  return AD_TYPES.find((t) => t.id === type) ?? AD_TYPES[0];
}

/** Feed sponsorlu kart gradyanı */
export const AD_FEED_ACCENT = '#7C3AED';
export const AD_FEED_GRADIENT = ['#7C3AED', '#EC4899', '#F59E0B'] as const;

/** Sabit tıklama ücreti: 8 kuruş (0,08 ₺) */
export const AD_CPC_CENTS = 8;
export const MIN_AD_BUDGET_CENTS = 1000;
export const MIN_AD_TOPUP_CENTS = 5000;
export const MAX_AD_TOPUP_CENTS = 1_000_000;

/** Hızlı yükleme paketleri (kuruş) */
export const AD_TOPUP_PRESETS_CENTS = [5000, 10_000, 25_000, 50_000, 100_000, 250_000] as const;

export function parseTopupAmountTry(text: string): number | null {
  const normalized = text.trim().replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function validateTopupAmountCents(cents: number, minCents = MIN_AD_TOPUP_CENTS): string | null {
  if (!Number.isFinite(cents) || cents < minCents) {
    return `Minimum yükleme ${formatBudget(minCents)} olmalıdır.`;
  }
  if (cents > MAX_AD_TOPUP_CENTS) {
    return `Maksimum yükleme ${formatBudget(MAX_AD_TOPUP_CENTS)} olmalıdır.`;
  }
  return null;
}

export const AD_BILLING_MODE_LABELS: Record<string, string> = {
  wallet_cpc: 'Cüzdan — tıklama başı',
};

/** Her yayın oturumu 24 saat sürer */
export const AD_SESSION_HOURS = 24;

export const AD_CTA_OPTIONS: { id: AdCtaLabel; label: string }[] = [
  { id: 'learn_more', label: 'Daha Fazla Bilgi' },
  { id: 'shop_now', label: 'Hemen Al' },
  { id: 'visit', label: 'Ziyaret Et' },
  { id: 'contact', label: 'İletişime Geç' },
  { id: 'sign_up', label: 'Kaydol' },
];

export const AD_STUDIO_STEPS = [
  { id: 'placement', label: 'Yerleşim', icon: 'layers-outline' as const },
  { id: 'creative', label: 'Tasarım', icon: 'color-palette-outline' as const },
  { id: 'audience', label: 'Hedef Kitle', icon: 'people-outline' as const },
  { id: 'budget', label: 'Bütçe', icon: 'wallet-outline' as const },
  { id: 'preview', label: 'Önizleme', icon: 'eye-outline' as const },
] as const;

export type AdStudioStepId = (typeof AD_STUDIO_STEPS)[number]['id'];

export function ctaLabelText(id: AdCtaLabel): string {
  return AD_CTA_OPTIONS.find((o) => o.id === id)?.label ?? 'Daha Fazla Bilgi';
}

export function formatBudget(cents: number): string {
  return `${(cents / 100).toLocaleString('tr-TR')} ₺`;
}

export function formatCpcKurus(cents: number = AD_CPC_CENTS): string {
  if (cents < 100) {
    return `${cents} kuruş`;
  }
  return formatBudget(cents);
}

export function formatAdDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAdRegions(ids: string[]): string {
  if (!ids.length) return 'Genel yayın (tüm bölgeler)';
  return ids.map((id) => REGIONS.find((r) => r.id === id)?.name ?? id).join(', ');
}

export function computeCtr(impressions: number, clicks: number): string {
  if (impressions <= 0) return '—';
  return `${((clicks / impressions) * 100).toFixed(1)}%`;
}

export function formatAdRemaining(endsAt: string | null | undefined): string | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'Süre doldu';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 1) return `${hours} sa ${minutes} dk kaldı`;
  return `${minutes} dk kaldı`;
}

export function isAdExpired(ad: { status: string; endsAt: string | null }): boolean {
  if (ad.status === 'ended') return true;
  if (!ad.endsAt) return false;
  return new Date(ad.endsAt).getTime() <= Date.now();
}

export function estimateClicksFromBudget(budgetCents: number, cpcCents: number = AD_CPC_CENTS): number {
  if (cpcCents <= 0) return 0;
  return Math.floor(budgetCents / cpcCents);
}
