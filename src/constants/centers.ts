import { BUSINESS_CENTER_DEF } from '@/features/business-center/constants';
import { EVENT_CENTER_DEF } from '@/features/events/constants';
import { HELP_CENTER_DEF } from '@/features/help/constants';
import { LOST_CENTER_DEF } from '@/features/lost-found/constants';
import { HOTEL_CENTER_DEF } from '@/features/hotel-center/constants';
import { MARKETPLACE_CENTER_DEF } from '@/features/marketplace/constants';
import { RIDES_CENTER_DEF } from '@/features/rides/constants';
import { PERSONNEL_CENTER_DEF } from '@/features/personnel-center/constants';
import { TIP_LINE_CENTER_DEF } from '@/features/tip-line/constants';
import { VORA_NEEDS_CENTER_DEF } from '@/features/vora-needs/constants';
import { VORA_HIZMETLER_CENTER_DEF } from '@/features/vora-hizmetler/constants';
import { IZDIVAC_CENTER_DEF } from '@/features/izdivac/constants';
import type { CenterDef, CenterGroup, CenterId } from '@/features/centers/types';
import { CENTER_GROUPS } from '@/features/centers/types';

export type { CenterDef, CenterGroup, CenterId };
export { CENTER_GROUPS };

export const CENTERS: CenterDef[] = [
  PERSONNEL_CENTER_DEF,
  EVENT_CENTER_DEF,
  LOST_CENTER_DEF,
  HELP_CENTER_DEF,
  TIP_LINE_CENTER_DEF,
  MARKETPLACE_CENTER_DEF,
  BUSINESS_CENTER_DEF,
  HOTEL_CENTER_DEF,
  RIDES_CENTER_DEF,
  VORA_NEEDS_CENTER_DEF,
  VORA_HIZMETLER_CENTER_DEF,
  IZDIVAC_CENTER_DEF,
];

export const CENTER_BY_ID = Object.fromEntries(CENTERS.map((c) => [c.id, c])) as Record<
  CenterId,
  CenterDef
>;

export function centersByGroup(group: CenterGroup): CenterDef[] {
  return CENTERS.filter((c) => c.group === group);
}
