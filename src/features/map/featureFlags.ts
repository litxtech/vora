import {
  buildControlSubFeature,
  featureControlId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import { MAP_LAYERS } from '@/features/map/constants';
import type { MapLayerId } from '@/features/map/types';

const PARENT = 'map';
const GROUP = 'tabs' as const;

/** Harita ekranı kontrol butonları ve katman filtreleri. */
export const MAP_FEATURE = {
  recenter: featureControlId(PARENT, 'recenter'),
  nearby: featureControlId(PARENT, 'nearby'),
  explorer: featureControlId(PARENT, 'explorer'),
  refresh: featureControlId(PARENT, 'refresh'),
  voraAi: featureControlId(PARENT, 'vora-ai'),
  incidentGraph: featureControlId(PARENT, 'incident-graph'),
  layer: (layerId: MapLayerId) => featureControlId(PARENT, `layer-${layerId}`),
} as const;

const CONTROL_BUTTONS: AppFeatureDef[] = [
  buildControlSubFeature(PARENT, GROUP, 'recenter', 'Konumuma git', 'Haritayı kullanıcı konumuna ortalama butonu'),
  buildControlSubFeature(PARENT, GROUP, 'nearby', 'Yakınımda filtresi', 'Yalnızca yakındaki işaretleri gösterme butonu'),
  buildControlSubFeature(PARENT, GROUP, 'explorer', 'Kaşif modu', 'Haritada anlık konum paylaşımı (yürüme) butonu'),
  buildControlSubFeature(PARENT, GROUP, 'refresh', 'Haritayı yenile', 'Harita verilerini yenileme butonu'),
  buildControlSubFeature(PARENT, GROUP, 'vora-ai', 'Vora AI (harita)', 'Harita üzerindeki Vora AI kısayolu'),
  buildControlSubFeature(
    PARENT,
    GROUP,
    'incident-graph',
    'Canlı olay grafiği (harita)',
    'Harita kontrollerindeki nabız / olay grafiği butonu',
  ),
];

const LAYER_CONTROLS: AppFeatureDef[] = MAP_LAYERS.map((layer) =>
  buildControlSubFeature(
    PARENT,
    GROUP,
    `layer-${layer.id}`,
    `Katman · ${layer.label}`,
    `Harita üst şeridindeki "${layer.label}" katman filtresi`,
  ),
);

export const MAP_SUB_FEATURES: AppFeatureDef[] = [...CONTROL_BUTTONS, ...LAYER_CONTROLS];

export const SUB_FEATURES = MAP_SUB_FEATURES;
