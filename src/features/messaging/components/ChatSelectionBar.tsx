import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { MESSAGING_FEATURE } from '@/features/messaging/featureFlags';
import { useTheme } from '@/providers/ThemeProvider';

type ChatSelectionBarProps = {
  count: number;
  onCancel: () => void;
  onCopy: () => void;
  onForward: () => void;
  onDelete: () => void;
};

export function ChatSelectionBar({
  count,
  onCancel,
  onCopy,
  onForward,
  onDelete,
}: ChatSelectionBarProps) {
  const { colors } = useTheme();
  const showCopy = useFeatureVisible(MESSAGING_FEATURE.selectionCopy);
  const showForward = useFeatureVisible(MESSAGING_FEATURE.selectionForward);
  const showDelete = useFeatureVisible(MESSAGING_FEATURE.selectionDelete);

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <Pressable onPress={onCancel} style={styles.cancelBtn}>
        <Ionicons name="close" size={22} color={colors.text} />
        <Text variant="label">{count} seçildi</Text>
      </Pressable>

      <View style={styles.actions}>
        {showCopy ? (
          <Pressable onPress={onCopy} disabled={count === 0} style={styles.actionBtn}>
            <Ionicons name="copy-outline" size={22} color={colors.primary} />
          </Pressable>
        ) : null}
        {showForward ? (
          <Pressable onPress={onForward} disabled={count === 0} style={styles.actionBtn}>
            <Ionicons name="arrow-redo-outline" size={22} color={colors.primary} />
          </Pressable>
        ) : null}
        {showDelete ? (
          <Pressable onPress={onDelete} disabled={count === 0} style={styles.actionBtn}>
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
