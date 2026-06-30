import {
  buildNestedTabSubFeatures,
  buildSectionSubFeature,
  buildTabSubFeatures,
  buildControlSubFeature,
  featureControlId,
  featureTabId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import { HOTEL_BROWSE_TABS, HOTEL_HUBS } from '@/features/hotel-center/constants';

const PARENT = 'hotel-center';
const GROUP = 'centers' as const;

const BROWSE_HUB = featureTabId(PARENT, 'browse');

export const HOTEL_FEATURE = {
  tab: (tabId: string) => featureTabId(PARENT, tabId),
  browseTab: (tabId: string) => featureTabId(BROWSE_HUB, tabId),
  guestReservations: featureControlId(PARENT, 'guest-reservations'),
  manageReservations: featureControlId(PARENT, 'manage-reservations'),
  earnings: featureControlId(PARENT, 'earnings'),
  detailReserve: featureControlId(PARENT, 'detail-reserve'),
  detailEdit: featureControlId(PARENT, 'detail-edit'),
  detailCall: featureControlId(PARENT, 'detail-call'),
  detailWhatsapp: featureControlId(PARENT, 'detail-whatsapp'),
  detailShare: featureControlId(PARENT, 'detail-share'),
  section: {
    create: `${PARENT}.section.create`,
  },
} as const;

export const HOTEL_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, HOTEL_HUBS),
  ...buildNestedTabSubFeatures(BROWSE_HUB, GROUP, HOTEL_BROWSE_TABS),
  buildSectionSubFeature(PARENT, GROUP, 'create', 'Otel ekle', 'Yeni konaklama ilanı oluşturma'),
  buildControlSubFeature(PARENT, GROUP, 'guest-reservations', 'Rezervasyonlarım (misafir)', 'Keşfet sekmesindeki rezervasyon kısayolu'),
  buildControlSubFeature(PARENT, GROUP, 'manage-reservations', 'Rezervasyonlar (işletme)', 'Yönetim sekmesindeki rezervasyon butonu'),
  buildControlSubFeature(PARENT, GROUP, 'earnings', 'Otel kazançları', 'Yönetim sekmesindeki kazançlarım kısayolu'),
  buildControlSubFeature(PARENT, GROUP, 'detail-reserve', 'Detay · Rezervasyon', 'Otel detayında rezervasyon yap'),
  buildControlSubFeature(PARENT, GROUP, 'detail-edit', 'Detay · Düzenle', 'Sahip · otel düzenleme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-call', 'Detay · Ara', 'Otel detayında telefon'),
  buildControlSubFeature(PARENT, GROUP, 'detail-whatsapp', 'Detay · WhatsApp', 'Otel detayında WhatsApp'),
  buildControlSubFeature(PARENT, GROUP, 'detail-share', 'Detay · Paylaş', 'Otel detayında paylaşım'),
];

export const SUB_FEATURES = HOTEL_SUB_FEATURES;
