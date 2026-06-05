import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { REPORT_REASONS } from '@/features/feed/constants';
import { reportContent } from '@/features/feed/services/engagement';
import type { ReportReason } from '@/types/database';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type ReportSheetProps = {
  visible: boolean;
  targetType: string;
  targetId: string;
  onClose: () => void;
};

export function ReportSheet({ visible, targetType, targetId, onClose }: ReportSheetProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();

  const handleReport = async (reason: ReportReason) => {
    if (!requireAuth('Raporlama')) return;
    if (!user) return;

    const { error } = await reportContent(user.id, targetType, targetId, reason);
    onClose();

    if (error) {
      Alert.alert('Hata', 'Rapor gönderilemedi.');
      return;
    }

    Alert.alert('Teşekkürler', 'Raporunuz alındı. Moderasyon ekibimiz inceleyecek.');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text variant="h3">İçeriği raporla</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason.id}
              style={[styles.option, { borderColor: colors.border }]}
              onPress={() => handleReport(reason.id)}
            >
              <Text>{reason.label}</Text>
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
