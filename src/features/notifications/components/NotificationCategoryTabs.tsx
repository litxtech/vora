import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { NOTIFICATION_CATEGORIES, type NotificationCategoryId } from '@/constants/notifications';
import { CATEGORY_TAB_ICONS } from '@/features/notifications/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  active: NotificationCategoryId;
  onChange: (id: NotificationCategoryId) => void;
  unreadByCategory?: Partial<Record<NotificationCategoryId, number>>;
};

export function NotificationCategoryTabs({ active, onChange, unreadByCategory }: Props) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {NOTIFICATION_CATEGORIES.map((tab) => {
        const isActive = active === tab.id;
        const unread = unreadByCategory?.[tab.id] ?? 0;
        const icon = CATEGORY_TAB_ICONS[tab.id] as keyof typeof Ionicons.glyphMap;

        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? colors.primary : `${colors.surface}`,
                borderColor: isActive ? colors.primary : colors.border,
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={14}
              color={isActive ? '#fff' : colors.textMuted}
            />
            <Text
              variant="caption"
              style={{ color: isActive ? '#fff' : colors.text, fontWeight: isActive ? '600' : '400' }}
            >
              {tab.label}
              {unread > 0 ? ` (${unread > 99 ? '99+' : unread})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
