export type StoryLinkColorPreset = {
  id: string;
  backgroundColor: string;
  textColor: string;
  label: string;
};

export const STORY_LINK_COLOR_PRESETS: StoryLinkColorPreset[] = [
  { id: 'white', backgroundColor: '#FFFFFF', textColor: '#111827', label: 'Beyaz' },
  { id: 'black', backgroundColor: '#111827', textColor: '#FFFFFF', label: 'Siyah' },
  { id: 'blue', backgroundColor: '#1E88E5', textColor: '#FFFFFF', label: 'Mavi' },
  { id: 'teal', backgroundColor: '#00BFA5', textColor: '#FFFFFF', label: 'Turkuaz' },
  { id: 'pink', backgroundColor: '#FF2D55', textColor: '#FFFFFF', label: 'Pembe' },
  { id: 'purple', backgroundColor: '#7C3AED', textColor: '#FFFFFF', label: 'Mor' },
  { id: 'amber', backgroundColor: '#F59E0B', textColor: '#111827', label: 'Amber' },
  { id: 'glass', backgroundColor: 'rgba(255,255,255,0.22)', textColor: '#FFFFFF', label: 'Cam' },
];

export const DEFAULT_STORY_LINK_COLOR = STORY_LINK_COLOR_PRESETS[2];

export const STORY_MAX_LINKS = 5;

/** Hex veya rgba rengine alfa ekler (bölücü, rozet vb.). */
export function storyLinkWithAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgba')) return color;
  const hex = color.replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
