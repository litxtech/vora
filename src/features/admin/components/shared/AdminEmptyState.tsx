import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminEmptyStateProps = {
  loading?: boolean;
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function AdminEmptyState({
  loading = false,
  title = 'Kayıt yok',
  message = 'Bu bölümde gösterilecek veri bulunamadı.',
  icon = 'file-tray-outline',
}: AdminEmptyStateProps) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.textMuted}22` }]}>
        <Ionicons name={icon} size={28} color={colors.textMuted} />
      </View>
      <Text variant="label">{title}</Text>
      <Text secondary variant="caption" style={styles.message}>
        {message}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: spacing.xl, alignItems: 'center' },
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
