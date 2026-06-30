import { StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type NotificationPrefRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  accent?: string;
  disabled?: boolean;
  highlight?: boolean;
};

export function NotificationPrefRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  accent,
  disabled,
  highlight,
}: NotificationPrefRowProps) {
  const { colors } = useTheme();
  const iconColor = accent ?? colors.primary;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: highlight ? `${iconColor}12` : colors.surfaceElevated,
          borderColor: highlight ? `${iconColor}44` : colors.border,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View style={styles.copy}>
        <Text variant="label">{label}</Text>
        {description ? (
          <Text variant="caption" secondary>
            {description}
          </Text>
        ) : null}
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: iconColor }}
        thumbColor="#fff"
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
