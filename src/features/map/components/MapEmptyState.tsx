import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function MapEmptyState({ nearbyEnabled }: { nearbyEnabled?: boolean }) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.wrap} pointerEvents="none">
      <BlurView intensity={isDark ? 20 : 36} tint={isDark ? 'dark' : 'light'} style={styles.card}>
        <View style={[styles.inner, { borderColor: colors.border }]}>
          <Ionicons name="filter-outline" size={28} color={colors.textMuted} />
          <Text variant="label">Sonuç bulunamadı</Text>
          <Text secondary variant="caption" style={styles.text}>
            {nearbyEnabled
              ? 'Yakınınızda sonuç yok. Filtreleri genişletin veya arama terimini değiştirin.'
              : 'Filtreleri değiştirin veya arama terimini güncelleyin.'}
          </Text>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    maxWidth: 280,
  },
  inner: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  text: {
    textAlign: 'center',
  },
});
