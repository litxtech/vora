import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

type InputProps = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
};

export function Input({ label, error, hint, secureTextEntry, style, ...props }: InputProps) {
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry === true;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: error ? colors.danger : colors.border,
              backgroundColor: colors.surface,
            },
            isPassword && styles.inputWithIcon,
            style,
          ]}
          {...props}
        />
        {isPassword ? (
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" style={{ color: colors.danger, marginTop: spacing.xs }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" muted style={{ marginTop: spacing.xs }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputRow: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
  },
  inputWithIcon: {
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
