import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { PlatformMapProps } from '@/features/map/components/types';
import { spacing } from '@/constants/theme';

export function PlatformMap(_props: PlatformMapProps) {
  return (
    <View style={styles.fallback}>
      <Text variant="h3">Harita</Text>
      <Text secondary>Harita yalnızca iOS ve Android uygulamasında kullanılabilir.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
});
