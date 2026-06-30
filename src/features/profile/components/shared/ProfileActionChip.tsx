import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileActionChipProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: 'default' | 'primary' | 'danger' | 'premium';
};

export function ProfileActionChip({
  label,
  icon,
  onPress,
  tone = 'default',
}: ProfileActionChipProps) {
  const { colors } = useTheme();

  const toneColor =
    tone === 'primary'
      ? colors.primary
      : tone === 'danger'
        ? colors.danger
        : tone === 'premium'
          ? '#FFB300'
          : colors.textSecondary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: `${toneColor}55`,
          backgroundColor: `${toneColor}14`,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={onPress}
    >
      {icon ? <Ionicons name={icon} size={14} color={toneColor} /> : null}
      <Text variant="caption" style={{ color: toneColor, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
