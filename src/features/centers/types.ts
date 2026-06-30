export type CenterId =
  | 'personnel-center'
  | 'event-center'
  | 'lost-center'
  | 'help'
  | 'tip-line'
  | 'marketplace'
  | 'rides'
  | 'vora-needs'
  | 'vora-hizmetler'
  | 'hotel-center'
  | 'business-center'
  | 'support-center'
  | 'izdivac-center';

export type CenterGroup = 'community' | 'map' | 'economy' | 'media' | 'social';

export type CenterDef = {
  id: CenterId;
  section: number;
  route: string;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
  group: CenterGroup;
  hasMap?: boolean;
  hasCreate?: boolean;
};

export const CENTER_GROUPS: { id: CenterGroup; label: string }[] = [
  { id: 'community', label: 'Topluluk' },
  { id: 'map', label: 'Harita & Konum' },
  { id: 'economy', label: 'Ekonomi & İş' },
  { id: 'media', label: 'Medya' },
  { id: 'social', label: 'Sosyal' },
];
