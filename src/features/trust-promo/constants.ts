import type { TrustVacationPromoConfig } from '@/features/trust-promo/types';

/** Tatil promosyon kartı vurgu renkleri */
export const TRUST_PROMO_GRADIENT = ['#0F766E', '#059669', '#1D4ED8'] as const;
export const TRUST_PROMO_GRADIENT_DEEP = '#0C4A6E';
export const TRUST_PROMO_ACCENT = '#FDE68A';

export const TRUST_PROMO_DISMISS_KEY = 'trust_vacation_promo_dismissed_v1';

export const DEFAULT_TRUST_VACATION_PROMO: TrustVacationPromoConfig = {
  enabled: true,
  badge: 'Tatil heyecanı',
  title: "Vora'da tatil heyecanı devam ediyor",
  message:
    '100 güven puanına ulaşan üyelere Rize ve Uzungöl tatili hediye edilmeye devam ediyor. Hemen platforma katıl — sosyalleş, tüm Karadeniz\'de haberin olsun.',
  highlight: '100 puan · Rize & Uzungöl',
  cta_label: 'Puan kazanma rehberi',
  cta_href: '/settings/insights',
  image_url: null,
  dismissible: true,
  placements: {
    feed: true,
    wallet: true,
    insights: true,
    lobby: true,
  },
};
