import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ReelMenuOption = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
};

type ReelMenuSheetProps = {
  visible: boolean;
  isOwner: boolean;
  onClose: () => void;
  onReport: () => void;
  onSafety?: () => void;
  onDelete?: () => void;
};

export function ReelMenuSheet({
  visible,
  isOwner,
  onClose,
  onReport,
  onSafety,
  onDelete,
}: ReelMenuSheetProps) {
  const { colors } = useTheme();

  const run = (action: () => void) => {
    onClose();
    action();
  };

  const options: ReelMenuOption[] = [
    ...(isOwner
      ? onDelete
        ? [
            {
              key: 'delete',
              label: 'Reeli Sil',
              icon: 'trash-outline' as const,
              destructive: true,
              onPress: () => run(onDelete),
            },
          ]
        : []
      : [
          {
            key: 'report',
            label: 'Şikayet Et',
            icon: 'flag-outline' as const,
            onPress: () => run(onReport),
          },
          ...(onSafety
            ? [
                {
                  key: 'safety',
                  label: 'Kullanıcı Seçenekleri',
                  icon: 'shield-outline' as const,
                  onPress: () => run(onSafety),
                },
              ]
            : []),
        ]),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolveModalAnimationType('slide')}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          {options.map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.option, { borderColor: colors.border }]}
              onPress={opt.onPress}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={opt.destructive ? colors.danger : colors.text}
                />
                <Text style={opt.destructive ? { color: colors.danger } : undefined}>
                  {opt.label}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(127,127,127,0.4)',
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
