import type { ThemeColors } from '@/constants/theme';

export type ChatTheme = {
  screenBg: string;
  wallpaperDot: string;
  incomingBubble: string;
  outgoingBubble: string;
  incomingText: string;
  outgoingText: string;
  metaIncoming: string;
  metaOutgoing: string;
  composerBg: string;
  /** Opak composer — klavye açıkken duvar kağıdı sızmasını önler */
  composerBgSolid: string;
  composerBorder: string;
  inputBg: string;
  inputPlaceholder: string;
  headerBg: string;
  headerBorder: string;
  rowBg: string;
  rowBorder: string;
  rowUnreadBg: string;
  searchBg: string;
  accentRead: string;
  replyAccent: string;
};

export function getChatTheme(colors: ThemeColors, isDark: boolean): ChatTheme {
  if (isDark) {
    return {
      screenBg: '#0A1018',
      wallpaperDot: 'rgba(30, 136, 229, 0.06)',
      incomingBubble: '#182430',
      outgoingBubble: '#1565C0',
      incomingText: '#EEF2F6',
      outgoingText: '#FFFFFF',
      metaIncoming: '#7A8B9E',
      metaOutgoing: 'rgba(255,255,255,0.68)',
      composerBg: 'rgba(12, 18, 26, 0.96)',
      composerBgSolid: '#0C121A',
      composerBorder: 'rgba(255,255,255,0.08)',
      inputBg: 'rgba(255,255,255,0.09)',
      inputPlaceholder: colors.textMuted,
      headerBg: 'rgba(12, 18, 26, 0.98)',
      headerBorder: 'rgba(255,255,255,0.08)',
      rowBg: colors.surface,
      rowBorder: 'rgba(255,255,255,0.06)',
      rowUnreadBg: 'rgba(30, 136, 229, 0.08)',
      searchBg: colors.surface,
      accentRead: '#53BDEB',
      replyAccent: '#64B5F6',
    };
  }

  return {
    screenBg: '#E8EEF5',
    wallpaperDot: 'rgba(21, 101, 192, 0.07)',
    incomingBubble: '#FFFFFF',
    outgoingBubble: colors.primary,
    incomingText: colors.text,
    outgoingText: '#FFFFFF',
    metaIncoming: colors.textMuted,
    metaOutgoing: 'rgba(255,255,255,0.82)',
    composerBg: 'rgba(255, 255, 255, 0.97)',
    composerBgSolid: '#FFFFFF',
    composerBorder: colors.border,
    inputBg: 'rgba(15, 23, 42, 0.07)',
    inputPlaceholder: colors.textMuted,
    headerBg: colors.surface,
    headerBorder: colors.border,
    rowBg: colors.surface,
    rowBorder: colors.border,
    rowUnreadBg: 'rgba(21, 101, 192, 0.06)',
    searchBg: colors.surface,
    accentRead: '#0288D1',
    replyAccent: colors.primary,
  };
}
