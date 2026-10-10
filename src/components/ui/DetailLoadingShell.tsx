import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { radius, spacing } from '@/constants/theme';
import { shouldUsePlainScreenBackground } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

type DetailLoadingShellProps = {
  /** Gradient arka plan (varsayılan düz tema rengi). */
  gradient?: boolean;
  showBack?: boolean;
};

/**
 * Detay açılırken boş zemin yerine sayfa iskeleti — geri, satırlar, medya alanı.
 */
export function DetailLoadingShell({
  gradient = false,
  showBack = true,
}: DetailLoadingShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const useGradient = gradient && !shouldUsePlainScreenBackground();
  const bone = colors.border;

  const body = (
    <View style={[styles.body, { paddingTop: insets.top + spacing.md }]}>
      {showBack ? <ScreenBackButton /> : null}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: bone }]} />
          <View style={styles.copy}>
            <View style={[styles.line, styles.lineMid, { backgroundColor: bone }]} />
            <View style={[styles.line, styles.lineShort, { backgroundColor: bone }]} />
          </View>
        </View>
        <View style={[styles.line, { backgroundColor: bone }]} />
        <View style={[styles.line, styles.lineMid, { backgroundColor: bone }]} />
        <View style={[styles.line, styles.lineShort, { backgroundColor: bone }]} />
        <View style={[styles.block, { backgroundColor: bone }]} />
      </View>
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
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  line: {
    height: 12,
    width: '92%',
    borderRadius: 6,
  },
  lineMid: {
    width: '68%',
  },
  lineShort: {
    width: '40%',
    height: 10,
  },
  block: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
  },
});
