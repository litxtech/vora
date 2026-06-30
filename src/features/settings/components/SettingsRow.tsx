import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'danger';
  accent?: string;
};

export function SettingsRow({ icon, label, onPress, tone, accent }: SettingsRowProps) {
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.danger : accent ?? colors.text;

  return (
    <Pressable style={styles.row} onPress={onPress} hitSlop={6}>
      <Ionicons name={icon} size={20} color={color} />
      <Text variant="body" style={{ color, flex: 1 }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
});
