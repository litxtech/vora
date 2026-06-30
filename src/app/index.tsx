import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

/** Boot sırasında hafif placeholder — yönlendirme BootOrchestrator'da. */
export default function SplashRoute() {
  const { colors } = useTheme();
  return <View style={[styles.root, { backgroundColor: colors.background }]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
