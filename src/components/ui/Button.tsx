import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

type ButtonSize = 'default' | 'compact';

type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  variant = 'primary',
  size = 'default',
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors, metrics } = useTheme();
  const { radius, spacing } = metrics;

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
        {
          borderRadius: radius.md,
          borderWidth: 1,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 52,
        },
        size === 'compact' && {
          minHeight: 36,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
        },
        fullWidth && styles.fullWidth,
        {
          backgroundColor: variantStyles.bg,
          borderColor: variantStyles.border,
          opacity: disabled || loading ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
      disabled={disabled || loading}
      {...getAndroidInstantPressableProps()}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text} />
      ) : (
        <Text
          variant="label"
          style={{
            color: variantStyles.text,
            textAlign: 'center',
            fontSize: size === 'compact' ? 13 : undefined,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
});
