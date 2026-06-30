import { PIONEER_COLOR, PIONEER_DESCRIPTION, PIONEER_TITLE } from '@/features/pioneer/constants';

export type PioneerTheme = {
  gradient: readonly [string, string, string];
  accent: string;
  rim: string;
  title: string;
  description: string;
};

export const PIONEER_THEME: PioneerTheme = {
  gradient: ['#67E8F9', '#0891B2', '#164E63'],
  accent: PIONEER_COLOR,
  rim: '#A5F3FC',
  title: PIONEER_TITLE,
  description: PIONEER_DESCRIPTION,
};
