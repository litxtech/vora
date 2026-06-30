import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type CommentAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  actions: CommentAction[];
  iconColor?: string;
  iconSize?: number;
  accessibilityLabel?: string;
  /** Dışarıdan kontrol edilen açılma durumu (gesture ile menüyü açmak için) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Yorum kenarında üç nokta tetikleyicisi + alttan açılan işlem menüsü.
 * `open`/`onOpenChange` verilmezse kendi iç durumunu yönetir.
 */
export function CommentActionMenu({
  actions,
  iconColor,
  iconSize = 18,
  accessibilityLabel = 'Yorum işlemleri',
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const { colors } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  if (actions.length === 0) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={TRIGGER_HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={styles.trigger}
      >
        <Ionicons name="ellipsis-vertical" size={iconSize} color={iconColor ?? colors.textMuted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType={resolveModalAnimationType('fade')}
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Kapat">
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surfaceElevated }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.grabber} />
            {actions.map((action) => (
              <Pressable
                key={action.id}
                style={styles.row}
                onPress={() => {
                  setOpen(false);
                  action.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <Ionicons
                  name={action.icon}
                  size={20}
                  color={action.destructive ? colors.danger : colors.text}
                />
                <Text style={[styles.rowLabel, action.destructive ? { color: colors.danger } : null]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const TRIGGER_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const styles = StyleSheet.create({
  trigger: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
