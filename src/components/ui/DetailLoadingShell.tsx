import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { spacing } from '@/constants/theme';
import { shouldUsePlainScreenBackground } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

type DetailLoadingShellProps = {
  /** Gradient arka plan (varsayılan düz tema rengi). */
  gradient?: boolean;
  showBack?: boolean;
};

/**
 * Detay/route veri beklerken spinner yok — sayfa anında açılmış gibi hissettirir.
 */
export function DetailLoadingShell({
  gradient = false,
  showBack = true,
}: DetailLoadingShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const useGradient = gradient && !shouldUsePlainScreenBackground();

  const body = (
    <View style={[styles.body, { paddingTop: insets.top + spacing.md }]}>
      {showBack ? <ScreenBackButton /> : null}
    </View>
  );

  if (useGradient) {
    return <GradientBackground>{body}</GradientBackground>;
  }

  return <View style={[styles.root, { backgroundColor: colors.background }]}>{body}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});
