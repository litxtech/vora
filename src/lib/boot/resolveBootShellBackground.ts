import { Appearance } from 'react-native';
import { colors } from '@/constants/theme';

/** app.config expo-splash-screen ile aynı — native → JS geçişinde flaş olmasın. */
export function resolveBootShellBackground(): string {
  return Appearance.getColorScheme() === 'dark' ? colors.dark.background : colors.light.background;
}
