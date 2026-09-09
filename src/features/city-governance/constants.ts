import type { RegionId } from '@/constants/regions';
import type { CenterDef } from '@/features/centers/types';

export const CITY_GOVERNANCE_ACCENT = '#F59E0B';

export const CITY_CENTER_DEF: CenterDef = {
  id: 'city-system',
  section: 12,
  route: '/city',
  title: 'Şehir',
  subtitle: 'Liderlik, meclis, diplomasi ve şehir topluluğu',
  icon: 'business',
  accent: CITY_GOVERNANCE_ACCENT,
  group: 'community',
};

export const CITY_SECTIONS = [
  { id: 'live_room', label: 'Canlı Oda', icon: 'mic-outline' as const, phase: 4 },
  { id: 'leader', label: 'Lider', icon: 'ribbon-outline' as const, phase: 1 },
  { id: 'council', label: 'Meclis', icon: 'business-outline' as const, phase: 5 },
  { id: 'agenda', label: 'Gündem', icon: 'flame-outline' as const, phase: 6 },
  { id: 'elections', label: 'Seçimler', icon: 'checkbox-outline' as const, phase: 2 },
  { id: 'diplomacy', label: 'Diplomasi', icon: 'git-network-outline' as const, phase: 3 },
  { id: 'agreements', label: 'Anlaşmalar', icon: 'document-text-outline' as const, phase: 6 },
  { id: 'history', label: 'Şehir Geçmişi', icon: 'time-outline' as const, phase: 6 },
] as const;

export const PHASE_1_CITY_SLUGS: RegionId[] = [
  'trabzon',
  'rize',
  'giresun',
  'ordu',
  'samsun',
  'artvin',
  'gumushane',
];

export function cityPath(slug: string): `/city/${string}` {
  return `/city/${slug}`;
}

export function cityElectionPath(slug: string, electionId: string): `/city/${string}/election/${string}` {
  return `/city/${slug}/election/${electionId}`;
}

export function cityAgendaPath(): '/city-agenda' {
  return '/city-agenda';
}

export function resolveCitySlug(input: string | null | undefined): string | null {
  if (!input) return null;
  return input.trim().toLowerCase().replace(/\s+/g, '-');
}

export function formatCityStatCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')}K`;
  return String(value);
}
