import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type FeedEmptyStateProps = {
  loading?: boolean;
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function FeedEmptyState({
  loading = false,
  title = 'Henüz içerik yok',
  message = 'Bölgenizdeki paylaşımlar burada görünecek.',
  icon = 'newspaper-outline',
}: FeedEmptyStateProps) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text secondary variant="caption">
          Akış yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
        <Ionicons name={icon} size={32} color={colors.primary} />
      </View>
      <Text variant="label">{title}</Text>
      <Text secondary variant="caption" style={styles.message}>
        {message}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.md },
  card: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, marginTop: spacing.md },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { textAlign: 'center' },
});
