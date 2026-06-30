import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { VORA_AI_ACCENT } from '@/features/vora-ai/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type VoraAIButtonProps = {
  onPress: () => void;
  label?: string;
  compact?: boolean;
  disabled?: boolean;
};

export function VoraAIButton({ onPress, label = 'Vora AI', compact, disabled }: VoraAIButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.compact,
        { backgroundColor: `${VORA_AI_ACCENT}18`, borderColor: `${VORA_AI_ACCENT}44` },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityLabel={label}
    >
      <Text style={styles.sparkle}>✨</Text>
      <Ionicons name="sparkles" size={compact ? 14 : 16} color={VORA_AI_ACCENT} />
      {!compact ? (
        <Text variant="caption" style={{ color: colors.text, fontWeight: '700' }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compact: {
    paddingHorizontal: spacing.xs,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
  },
  sparkle: {
    fontSize: 12,
    lineHeight: 14,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
});
