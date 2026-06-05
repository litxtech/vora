import { SafeAreaView, StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing } from '@/constants/theme';

type ScreenProps = ViewProps & {
  padded?: boolean;
};

export function Screen({ children, style, padded = true, ...props }: ScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View
        style={[styles.container, padded && styles.padded, style]}
        {...props}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  padded: { paddingHorizontal: spacing.md },
});
