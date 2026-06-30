import type { AppAppearanceConfig } from '@/features/app-appearance/types';
import { DEFAULT_FEATURED_CENTER_IDS } from '@/features/centers/constants';
import { DEFAULT_TRUST_VACATION_PROMO } from '@/features/trust-promo/constants';

export const APP_APPEARANCE_CONFIG_KEY = 'app_appearance';

export const DEFAULT_FEED_BANNER = {
  enabled: false,
  title: '',
  message: '',
  tone: 'info' as const,
  dismissible: true,
};

export const DEFAULT_APP_APPEARANCE: AppAppearanceConfig = {
  version: 2,
  colors: { dark: {}, light: {} },
  gradients: { dark: {}, light: {} },
  spacing: {},
  radius: {},
  typography: {},
  tab_bar: { dark: {}, light: {} },
  feed: { banner: { ...DEFAULT_FEED_BANNER } },
  centers_hub: {
    title: 'Merkezler',
    subtitle: 'Topluluk, harita ve ekonomi — hepsi tek yerde',
    featured_center_ids: [...DEFAULT_FEATURED_CENTER_IDS],
  },
  branding: {},
  lobby: {
    tagline: "Karadeniz'in dijital topluluğu",
    welcome_title: 'Hoş geldiniz',
    welcome_subtitle: 'Hesabınıza giriş yapın',
    announcements: [],
  },
  trust_vacation_promo: { ...DEFAULT_TRUST_VACATION_PROMO },
};

/** Admin panelinde düzenlenebilir renk anahtarları */
export const EDITABLE_COLOR_KEYS = [
  { key: 'primary', label: 'Ana renk (butonlar)' },
  { key: 'primaryMuted', label: 'Ana renk (koyu ton)' },
  { key: 'accent', label: 'Vurgu rengi' },
  { key: 'background', label: 'Arka plan' },
  { key: 'surface', label: 'Yüzey' },
  { key: 'text', label: 'Metin' },
  { key: 'danger', label: 'Hata / uyarı kırmızısı' },
  { key: 'success', label: 'Başarı yeşili' },
] as const;

export const EDITABLE_SPACING_KEYS = [
  { key: 'sm', label: 'Küçük (sm)' },
  { key: 'md', label: 'Orta (md)' },
  { key: 'lg', label: 'Büyük (lg)' },
  { key: 'xl', label: 'Çok büyük (xl)' },
] as const;

export const EDITABLE_RADIUS_KEYS = [
  { key: 'sm', label: 'Köşe sm' },
  { key: 'md', label: 'Köşe md (buton)' },
  { key: 'lg', label: 'Köşe lg' },
  { key: 'xl', label: 'Köşe xl' },
  { key: 'full', label: 'Tam yuvarlak (tab bar)' },
] as const;

export const EDITABLE_TYPOGRAPHY_KEYS = [
  { key: 'h1', label: 'Başlık h1' },
  { key: 'h2', label: 'Başlık h2' },
  { key: 'h3', label: 'Başlık h3' },
  { key: 'body', label: 'Gövde metni' },
  { key: 'label', label: 'Etiket / buton' },
  { key: 'caption', label: 'Küçük metin' },
] as const;

export const TAB_BAR_COLOR_KEYS = [
  { key: 'activeTint', label: 'Aktif sekme rengi' },
  { key: 'inactiveTint', label: 'Pasif sekme rengi' },
  { key: 'background', label: 'Arka plan' },
  { key: 'border', label: 'Kenarlık' },
] as const;

export const LOBBY_ANNOUNCEMENT_TONE_LABELS = {
  info: 'Bilgi',
  warning: 'Uyarı',
  success: 'Başarı',
  accent: 'Vurgu',
} as const;
