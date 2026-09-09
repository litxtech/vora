import type { CenterDef } from '@/features/centers/types';
import type { DateCenterTab, DateSoughtGender } from '@/features/date/types';

export const DATE_CENTER_DEF: CenterDef = {
  id: 'date-center',
  section: 61,
  route: '/date-center',
  title: 'Date',
  subtitle: 'Plan paylaş · katılım iste · birlikte çık',
  icon: 'calendar-outline',
  accent: '#FF6B35',
  group: 'social',
  hasCreate: true,
};

export const DATE_ACCENT = '#FF6B35';
export const DATE_GRADIENT = ['#FF6B35', '#FF8E53'] as const;

export const DATE_CENTER_TABS: { id: DateCenterTab; label: string; icon: string }[] = [
  { id: 'discover', label: 'Keşfet', icon: 'compass-outline' },
  { id: 'mine', label: 'Date\'lerim', icon: 'heart-outline' },
  { id: 'requests', label: 'İstekler', icon: 'mail-unread-outline' },
];

export const DATE_SOUGHT_GENDER_OPTIONS: {
  id: DateSoughtGender;
  label: string;
  hint: string;
}[] = [
  { id: 'female', label: 'Kadın', hint: 'Kadın katılımcı aranıyor' },
  { id: 'male', label: 'Erkek', hint: 'Erkek katılımcı aranıyor' },
  { id: 'mixed', label: 'Karışık', hint: 'Kadın ve erkek katılımcı' },
  { id: 'any', label: 'Farketmez', hint: 'Cinsiyet önemli değil' },
];

export function dateSoughtGenderLabel(value: DateSoughtGender): string {
  return DATE_SOUGHT_GENDER_OPTIONS.find((o) => o.id === value)?.label ?? value;
}

export function dateStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Açık';
    case 'full':
      return 'Dolu';
    case 'completed':
      return 'Tamamlandı';
    case 'cancelled':
      return 'İptal';
    default:
      return status;
  }
}

export const DATE_TITLE_MAX = 120;
export const DATE_ACTIVITY_MAX = 120;
export const DATE_DESTINATION_MAX = 160;
export const DATE_LOOKING_FOR_MAX = 200;
export const DATE_CATEGORY_MAX = 60;
export const DATE_DESCRIPTION_MAX = 500;
export const DATE_MESSAGE_MAX = 280;
export const DATE_USER_SEARCH_MIN_LENGTH = 2;
export const DATE_USER_SEARCH_LIMIT = 12;
