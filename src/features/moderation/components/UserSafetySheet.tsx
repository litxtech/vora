import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { blockUser, unblockUser } from '@/features/feed/services/engagement';
import { muteUser, unmuteUser } from '@/features/moderation/services/relationships';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type UserSafetySheetProps = {
  visible: boolean;
  userId: string;
  username: string;
  isBlocked?: boolean;
  canUnblock?: boolean;
  isRestricted?: boolean;
  isMuted?: boolean;
  onReport?: () => void;
  onClose: () => void;
  onActionComplete?: () => void;
};

export function UserSafetySheet({
  visible,
  userId,
  username,
  isBlocked = false,
  canUnblock = false,
  isRestricted = false,
  isMuted = false,
  onReport,
  onClose,
  onActionComplete,
}: UserSafetySheetProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();

  const runAction = async (label: string, action: () => Promise<{ error: string | null }>) => {
    if (!(await requireAuth(label)) || !user) return;
    onClose();
    const { error } = await action();
    if (error) {
      Alert.alert('Hata', 'İşlem tamamlanamadı.');
      return;
    }
    Alert.alert('Tamam', 'İşlem başarıyla uygulandı.');
    onActionComplete?.();
  };

  const options = [
    onReport
      ? { key: 'report', label: 'Şikayet Et', icon: 'flag-outline' as const, onPress: () => { onClose(); onReport(); } }
      : null,
    isMuted
      ? {
          key: 'unmute',
          label: 'Sessizden Çıkar',
          icon: 'volume-high-outline' as const,
          onPress: () => runAction('Sessize alma', () => unmuteUser(user!.id, userId)),
        }
      : {
          key: 'mute',
          label: 'Sessize Al',
          icon: 'volume-mute-outline' as const,
          onPress: () =>
            runAction('Sessize alma', () => muteUser(user!.id, userId)),
        },
    isRestricted
      ? null
      : {
          key: 'restrict',
          label: 'Kısıtla',
          icon: 'eye-off-outline' as const,
          onPress: () =>
            runAction('Kısıtlama', () => blockUser(user!.id, userId, true)),
        },
    isBlocked && !canUnblock
      ? null
      : canUnblock
        ? {
            key: 'unblock',
            label: 'Engeli Kaldır',
            icon: 'checkmark-circle-outline' as const,
            onPress: async () => {
              if (!(await requireAuth('Engel kaldırma')) || !user) return;
              onClose();
              Alert.alert('Engeli Kaldır', `@${username} engeli kaldırılsın mı?`, [
                { text: 'Vazgeç', style: 'cancel' },
                {
                  text: 'Engeli Kaldır',
                  onPress: async () => {
                    const { error } = await unblockUser(user.id, userId);
                    if (error) Alert.alert('Hata', 'Engel kaldırılamadı.');
                    else {
                      Alert.alert('Tamam', 'Engel kaldırıldı.');
                      onActionComplete?.();
                    }
                  },
                },
              ]);
            },
          }
        : isBlocked
          ? null
          : {
          key: 'block',
          label: 'Engelle',
          icon: 'ban-outline' as const,
          destructive: true,
          onPress: async () => {
            if (!(await requireAuth('Engelleme')) || !user) return;
            onClose();
            Alert.alert('Engelle', `@${username} engellensin mi?`, [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Engelle',
                style: 'destructive',
                onPress: async () => {
                  const { error } = await blockUser(user.id, userId, false);
                  if (!error) {
                    Alert.alert('Engellendi', 'Bu kullanıcının içerikleri artık görünmeyecek.');
                    onActionComplete?.();
                  }
                },
              },
            ]);
          },
        },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    destructive?: boolean;
    onPress: () => void;
  }>;

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text variant="h3">@{username}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text secondary variant="caption" style={styles.hint}>
            Sessize alma karşı tarafa bildirilmez.
          </Text>

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
                <Text style={opt.destructive ? { color: colors.danger } : undefined}>{opt.label}</Text>
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
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  hint: { marginBottom: spacing.sm },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
