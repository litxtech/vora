import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { VctsTrustStatus } from '@/features/vcts/constants';
import { formatTrustCodeShort } from '@/features/vcts/constants';

type VctsBadgeProps = {
  trustCode: string;
  status?: VctsTrustStatus | string;
  compact?: boolean;
  onPress?: () => void;
};

const STATUS_LABELS: Record<string, string> = {
  verified: 'Doğrulanmış',
  disputed: 'İtirazlı',
  tampered: 'Değiştirilmiş',
  pending: 'Beklemede',
};

export function VctsBadge({ trustCode, status = 'verified', compact, onPress }: VctsBadgeProps) {
  const { colors } = useTheme();
  const isVerified = status === 'verified';
  const label = STATUS_LABELS[status] ?? 'VORA';

  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        {
          backgroundColor: isVerified ? `${colors.accent}18` : `${colors.danger}18`,
          borderColor: isVerified ? `${colors.accent}40` : `${colors.danger}40`,
        },
      ]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`VORA içerik güveni: ${label}`}
    >
      <Ionicons
        name={isVerified ? 'shield-checkmark' : 'shield-outline'}
        size={compact ? 12 : 14}
        color={isVerified ? colors.accent : colors.danger}
      />
      <Text
        variant="caption"
        style={[styles.label, { color: isVerified ? colors.accent : colors.danger }]}
        numberOfLines={1}
      >
        {compact ? formatTrustCodeShort(trustCode) : `VORA · ${label}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    fontWeight: '600',
    fontSize: 11,
  },
});
