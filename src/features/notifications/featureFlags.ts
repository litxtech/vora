import {
  buildControlSubFeature,
  featureControlId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'notifications';
const GROUP = 'actions' as const;

/** Bildirim merkezi ekranı butonları. */
export const NOTIFICATIONS_FEATURE = {
  inboxMenu: featureControlId(PARENT, 'inbox-menu'),
  bulkDelete: featureControlId(PARENT, 'bulk-delete'),
} as const;

export const NOTIFICATIONS_SUB_FEATURES: AppFeatureDef[] = [
  buildControlSubFeature(
    PARENT,
    GROUP,
    'inbox-menu',
    'Bildirim menüsü',
    'Bildirim merkezindeki üç nokta menüsü (ayarlar, okundu, sil)',
  ),
  buildControlSubFeature(
    PARENT,
    GROUP,
    'bulk-delete',
    'Toplu silme',
    'Bildirim seçim modunda toplu silme butonu',
  ),
];

export const SUB_FEATURES = NOTIFICATIONS_SUB_FEATURES;
