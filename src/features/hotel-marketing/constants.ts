import type { HotelMarketingCampaignType } from '@/features/hotel-marketing/types';

export const HOTEL_MARKETING_CAMPAIGN_LABELS: Record<HotelMarketingCampaignType, string> = {
  weekend_youth: 'Hafta sonu genç akını',
  event: 'Etkinlik / kampanya',
  seasonal: 'Sezon fırsatı',
  student_deal: 'Öğrenci odaklı',
  custom: 'Özel mesaj',
};

export const HOTEL_MARKETING_CAMPAIGN_ICONS: Record<HotelMarketingCampaignType, string> = {
  weekend_youth: 'people',
  event: 'sparkles',
  seasonal: 'sunny',
  student_deal: 'school',
  custom: 'megaphone',
};

export const HOTEL_MARKETING_CAMPAIGN_TYPES: HotelMarketingCampaignType[] = [
  'weekend_youth',
  'event',
  'seasonal',
  'student_deal',
  'custom',
];

export const HOTEL_MARKETING_POPULAR_SEARCHES = [
  'Trabzon',
  'Rize',
  'öğrenci',
  'hafta sonu',
  'merkez',
] as const;

/** Kampanya türüne göre bildirim varsayılanı (platform / bölgesel kapsam). */
export function hotelMarketingNotifyDefault(
  type: HotelMarketingCampaignType,
  scope: 'platform' | 'region',
): boolean {
  switch (type) {
    case 'weekend_youth':
    case 'seasonal':
      return scope === 'platform';
    case 'event':
      return true;
    case 'student_deal':
      return scope === 'region';
    case 'custom':
    default:
      return false;
  }
}

export function formatHotelMarketingPushBody(hotelName: string, message: string): string {
  const body = `${hotelName} — ${message.trim()}`;
  return body.length > 180 ? `${body.slice(0, 177)}…` : body;
}

export const HOTEL_MARKETING_SUGGESTIONS: Record<HotelMarketingCampaignType, { headline: string; message: string }> = {
  weekend_youth: {
    headline: 'Hafta sonu genç akını',
    message: 'Bu otelde hafta sonları gençler akın ediyor — erken rezervasyon yapın.',
  },
  event: {
    headline: 'Özel etkinlik haftası',
    message: 'Sınırlı süreli konaklama kampanyası — detaylar için hemen inceleyin.',
  },
  seasonal: {
    headline: 'Sezon fırsatı',
    message: 'Bu dönemde öne çıkan konaklama seçeneği — kaçırmayın.',
  },
  student_deal: {
    headline: 'Öğrencilere özel',
    message: 'Öğrenci indirimi ve merkezi konum — kampüs yakını konaklama.',
  },
  custom: {
    headline: 'Öne çıkan otel',
    message: 'Admin tarafından önerilen konaklama — şimdi keşfedin.',
  },
};
