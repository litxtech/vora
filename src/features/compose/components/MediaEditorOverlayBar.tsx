import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  isEmoji: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDismiss: () => void;
};

export function MediaEditorOverlayBar({ visible, isEmoji, onEdit, onDelete, onDismiss }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        {!isEmoji ? (
          <Pressable style={styles.btn} onPress={onEdit} hitSlop={8}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.btnLabel}>Düzenle</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.btn} onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
          <Text style={[styles.btnLabel, styles.deleteLabel]}>Sil</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: 72,
    bottom: spacing.xl,
    alignItems: 'center',
    zIndex: 7,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
  },
  btnLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteLabel: {
    color: '#ff6b6b',
  },
});
