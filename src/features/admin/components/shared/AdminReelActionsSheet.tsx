import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AdminUserQuickSheet } from '@/features/admin/components/shared/AdminUserQuickSheet';
import { moderateContent } from '@/features/admin/services/contentManagement';
import { canAdmin } from '@/constants/roles';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type AdminReelActionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  reelId: string;
  authorId: string;
  authorUsername: string;
  onContentRemoved?: () => void;
};

export function AdminReelActionsSheet({
  visible,
  onClose,
  reelId,
  authorId,
  authorUsername,
  onContentRemoved,
}: AdminReelActionsSheetProps) {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [userSheetOpen, setUserSheetOpen] = useState(false);
  const isAdmin = profile?.role ? canAdmin(profile.role) : false;

  const runAction = async (fn: () => Promise<{ error: string | null }>, successMessage: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    Alert.alert('Tamam', successMessage);
    onClose();
  };

  const handleModerate = (action: 'hide' | 'remove' | 'delete_permanent', label: string) => {
    if (!user) return;
    Alert.alert(label, action === 'delete_permanent' ? 'Reel anında silinsin mi? Akıştan hemen kalkar.' : 'Reel yayından kaldırılır.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: label,
        style: 'destructive',
        onPress: () =>
          void runAction(
            () => moderateContent(user.id, 'reel', reelId, action, `Hızlı mod: ${label}`),
            action === 'delete_permanent' ? 'Reel silindi.' : 'İşlem uygulandı.',
          ).then(onContentRemoved),
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceElevated }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text variant="h3">Reel moderasyonu</Text>
          </View>
          <Text secondary variant="caption">
            @{authorUsername}
          </Text>

          <ActionRow icon="eye-off-outline" label="Gizle" disabled={busy} onPress={() => handleModerate('hide', 'Gizle')} />
          <ActionRow
            icon="trash-outline"
            label="Kaldır"
            tone="danger"
            disabled={busy}
            onPress={() => handleModerate('remove', 'Kaldır')}
          />
          {isAdmin ? (
            <>
              <ActionRow
                icon="flash-outline"
                label="Anında sil"
                tone="danger"
                disabled={busy}
                onPress={() => handleModerate('delete_permanent', 'Anında sil')}
              />
              <ActionRow
                icon="people-outline"
                label="Görüntüleyenler"
                disabled={busy}
                onPress={() => {
                  onClose();
                  router.push(`/reel-viewers/${reelId}?authorId=${authorId}` as never);
                }}
              />
            </>
          ) : null}
          <ActionRow
            icon="person-outline"
            label="Kullanıcı moderasyonu"
            disabled={busy}
            onPress={() => {
              onClose();
              setUserSheetOpen(true);
            }}
          />

          <Pressable style={[styles.closeBtn, { borderColor: colors.border }]} onPress={onClose}>
            <Text variant="label">Kapat</Text>
          </Pressable>
        </Pressable>
      </Pressable>

      <AdminUserQuickSheet
        visible={userSheetOpen}
        onClose={() => setUserSheetOpen(false)}
        userId={authorId}
        username={authorUsername}
        onActionComplete={onContentRemoved}
      />
    </Modal>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  disabled,
  tone = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.danger : colors.text;

  return (
    <Pressable style={[styles.actionRow, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon} size={20} color={color} />
      <Text variant="label" style={tone === 'danger' ? { color: colors.danger } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  disabled: { opacity: 0.5 },
  closeBtn: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
});
