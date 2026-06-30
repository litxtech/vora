export const colors = {
  dark: {
    background: '#0A0E14',
    surface: '#121820',
    surfaceElevated: '#1A2230',
    border: '#2A3444',
    text: '#F4F7FB',
    textSecondary: '#9AA8BC',
    textMuted: '#6B7A8F',
    primary: '#1E88E5',
    primaryMuted: '#1565C0',
    accent: '#00BFA5',
    danger: '#EF5350',
    warning: '#FFB300',
    success: '#43A047',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
  light: {
    background: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    border: '#CBD5E1',
    text: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    primary: '#1565C0',
    primaryMuted: '#0D47A1',
    accent: '#00897B',
    danger: '#D32F2F',
    warning: '#F9A825',
    success: '#2E7D32',
    overlay: 'rgba(15, 23, 42, 0.4)',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 18 },
} as const;

export const gradients = {
  dark: {
    karadeniz: ['#050810', '#0A1220', '#0D1B2E', '#0A0E14'] as const,
    default: ['#0B1220', '#141C2B', '#1A2236', '#0A0E14'] as const,
    waveAccent: 'rgba(30, 136, 229, 0.08)',
  },
  light: {
    karadeniz: ['#D4DEE9', '#E2EAF3', '#EEF2F7', '#F5F7FA'] as const,
    default: ['#D8E0EA', '#E6ECF3', '#F0F3F7', '#F5F7FA'] as const,
    waveAccent: 'rgba(21, 101, 192, 0.1)',
  },
} as const;

export const glassSurface = {
  dark: {
    border: 'rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.04)',
    overlay: 'rgba(255, 255, 255, 0.03)',
    chip: 'rgba(255, 255, 255, 0.05)',
    handle: 'rgba(255, 255, 255, 0.2)',
  },
  light: {
    border: '#CBD5E1',
    background: '#FFFFFF',
    overlay: '#F8FAFC',
    chip: '#F8FAFC',
    handle: '#CBD5E1',
  },
} as const;

export type ThemeMode = 'dark' | 'light';
export type ThemeColors = (typeof colors)[ThemeMode];
