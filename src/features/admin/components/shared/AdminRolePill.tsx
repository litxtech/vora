import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { ROLE_LABELS } from '@/constants/roles';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { UserRole } from '@/types/database';

const ROLE_ICONS: Record<UserRole, keyof typeof Ionicons.glyphMap> = {
  user: 'person-outline',
  verified_reporter: 'newspaper-outline',
  moderator: 'shield-outline',
  admin: 'shield-checkmark-outline',
  super_admin: 'star',
};

type AdminRolePillProps = {
  role: UserRole;
  selected?: boolean;
  onPress: () => void;
};

export function AdminRolePill({ role, selected = false, onPress }: AdminRolePillProps) {
  const { colors } = useTheme();
  const color = selected ? colors.primary : colors.textSecondary;
  const bg = selected ? `${colors.primary}18` : `${colors.textSecondary}10`;
  const border = selected ? colors.primary : `${colors.border}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={ROLE_ICONS[role]} size={12} color={color} />
      <Text variant="caption" style={{ color, fontWeight: selected ? '700' : '600', fontSize: 11 }}>
        {ROLE_LABELS[role]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
