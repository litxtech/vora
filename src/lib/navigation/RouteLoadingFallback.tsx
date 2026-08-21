import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

/**
 * Lazy route chunk yüklenirken spinner yok — iOS/Android aynı his:
 * tema rengi dolu ekran, içerik gelince anında yerleşir.
 */
export function RouteLoadingFallback() {
  const { colors } = useTheme();
  return <View style={[styles.root, { backgroundColor: colors.background }]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
