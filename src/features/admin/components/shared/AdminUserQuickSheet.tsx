import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { BAN_DURATION_LABELS, ASSIGNABLE_ROLES } from '@/features/admin/constants';
import { removeAllUserContent } from '@/features/admin/services/emergencyModeration';
import {
  banUser,
  deleteUserAccountByPlatform,
  fetchAdminUser,
  liftBan,
  updateAccountStatus,
  updateUserRole,
} from '@/features/admin/services/userManagement';
import { adminReactivateAccount } from '@/features/account-lifecycle/services/adminLifecycle';
import type { BanDuration } from '@/features/admin/types';
import { ROLE_LABELS, canAdmin } from '@/constants/roles';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import type { UserRole } from '@/types/database';

type AdminUserQuickSheetProps = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  onActionComplete?: () => void;
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  frozen: 'Donmuş',
  quarantined: 'Karantina',
  deletion_pending: 'Silme Bekliyor',
  deleted: 'Silinmiş',
};

export function AdminUserQuickSheet({
  visible,
  onClose,
  userId,
  username,
  onActionComplete,
}: AdminUserQuickSheetProps) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const isAdmin = profile?.role ? canAdmin(profile.role) : false;

  useEffect(() => {
    if (!visible || !userId) return;
    setLoading(true);
    fetchAdminUser(userId)
      .then(({ data }) => setUser(data))
      .finally(() => setLoading(false));
  }, [visible, userId]);

  const refresh = async () => {
    const { data } = await fetchAdminUser(userId);
    setUser(data);
    onActionComplete?.();
  };

  const run = async (fn: () => Promise<{ error: string | null }>, success: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) Alert.alert('Hata', error);
    else {
      Alert.alert('Tamam', success);
      await refresh();
    }
  };

  const handleBan = (duration: BanDuration) => {
    Alert.alert(BAN_DURATION_LABELS[duration], `@${username} banlansın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Banla',
        style: 'destructive',
        onPress: () => void run(() => banUser(userId, `Hızlı mod: ${BAN_DURATION_LABELS[duration]}`, duration), 'Ban uygulandı.'),
      },
    ]);
  };

  const handleRole = (role: UserRole) => {
    Alert.alert('Rol Değiştir', `@${username} → ${ROLE_LABELS[role]}`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Uygula',
        onPress: () => void run(() => updateUserRole(userId, role), 'Rol güncellendi.'),
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      'Hesabı Sil',
      'Bu işlem geri alınamaz. Hesap platform tarafından silinmiş olarak işaretlenir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () =>
            void run(() => deleteUserAccountByPlatform(userId), 'Hesap silindi.').then(onClose),
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceElevated }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Ionicons name="shield" size={20} color={colors.primary} />
            <Text variant="h3">Admin — @{username}</Text>
          </View>

          {loading ? (
            <Text secondary>Yükleniyor...</Text>
          ) : user ? (
            <GlassInfo user={user} />
          ) : null}

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {isAdmin ? (
              <>
                <SectionLabel label="Yetki" />
                {ASSIGNABLE_ROLES.map((role) => (
                  <ActionRow
                    key={role}
                    icon="key-outline"
                    label={`Rol: ${ROLE_LABELS[role]}`}
                    disabled={busy || user?.role === role}
                    onPress={() => handleRole(role)}
                  />
                ))}
              </>
            ) : null}

            <SectionLabel label="Hesap Durumu" />
            {isAdmin ? (
              <>
                {(Object.keys(BAN_DURATION_LABELS) as BanDuration[]).map((duration) => (
                  <ActionRow
                    key={duration}
                    icon="ban-outline"
                    label={`Ban — ${BAN_DURATION_LABELS[duration]}`}
                    tone="danger"
                    disabled={busy}
                    onPress={() => handleBan(duration)}
                  />
                ))}
                <ActionRow
                  icon="checkmark-circle-outline"
                  label="Ban Kaldır"
                  disabled={busy}
                  onPress={() => void run(() => liftBan(userId), 'Ban kaldırıldı.')}
                />
              </>
            ) : null}
            <ActionRow
              icon="snow-outline"
              label="Hesabı Dondur"
              tone="danger"
              disabled={busy}
              onPress={() =>
                void run(() => updateAccountStatus(userId, 'frozen'), 'Hesap donduruldu.')
              }
            />
            <ActionRow
              icon="play-circle-outline"
              label="Hesabı Aktifleştir"
              disabled={busy}
              onPress={() => void run(() => adminReactivateAccount(userId), 'Hesap aktifleştirildi.')}
            />

            {isAdmin ? (
              <>
                <SectionLabel label="Acil" />
                <ActionRow
                  icon="trash-bin-outline"
                  label="Tüm İçeriği Kaldır"
                  tone="danger"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert('Tüm İçerik', 'Kullanıcının tüm gönderileri kaldırılsın mı?', [
                      { text: 'Vazgeç', style: 'cancel' },
                      {
                        text: 'Kaldır',
                        style: 'destructive',
                        onPress: () =>
                          void run(
                            () => removeAllUserContent(userId, 'Hızlı mod'),
                            'İçerik kaldırıldı.',
                          ),
                      },
                    ])
                  }
                />
                <ActionRow
                  icon="skull-outline"
                  label="Hesabı Kalıcı Sil"
                  tone="danger"
                  disabled={busy}
                  onPress={handleDelete}
                />
              </>
            ) : null}

            <SectionLabel label="Panel" />
            <ActionRow
              icon="open-outline"
              label="Tam Admin Detayı"
              disabled={busy}
              onPress={() => {
                onClose();
                router.push(`/admin/users/${userId}` as never);
              }}
            />
          </ScrollView>

          <Pressable style={[styles.closeBtn, { borderColor: colors.border }]} onPress={onClose}>
            <Text variant="label">Kapat</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function GlassInfo({ user }: { user: Record<string, unknown> }) {
  const { colors } = useTheme();
  const rows: [string, string][] = [
    ['E-posta', String(user.email ?? '—')],
    ['Rol', ROLE_LABELS[(user.role as UserRole) ?? 'user'] ?? String(user.role)],
    ['Durum', STATUS_LABELS[String(user.account_status)] ?? String(user.account_status)],
    ['Güven', String(user.trust_score ?? '—')],
    ['Premium', user.is_premium ? 'Evet' : 'Hayır'],
    ['Kayıt', user.created_at ? new Date(String(user.created_at)).toLocaleDateString('tr-TR') : '—'],
    ['Son görülme', user.last_seen_at ? new Date(String(user.last_seen_at)).toLocaleString('tr-TR') : '—'],
    ['Şikayet sayısı', String(user.report_count ?? 0)],
  ];

  return (
    <View style={[styles.infoBox, { backgroundColor: `${colors.primary}10`, borderColor: colors.border }]}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.infoRow}>
          <Text variant="caption" secondary>
            {label}
          </Text>
          <Text variant="caption" style={styles.infoValue}>
            {value}
          </Text>
        </View>
      ))}
    </View>
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
    maxHeight: '90%',
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  infoValue: { flex: 1, textAlign: 'right', fontWeight: '600' },
  list: { maxHeight: 360 },
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
