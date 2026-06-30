import type { CenterDef } from '@/features/centers/types';

export const HELP_CENTER_DEF: CenterDef = {
  id: 'help',
  section: 49,
  route: '/help-center',
  title: 'Yardım & Gönüllülük',
  subtitle: 'Yardım talepleri, kan ihtiyacı ve gönüllü ekipler',
  icon: 'heart',
  accent: '#EC407A',
  group: 'social',
  hasCreate: true,
};

export const HELP_CENTER_ACCENT = HELP_CENTER_DEF.accent;

export const HELP_CREATE_PATH = '/help-center/create' as const;

export const HELP_MIN_TITLE_LENGTH = 3;
export const HELP_MAX_TITLE_LENGTH = 120;
export const HELP_MIN_DESCRIPTION_LENGTH = 10;
export const HELP_MAX_DESCRIPTION_LENGTH = 1000;

export function helpRequestDetailPath(id: string): string {
  return `/detail/help-requests/${id}`;
}

export function volunteerTeamDetailPath(id: string): string {
  return `/detail/volunteer-teams/${id}`;
}

export type HelpCenterMode = 'requests' | 'teams';

export const HELP_CENTER_MODE_TABS: { id: HelpCenterMode; label: string; icon: string }[] = [
  { id: 'requests', label: 'Talepler', icon: 'heart-outline' },
  { id: 'teams', label: 'Gönüllü Ekipler', icon: 'people-outline' },
];

export type HelpCategory = 'blood' | 'medicine' | 'student' | 'search' | 'other';
export type HelpUrgency = 'low' | 'medium' | 'high' | 'critical';

export type HelpRequest = {
  id: string;
  authorId?: string;
  category: HelpCategory;
  urgency: HelpUrgency;
  title: string;
  description: string;
  contactInfo: string | null;
  isResolved?: boolean;
  createdAt: string;
};

export const HELP_URGENCY_OPTIONS: { value: HelpUrgency; label: string; color: string }[] = [
  { value: 'low', label: 'Düşük', color: '#78909C' },
  { value: 'medium', label: 'Orta', color: '#F9A825' },
  { value: 'high', label: 'Yüksek', color: '#FB8C00' },
  { value: 'critical', label: 'Kritik', color: '#E53935' },
];

export const HELP_CATEGORIES: Record<HelpCategory, { label: string; icon: string; color: string }> = {
  blood: { label: 'Kan İhtiyacı', icon: 'water', color: '#E53935' },
  medicine: { label: 'Acil İlaç', icon: 'medical', color: '#1E88E5' },
  student: { label: 'Öğrenci Desteği', icon: 'school', color: '#9C27B0' },
  search: { label: 'Gönüllü Arama', icon: 'search', color: '#FF7043' },
  other: { label: 'Diğer', icon: 'heart', color: '#EC407A' },
};

export const HELP_CATEGORY_OPTIONS = (
  Object.entries(HELP_CATEGORIES) as [HelpCategory, (typeof HELP_CATEGORIES)[HelpCategory]][]
).map(([value, meta]) => ({ value, ...meta }));

export const HELP_TABS = [
  { id: 'all', label: 'Tümü', icon: 'heart-outline' },
  { id: 'blood', label: 'Kan', icon: 'water-outline' },
  { id: 'medicine', label: 'İlaç', icon: 'medical-outline' },
  { id: 'student', label: 'Öğrenci', icon: 'school-outline' },
  { id: 'search', label: 'Arama', icon: 'search-outline' },
];

export const URGENCY_COLORS: Record<HelpUrgency, string> = {
  low: '#78909C',
  medium: '#F9A825',
  high: '#FB8C00',
  critical: '#E53935',
};
