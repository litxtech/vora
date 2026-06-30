import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminActionChipProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: 'default' | 'primary' | 'danger' | 'success' | 'warning';
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AdminActionChip({
  label,
  icon,
  onPress,
  tone = 'default',
  loading = false,
  disabled = false,
  compact = false,
  fullWidth = false,
  style,
}: AdminActionChipProps) {
  const { colors } = useTheme();

  const toneColor =
    tone === 'primary'
      ? colors.primary
      : tone === 'danger'
        ? colors.danger
        : tone === 'success'
          ? colors.success
          : tone === 'warning'
            ? colors.warning
            : colors.textSecondary;

  const iconSize = compact ? 11 : 14;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        compact && styles.chipCompact,
        fullWidth && styles.chipFullWidth,
        {
          borderColor: `${toneColor}55`,
          backgroundColor: `${toneColor}14`,
          opacity: pressed || disabled ? 0.65 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={toneColor} />
      ) : icon ? (
        <Ionicons name={icon} size={iconSize} color={toneColor} />
      ) : null}
      <Text
        variant="caption"
        style={{ color: toneColor, fontWeight: '600', fontSize: compact ? 11 : undefined }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipCompact: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 3,
    minHeight: 28,
  },
  chipFullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
});
