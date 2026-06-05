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
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
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

export type ThemeMode = 'dark' | 'light';
export type ThemeColors = (typeof colors)[ThemeMode];
