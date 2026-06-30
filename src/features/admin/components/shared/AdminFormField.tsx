import { StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminFormFieldProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  accent?: string;
};

export function AdminFormField({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  accent,
}: AdminFormFieldProps) {
  const { colors } = useTheme();
  const borderColor = accent ?? colors.border;

  return (
    <View style={styles.wrap}>
      {label ? <Text variant="caption">{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          multiline && styles.textarea,
          { borderColor, color: colors.text, backgroundColor: `${colors.surface}88` },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textarea: { minHeight: 96, paddingTop: spacing.md },
});
