import { CENTER_BY_ID } from '@/constants/centers';
import { EVENT_CENTER_DEF } from '@/features/events/constants';
import { HELP_CENTER_DEF } from '@/features/help/constants';
import { HOTEL_GRADIENT } from '@/features/hotel-center/constants';
import { LOST_CENTER_DEF } from '@/features/lost-found/constants';
import { MARKETPLACE_GRADIENT } from '@/features/marketplace/constants';
import { PERSONNEL_GRADIENT } from '@/features/personnel-center/constants';
import { RIDES_GRADIENT } from '@/features/rides/constants';
import { TIP_LINE_CENTER_DEF } from '@/features/tip-line/constants';
import { VORA_NEEDS_GRADIENT } from '@/features/vora-needs/constants';
import { IZDIVAC_GRADIENT } from '@/features/izdivac/constants';
import type { CenterDef, CenterId } from '@/features/centers/types';

const CENTER_GRADIENTS: Partial<Record<CenterId, readonly [string, string]>> = {
  marketplace: MARKETPLACE_GRADIENT,
  rides: RIDES_GRADIENT,
  'hotel-center': HOTEL_GRADIENT,
  'personnel-center': PERSONNEL_GRADIENT,
  'vora-needs': VORA_NEEDS_GRADIENT,
  'izdivac-center': IZDIVAC_GRADIENT,
  'lost-center': [LOST_CENTER_DEF.accent, '#C62828'],
  'event-center': [EVENT_CENTER_DEF.accent, '#AD1457'],
  help: [HELP_CENTER_DEF.accent, '#C2185B'],
  'tip-line': [TIP_LINE_CENTER_DEF.accent, '#5E35B1'],
};

export function getCenterGradient(center: CenterDef): readonly [string, string] {
  return CENTER_GRADIENTS[center.id] ?? [center.accent, `${center.accent}BB`];
}

export function getCenterGradientById(id: CenterId): readonly [string, string] | null {
  const center = CENTER_BY_ID[id];
  if (!center) return null;
  return getCenterGradient(center);
}
