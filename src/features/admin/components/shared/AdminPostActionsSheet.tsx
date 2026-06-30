import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AdminUserQuickSheet } from '@/features/admin/components/shared/AdminUserQuickSheet';
import { moderateContent } from '@/features/admin/services/contentManagement';
import {
  adminPinPost,
  adminUnpinPost,
} from '@/features/admin/services/feedCurationManagement';
import {
  formatPinExpiry,
  PIN_DURATION_OPTIONS,
} from '@/features/feed/services/postPinning';
import { canAdmin } from '@/constants/roles';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type AdminPostActionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  postId: string;
  authorId: string;
  authorUsername: string;
  isPinned?: boolean;
  pinnedUntil?: string | null;
  onPinnedChange?: (pinned: boolean, pinnedUntil?: string | null) => void;
  onContentRemoved?: () => void;
};

export function AdminPostActionsSheet({
  visible,
  onClose,
  postId,
  authorId,
  authorUsername,
  isPinned = false,
  pinnedUntil = null,
  onPinnedChange,
  onContentRemoved,
}: AdminPostActionsSheetProps) {
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

  const handlePin = (days: number | null) => {
    Alert.alert(
      'Gönderiyi Sabitle',
      days ? `${days} gün boyunca akışın üstünde gösterilsin mi?` : 'Süresiz sabitlensin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sabitle',
          onPress: () =>
            void runAction(() => adminPinPost(postId, days), 'Gönderi sabitlendi.').then(() => {
              onPinnedChange?.(true, days ? new Date(Date.now() + days * 86400000).toISOString() : null);
            }),
        },
      ],
    );
  };

  const handleUnpin = () => {
    Alert.alert('Sabitlemeyi Kaldır', 'Gönderi akış üstünden kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        onPress: () =>
          void runAction(() => adminUnpinPost(postId), 'Sabitleme kaldırıldı.').then(() => {
            onPinnedChange?.(false, null);
          }),
      },
    ]);
  };

  const handleModerate = (action: 'hide' | 'remove', label: string) => {
    if (!user) return;
    Alert.alert(label, 'Bu işlem admin panelinden geri alınabilir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: label,
        style: 'destructive',
        onPress: () =>
          void runAction(
            () => moderateContent(user.id, 'post', postId, action, `Hızlı mod: ${label}`),
            'İşlem uygulandı.',
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
            <Text variant="h3">Moderasyon</Text>
          </View>
          <Text secondary variant="caption">
            Gönderi · @{authorUsername}
          </Text>
          {isPinned ? (
            <Text variant="caption" style={{ color: colors.warning }}>
              Sabitlenmiş · {formatPinExpiry(pinnedUntil)}
            </Text>
          ) : null}

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {isAdmin ? (
              <>
                <SectionLabel label="Sabitleme" />
                {isPinned ? (
                  <ActionRow
                    icon="pin-outline"
                    label="Sabitlemeyi Kaldır"
                    tone="danger"
                    disabled={busy}
                    onPress={handleUnpin}
                  />
                ) : (
                  PIN_DURATION_OPTIONS.map((option) => (
                    <ActionRow
                      key={option.id}
                      icon="pin"
                      label={`Sabitle — ${option.label}`}
                      disabled={busy}
                      onPress={() => handlePin(option.days)}
                    />
                  ))
                )}
              </>
            ) : null}

            <SectionLabel label="İçerik" />
            <ActionRow
              icon="eye-off-outline"
              label="Gizle"
              disabled={busy}
              onPress={() => handleModerate('hide', 'Gizle')}
            />
            <ActionRow
              icon="trash-outline"
              label="Kaldır"
              tone="danger"
              disabled={busy}
              onPress={() => handleModerate('remove', 'Kaldır')}
            />

            <SectionLabel label="Kullanıcı" />
            <ActionRow
              icon="person-outline"
              label="Kullanıcı Moderasyonu"
              disabled={busy}
              onPress={() => {
                onClose();
                setUserSheetOpen(true);
              }}
            />
            <ActionRow
              icon="open-outline"
              label="Tam Admin Detayı"
              disabled={busy}
              onPress={() => {
                onClose();
                router.push(`/admin/users/${authorId}` as never);
              }}
            />
          </ScrollView>

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

function SectionLabel({ label }: { label: string }) {
  return (
    <Text variant="caption" secondary style={styles.sectionLabel}>
      {label.toUpperCase()}
    </Text>
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
    maxHeight: '85%',
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  list: { maxHeight: 420 },
  sectionLabel: { marginTop: spacing.sm, marginBottom: spacing.xs, letterSpacing: 0.5 },
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
