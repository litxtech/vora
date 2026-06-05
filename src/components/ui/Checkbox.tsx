import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

type CheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  label: React.ReactNode;
  error?: boolean;
};

export function Checkbox({ checked, onToggle, label, error }: CheckboxProps) {
  const { colors } = useTheme();

  return (
    <Pressable style={styles.row} onPress={onToggle}>
      <View
        style={[
          styles.box,
          {
            borderColor: error ? colors.danger : checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : 'transparent',
          },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
      <View style={styles.labelWrap}>{typeof label === 'string' ? <Text variant="caption">{label}</Text> : label}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  labelWrap: {
    flex: 1,
  },
});
