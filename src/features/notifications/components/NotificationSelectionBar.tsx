import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { NOTIFICATIONS_FEATURE } from '@/features/notifications/featureFlags';
import { useTheme } from '@/providers/ThemeProvider';

type NotificationSelectionBarProps = {
  count: number;
  total: number;
  onCancel: () => void;
  onToggleSelectAll: () => void;
  onDelete: () => void;
  deleting?: boolean;
};

export function NotificationSelectionBar({
  count,
  total,
  onCancel,
  onToggleSelectAll,
  onDelete,
  deleting = false,
}: NotificationSelectionBarProps) {
  const { colors } = useTheme();
  const showBulkDelete = useFeatureVisible(NOTIFICATIONS_FEATURE.bulkDelete);
  const allSelected = total > 0 && count === total;

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <Pressable onPress={onCancel} style={styles.cancelBtn} disabled={deleting}>
        <Ionicons name="close" size={22} color={colors.text} />
        <Text variant="label">{count} seçildi</Text>
      </Pressable>

      <View style={styles.actions}>
        <Pressable onPress={onToggleSelectAll} disabled={deleting || total === 0} style={styles.actionBtn}>
          <Ionicons
            name={allSelected ? 'checkbox' : 'square-outline'}
            size={22}
            color={colors.primary}
          />
        </Pressable>
        {showBulkDelete ? (
          <Pressable onPress={onDelete} disabled={deleting || count === 0} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
