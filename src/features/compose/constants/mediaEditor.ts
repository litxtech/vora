export type MediaEditorFilterId =
  | 'none'
  | 'golden'
  | 'rose'
  | 'mint'
  | 'midnight'
  | 'sunset'
  | 'arctic'
  | 'vintage'
  | 'neon';

export type MediaEditorFilterDef = {
  id: MediaEditorFilterId;
  label: string;
  /** Ana renk katmanı — yarı saydam */
  overlay: string | null;
  /** İkinci katman (gradient hissi) */
  overlay2?: string | null;
  /** Önizleme dairesi rengi */
  swatch: string;
};

/** Snapchat tarzı yarı saydam renk filtreleri */
export const MEDIA_EDITOR_FILTERS: MediaEditorFilterDef[] = [
  { id: 'none', label: 'Orijinal', overlay: null, swatch: '#888888' },
  { id: 'golden', label: 'Altın', overlay: 'rgba(255, 198, 90, 0.28)', swatch: '#FFC65A' },
  { id: 'rose', label: 'Gül', overlay: 'rgba(255, 105, 160, 0.26)', swatch: '#FF69A0' },
  { id: 'mint', label: 'Nane', overlay: 'rgba(72, 220, 180, 0.24)', swatch: '#48DCB4' },
  { id: 'midnight', label: 'Gece', overlay: 'rgba(50, 70, 160, 0.32)', swatch: '#3246A0' },
  {
    id: 'sunset',
    label: 'Gün Batımı',
    overlay: 'rgba(255, 90, 60, 0.22)',
    overlay2: 'rgba(255, 180, 60, 0.14)',
    swatch: '#FF6A3C',
  },
  { id: 'arctic', label: 'Buz', overlay: 'rgba(160, 215, 255, 0.3)', swatch: '#A0D7FF' },
  { id: 'vintage', label: 'Vintage', overlay: 'rgba(210, 175, 120, 0.26)', swatch: '#D2AF78' },
  {
    id: 'neon',
    label: 'Neon',
    overlay: 'rgba(130, 0, 255, 0.18)',
    overlay2: 'rgba(0, 255, 210, 0.12)',
    swatch: '#8200FF',
  },
];
