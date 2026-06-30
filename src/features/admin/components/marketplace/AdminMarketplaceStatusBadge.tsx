import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type BadgeTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

type AdminMarketplaceStatusBadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export function AdminMarketplaceStatusBadge({ label, tone = 'default' }: AdminMarketplaceStatusBadgeProps) {
  const { colors } = useTheme();

  const toneColor =
    tone === 'primary'
      ? colors.primary
      : tone === 'success'
        ? colors.success
        : tone === 'warning'
          ? colors.warning
          : tone === 'danger'
            ? colors.danger
            : colors.textSecondary;

  return (
    <View style={[styles.badge, { backgroundColor: `${toneColor}18`, borderColor: `${toneColor}44` }]}>
      <Text variant="caption" style={{ color: toneColor, fontWeight: '700', fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
});
