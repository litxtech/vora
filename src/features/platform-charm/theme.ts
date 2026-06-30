import type { GenderId } from '@/constants/registration';

export type PlatformCharmVariant = 'male' | 'female' | 'neutral';

export type PlatformCharmTheme = {
  variant: PlatformCharmVariant;
  gradient: readonly [string, string, string];
  rim: string;
  glow: string;
  sparkle: string;
  accent: string;
  title: string;
  description: string;
};

const MALE_THEME: PlatformCharmTheme = {
  variant: 'male',
  gradient: ['#67E8F9', '#2563EB', '#1E1B4B'],
  rim: '#BAE6FD',
  glow: '#38BDF8',
  sparkle: '#E0F2FE',
  accent: '#3B82F6',
  title: 'Vora İkonu',
  description:
    'Vora platformu tarafından topluluğun en yakışıklı üyesi olarak seçilen kişilere verilen özel rozet.',
};

const FEMALE_THEME: PlatformCharmTheme = {
  variant: 'female',
  gradient: ['#FDE68A', '#F472B6', '#DB2777'],
  rim: '#FCE7F3',
  glow: '#FB7185',
  sparkle: '#FFF1F2',
  accent: '#EC4899',
  title: 'Vora İkonu',
  description:
    'Vora platformu tarafından topluluğun en güzel üyesi olarak seçilen kişilere verilen özel rozet.',
};

const NEUTRAL_THEME: PlatformCharmTheme = {
  variant: 'neutral',
  gradient: ['#E9D5FF', '#818CF8', '#06B6D4'],
  rim: '#EDE9FE',
  glow: '#A78BFA',
  sparkle: '#F5F3FF',
  accent: '#8B5CF6',
  title: 'Vora İkonu',
  description:
    'Vora platformu tarafından topluluğun öne çıkan üyelerine verilen özel rozet.',
};

export function resolvePlatformCharmVariant(gender?: GenderId | null): PlatformCharmVariant {
  if (gender === 'male') return 'male';
  if (gender === 'female') return 'female';
  return 'neutral';
}

export function getPlatformCharmTheme(gender?: GenderId | null): PlatformCharmTheme {
  const variant = resolvePlatformCharmVariant(gender);
  if (variant === 'male') return MALE_THEME;
  if (variant === 'female') return FEMALE_THEME;
  return NEUTRAL_THEME;
}
