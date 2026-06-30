import { useMemo } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { getChatTheme, type ChatTheme } from '../theme/chatTheme';

export function useChatTheme(): ChatTheme {
  const { colors, isDark } = useTheme();
  return useMemo(() => getChatTheme(colors, isDark), [colors, isDark]);
}
