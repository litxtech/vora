import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/constants/theme';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';

type TextProps = RNTextProps & {
  variant?: Variant;
  muted?: boolean;
  secondary?: boolean;
};

export function Text({
  variant = 'body',
  muted = false,
  secondary = false,
  style,
  ...props
}: TextProps) {
  const { colors } = useTheme();

  const color = muted ? colors.textMuted : secondary ? colors.textSecondary : colors.text;

  return (
    <RNText
      style={[typography[variant], { color }, style]}
      {...props}
    />
  );
}
