import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type PersonnelAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
};

type PersonnelActionRowProps = {
  actions: PersonnelAction[];
};

export function PersonnelActionRow({ actions }: PersonnelActionRowProps) {
  const { colors } = useTheme();

  if (actions.length === 0) return null;

  return (
    <View style={[styles.row, { borderTopColor: colors.border }]}>
      {actions.map((action) => {
        const accent =
          action.variant === 'primary'
            ? colors.primary
            : action.variant === 'danger'
              ? colors.danger
              : colors.textSecondary;

        return (
          <Pressable
            key={action.id}
            onPress={action.onPress}
            disabled={action.disabled || action.loading}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: pressed ? `${accent}12` : 'transparent',
                opacity: action.disabled ? 0.45 : 1,
              },
            ]}
          >
            {action.loading ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <Ionicons name={action.icon} size={18} color={accent} />
            )}
            <Text variant="caption" style={{ color: accent }}>
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
});
