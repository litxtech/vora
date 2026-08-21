import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileEmptyStateProps = {
  loading?: boolean;
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function ProfileEmptyState({
  loading = false,
  title = 'İçerik yok',
  message = 'Bu sekmede henüz bir şey bulunmuyor.',
  icon = 'file-tray-outline',
}: ProfileEmptyStateProps) {
  const { colors } = useTheme();

  // Spinner yok — sayfa anında açılmış gibi; içerik gelince dolar.
  if (loading) {
    return <View style={styles.loadingShell} />;
  }

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text variant="label">{title}</Text>
      <Text secondary variant="caption" style={styles.message}>
        {message}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  loadingShell: { flex: 1, minHeight: 120 },
  card: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { textAlign: 'center' },
});
