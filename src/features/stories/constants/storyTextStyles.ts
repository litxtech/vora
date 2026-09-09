/** Instagram tarzı hikâye metin stilleri */
export type StoryTextStyleId =
  | 'modern'
  | 'classic'
  | 'neon'
  | 'typewriter'
  | 'strong'
  | 'script';

export type StoryTextBackground = 'none' | 'semi' | 'solid';

export type StoryTextAlign = 'left' | 'center' | 'right';

export type StoryTextStyleDef = {
  id: StoryTextStyleId;
  label: string;
  fontWeight: '400' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic';
  fontFamily?: string;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase';
  defaultBackground: StoryTextBackground;
  textShadow?: {
    color: string;
    offset: { width: number; height: number };
    radius: number;
  };
};

export const STORY_TEXT_STYLES: StoryTextStyleDef[] = [
  {
    id: 'modern',
    label: 'Modern',
    fontWeight: '800',
    defaultBackground: 'none',
    textShadow: {
      color: 'rgba(0,0,0,0.85)',
      offset: { width: 0, height: 1 },
      radius: 4,
    },
  },
  {
    id: 'classic',
    label: 'Klasik',
    fontWeight: '600',
    fontStyle: 'normal',
    defaultBackground: 'none',
    textShadow: {
      color: 'rgba(0,0,0,0.75)',
      offset: { width: 0, height: 1 },
      radius: 3,
    },
  },
  {
    id: 'neon',
    label: 'Neon',
    fontWeight: '800',
    defaultBackground: 'none',
    textShadow: {
      color: 'rgba(130, 0, 255, 0.95)',
      offset: { width: 0, height: 0 },
      radius: 12,
    },
  },
  {
    id: 'typewriter',
    label: 'Daktilo',
    fontWeight: '600',
    fontFamily: 'Courier',
    letterSpacing: 0.5,
    defaultBackground: 'semi',
  },
  {
    id: 'strong',
    label: 'Güçlü',
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    defaultBackground: 'none',
  },
  {
    id: 'script',
    label: 'El Yazısı',
    fontWeight: '600',
    fontStyle: 'italic',
    defaultBackground: 'none',
  },
];

export function getStoryTextStyleDef(id?: StoryTextStyleId): StoryTextStyleDef {
  return STORY_TEXT_STYLES.find((s) => s.id === id) ?? STORY_TEXT_STYLES[0]!;
}
