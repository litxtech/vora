import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();

  const variantStyles = {
    primary: { bg: colors.primary, text: '#FFFFFF', border: colors.primary },
    secondary: { bg: colors.surfaceElevated, text: colors.text, border: colors.border },
    ghost: { bg: 'transparent', text: colors.textSecondary, border: 'transparent' },
    danger: { bg: colors.danger, text: '#FFFFFF', border: colors.danger },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
  }[variant];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: variantStyles.bg,
          borderColor: variantStyles.border,
          opacity: disabled || loading ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text} />
      ) : (
        <Text variant="label" style={{ color: variantStyles.text, textAlign: 'center' }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  fullWidth: {
    width: '100%',
  },
});
