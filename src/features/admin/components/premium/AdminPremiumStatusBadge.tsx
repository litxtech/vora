import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type BadgeTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'gold';

type Props = {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
};

const PREMIUM_GOLD = '#FFB300';

export function AdminPremiumStatusBadge({ label, tone = 'default', dot = false }: Props) {
  const { colors } = useTheme();

  const toneColor =
    tone === 'gold'
      ? PREMIUM_GOLD
      : tone === 'primary'
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
      {dot ? <View style={[styles.dot, { backgroundColor: toneColor }]} /> : null}
      <Text variant="caption" style={{ color: toneColor, fontWeight: '700', fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
