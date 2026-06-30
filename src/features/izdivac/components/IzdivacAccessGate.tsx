import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { useIzdivacAccess } from '@/features/izdivac/hooks/useIzdivacAccess';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function IzdivacAccessGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const hasAccess = useIzdivacAccess();

  useEffect(() => {
    if (!hasAccess) {
      router.replace('/(tabs)' as never);
    }
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text secondary variant="caption">
            Yönlendiriliyor…
          </Text>
        </View>
      </GradientBackground>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
