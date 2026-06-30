import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminGoBack } from '@/features/admin/services/adminNavigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backLabel?: string;
  badge?: string;
  onBack?: () => void;
};

export function AdminHeader({
  title,
  subtitle,
  showBack = true,
  backLabel = 'Geri',
  badge,
  onBack,
}: AdminHeaderProps) {
  const { colors } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    adminGoBack();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        {showBack ? (
          <Pressable
            style={[styles.backBtn, { borderColor: `${colors.primary}44`, backgroundColor: `${colors.primary}14` }]}
            onPress={handleBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
            <Text variant="label" style={{ color: colors.primary, fontWeight: '700' }}>
              {backLabel}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        <LinearGradient
          colors={[`${colors.primary}33`, `${colors.accent}18`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.brandPill, { borderColor: `${colors.primary}44` }]}
        >
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
            Yönetim
          </Text>
        </LinearGradient>
      </View>

      <Text variant="h2" style={styles.title}>
        {title}
      </Text>

      {subtitle ? (
        <View style={styles.subtitleRow}>
          <Text secondary variant="caption">
            {subtitle}
          </Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}55` }]}>
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, marginBottom: spacing.sm },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 40,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  backPlaceholder: { minHeight: 40 },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  title: { letterSpacing: -0.3 },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
