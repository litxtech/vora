import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { MISINFO_FLAG_TYPES } from '@/features/moderation/constants';
import { flagMisinformation } from '@/features/moderation/services/misinfo';
import type { MisinfoFlagType } from '@/features/moderation/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type MisinfoFlagSheetProps = {
  visible: boolean;
  targetType: string;
  targetId: string;
  onClose: () => void;
};

export function MisinfoFlagSheet({ visible, targetType, targetId, onClose }: MisinfoFlagSheetProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();

  const handleFlag = async (flagType: MisinfoFlagType) => {
    if (!(await requireAuth('İşaretleme')) || !user) return;

    const { error } = await flagMisinformation(user.id, targetType, targetId, flagType);
    onClose();

    if (error) {
      Alert.alert('Hata', 'İşaretleme gönderilemedi.');
      return;
    }

    Alert.alert('Teşekkürler', 'İçerik yanlış bilgi olarak işaretlendi.');
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text variant="h3">Yanlış bilgi işaretle</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {MISINFO_FLAG_TYPES.map((flag) => (
            <Pressable
              key={flag.id}
              style={[styles.option, { borderColor: colors.border }]}
              onPress={() => handleFlag(flag.id)}
            >
              <Text>{flag.label}</Text>
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
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
