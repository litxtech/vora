import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

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
  const { colors, metrics } = useTheme();

  const color = muted ? colors.textMuted : secondary ? colors.textSecondary : colors.text;

  return (
    <RNText
      style={[metrics.typography[variant], { color }, style]}
      {...props}
    />
  );
}
