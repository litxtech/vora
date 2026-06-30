import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type EditProfileSectionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: ReactNode;
};

export function EditProfileSection({ icon, title, children }: EditProfileSectionProps) {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name={icon} size={16} color={colors.primary} />
        </View>
        <Text variant="label">{title}</Text>
      </View>
      <View style={styles.body}>{children}</View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: spacing.md,
  },
});
