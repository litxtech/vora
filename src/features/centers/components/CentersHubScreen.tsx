import { View, StyleSheet } from 'react-native';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { CentersMenuContent } from '@/features/centers/components/CentersMenuContent';
import { spacing } from '@/constants/theme';

export function CentersHubScreen({ embeddedInTab = false }: { embeddedInTab?: boolean }) {
  return (
    <GradientBackground>
      {!embeddedInTab ? (
        <View style={styles.backRow}>
          <ScreenBackButton />
        </View>
      ) : null}
      <CentersMenuContent variant="page" />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  backRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
