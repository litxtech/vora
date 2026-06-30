import { buildControlSubFeature, buildTabSubFeatures, featureControlId } from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'support-center';
const GROUP = 'centers' as const;

export const SUPPORT_CENTER_TABS = [
  { id: 'live', label: 'Canlı Destek' },
  { id: 'tickets', label: 'Taleplerim' },
] as const;

export const SUPPORT_FEATURE = {
  tab: (tabId: string) => `${PARENT}.tab.${tabId}`,
  liveSend: featureControlId(PARENT, 'live-send'),
  liveAttachImage: featureControlId(PARENT, 'live-attach-image'),
  liveAttachVideo: featureControlId(PARENT, 'live-attach-video'),
  liveTopicChips: featureControlId(PARENT, 'live-topic-chips'),
  ticketsCreate: featureControlId(PARENT, 'tickets-create'),
  ticketsShortcuts: featureControlId(PARENT, 'tickets-shortcuts'),
  ticketsOpen: featureControlId(PARENT, 'tickets-open'),
  ticketsReply: featureControlId(PARENT, 'tickets-reply'),
} as const;

export const SUPPORT_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, SUPPORT_CENTER_TABS),
  buildControlSubFeature(PARENT, GROUP, 'live-send', 'Canlı · Mesaj gönder', 'Canlı destek yazı gönderme'),
  buildControlSubFeature(PARENT, GROUP, 'live-attach-image', 'Canlı · Fotoğraf', 'Canlı destek fotoğraf ekleme'),
  buildControlSubFeature(PARENT, GROUP, 'live-attach-video', 'Canlı · Video', 'Canlı destek video ekleme'),
  buildControlSubFeature(PARENT, GROUP, 'live-topic-chips', 'Canlı · Konu seçimi', 'Canlı destek konu çipleri'),
  buildControlSubFeature(PARENT, GROUP, 'tickets-create', 'Talep oluştur', 'Yeni destek talebi butonu'),
  buildControlSubFeature(PARENT, GROUP, 'tickets-shortcuts', 'Talep kısayolları', 'Hazır destek konu kartları'),
  buildControlSubFeature(PARENT, GROUP, 'tickets-open', 'Talep aç', 'Mevcut talebe giriş'),
  buildControlSubFeature(PARENT, GROUP, 'tickets-reply', 'Talep · Yanıtla', 'Destek talebine yanıt'),
];

export const SUB_FEATURES = SUPPORT_SUB_FEATURES;
