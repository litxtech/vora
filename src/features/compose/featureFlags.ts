import {
  buildControlSubFeature,
  featureControlId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'compose';
const GROUP = 'actions' as const;

/** Gönderi oluştur ekranındaki ekleme butonları. */
export const COMPOSE_FEATURE = {
  photo: featureControlId(PARENT, 'photo'),
  video: featureControlId(PARENT, 'video'),
  music: featureControlId(PARENT, 'music'),
  location: featureControlId(PARENT, 'location'),
  options: featureControlId(PARENT, 'options'),
} as const;

export const COMPOSE_SUB_FEATURES: AppFeatureDef[] = [
  buildControlSubFeature(PARENT, GROUP, 'photo', 'Fotoğraf ekle', 'Galeriden fotoğraf seçme butonu'),
  buildControlSubFeature(PARENT, GROUP, 'video', 'Video ekle', 'Galeriden veya kameradan video seçme butonu'),
  buildControlSubFeature(PARENT, GROUP, 'music', 'Müzik ekle', 'Fotoğrafa müzik ekleme butonu'),
  buildControlSubFeature(PARENT, GROUP, 'location', 'Konum ekle', 'Gönderiye konum ekleme butonu'),
  buildControlSubFeature(
    PARENT,
    GROUP,
    'options',
    'Gönderi ayarları',
    'Kitle (herkese/arkadaş) ve kategori seçenekleri paneli',
  ),
];

export const SUB_FEATURES = COMPOSE_SUB_FEATURES;
