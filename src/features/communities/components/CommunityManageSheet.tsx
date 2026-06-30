import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { COMMUNITY_ROLE_LABELS } from '@/features/communities/constants';
import {
  canAssignCommunityRoles,
  removeCommunityMember,
  updateCommunityBranding,
  updateCommunityMemberRole,
} from '@/features/communities/services/communityData';
import {
  uploadCommunityCover,
  uploadCommunityIcon,
} from '@/features/communities/services/communityBrandingUpload';
import type { CommunityDetail, CommunityMember, CommunityMemberRole } from '@/features/communities/types';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type CommunityManageSheetProps = {
  visible: boolean;
  detail: CommunityDetail;
  onClose: () => void;
  onChanged: () => void;
  onOpenMembers: () => void;
};

export function CommunityManageSheet({
  visible,
  detail,
  onClose,
  onChanged,
  onOpenMembers,
}: CommunityManageSheetProps) {
  const { colors, mode } = useTheme();
  const { user } = useAuth();
  const surface = glassSurface[mode];
  const [coverUri, setCoverUri] = useState<string | null>(detail.coverUrl);
  const [iconUri, setIconUri] = useState<string | null>(detail.iconUrl);
  const [saving, setSaving] = useState(false);

  const canAssign = canAssignCommunityRoles(detail.myRole);
  const teamMembers = detail.members.filter((m) => m.role !== 'owner' && m.role !== 'member');

  useEffect(() => {
    if (!visible) return;
    setCoverUri(detail.coverUrl);
    setIconUri(detail.iconUrl);
  }, [visible, detail.coverUrl, detail.iconUrl]);

  const pickImage = async (kind: 'cover' | 'icon') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: kind === 'cover' ? [16, 9] : [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    if (kind === 'cover') setCoverUri(result.assets[0].uri);
    else setIconUri(result.assets[0].uri);
  };

  const saveBranding = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let coverUrl = detail.coverUrl;
      let iconUrl = detail.iconUrl;

      if (coverUri && coverUri !== detail.coverUrl && !coverUri.startsWith('http')) {
        const { url, error } = await uploadCommunityCover(user.id, detail.id, coverUri);
        if (error) {
          Alert.alert('Hata', error);
          return;
        }
        coverUrl = url;
      } else if (coverUri?.startsWith('http')) {
        coverUrl = coverUri;
      }

      if (iconUri && iconUri !== detail.iconUrl && !iconUri.startsWith('http')) {
        const { url, error } = await uploadCommunityIcon(user.id, detail.id, iconUri);
        if (error) {
          Alert.alert('Hata', error);
          return;
        }
        iconUrl = url;
      } else if (iconUri?.startsWith('http')) {
        iconUrl = iconUri;
      }

      const brandingChanged = coverUrl !== detail.coverUrl || iconUrl !== detail.iconUrl;
      if (brandingChanged) {
        const { error } = await updateCommunityBranding(detail.id, {
          coverUrl: coverUrl ?? null,
          iconUrl: iconUrl ?? null,
        });
        if (error) {
          Alert.alert('Hata', error);
          return;
        }
      }

      onChanged();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const changeRole = (member: CommunityMember, role: CommunityMemberRole) => {
    Alert.alert(
      'Rol değiştir',
      `${member.fullName ?? member.username} → ${COMMUNITY_ROLE_LABELS[role]}?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            const { error } = await updateCommunityMemberRole(detail.id, member.userId, role);
            if (error) Alert.alert('Hata', error);
            else onChanged();
          },
        },
      ],
    );
  };

  const confirmRemove = (member: CommunityMember) => {
    Alert.alert(
      'Üyeyi çıkar',
      `${member.fullName ?? member.username} topluluktan çıkarılsın mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeCommunityMember(detail.id, member.userId);
            if (error) Alert.alert('Hata', error);
            else onChanged();
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceElevated }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: surface.handle }]} />
          <View style={styles.header}>
            <Text variant="h3">Topluluk Yönetimi</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text variant="label">Görseller</Text>
            <Text secondary variant="caption">
              Kapak ve profil görselini yalnızca kurucu değiştirebilir.
            </Text>

            <Pressable style={styles.mediaRow} onPress={() => pickImage('cover')}>
              <View style={[styles.mediaPreview, { backgroundColor: `${colors.primary}18` }]}>
                {coverUri ? (
                  <Image source={{ uri: coverUri }} style={styles.mediaImage} />
                ) : (
                  <Ionicons name="image-outline" size={22} color={colors.primary} />
                )}
              </View>
              <View style={styles.mediaInfo}>
                <Text variant="label">Kapak Resmi</Text>
                <Text secondary variant="caption">
                  16:9 önerilir
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <Pressable style={styles.mediaRow} onPress={() => pickImage('icon')}>
              <View style={[styles.mediaPreview, styles.iconPreview, { backgroundColor: `${colors.primary}18` }]}>
                {iconUri ? (
                  <Image source={{ uri: iconUri }} style={styles.mediaImage} />
                ) : (
                  <Ionicons name="people-outline" size={22} color={colors.primary} />
                )}
              </View>
              <View style={styles.mediaInfo}>
                <Text variant="label">Profil Resmi</Text>
                <Text secondary variant="caption">
                  Kare format
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            {canAssign ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text variant="label">Ekip & Yetkiler</Text>
                  <Pressable onPress={onOpenMembers}>
                    <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                      Tüm üyeler
                    </Text>
                  </Pressable>
                </View>
                <Text secondary variant="caption">
                  Moderatör ve yönetici ataması yalnızca kurucuya açıktır.
                </Text>

                {teamMembers.length === 0 ? (
                  <View style={[styles.emptyTeam, { borderColor: colors.border }]}>
                    <Text secondary variant="caption">
                      Henüz moderatör veya yönetici yok.
                    </Text>
                  </View>
                ) : (
                  teamMembers.map((member) => (
                    <View key={member.userId} style={[styles.teamRow, { borderColor: colors.border }]}>
                      <View style={styles.teamInfo}>
                        <Text variant="label" numberOfLines={1}>
                          {member.fullName ?? member.username}
                        </Text>
                        <Text variant="caption" secondary>
                          {COMMUNITY_ROLE_LABELS[member.role]}
                        </Text>
                      </View>
                      <View style={styles.teamActions}>
                        {member.role !== 'admin' ? (
                          <MiniBtn label="Yönetici" onPress={() => changeRole(member, 'admin')} colors={colors} />
                        ) : null}
                        {member.role !== 'moderator' ? (
                          <MiniBtn label="Mod" onPress={() => changeRole(member, 'moderator')} colors={colors} />
                        ) : null}
                        {member.role !== 'member' ? (
                          <MiniBtn label="Üye" onPress={() => changeRole(member, 'member')} colors={colors} />
                        ) : null}
                        <MiniBtn label="Çıkar" danger onPress={() => confirmRemove(member)} colors={colors} />
                      </View>
                    </View>
                  ))
                )}
              </>
            ) : null}

            <Button title="Kaydet" onPress={saveBranding} loading={saving} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MiniBtn({
  label,
  onPress,
  danger,
  colors,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const tone = danger ? colors.danger : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.miniBtn, { backgroundColor: `${tone}14`, borderColor: `${tone}33` }]}
    >
      <Text variant="caption" style={{ color: tone, fontWeight: '700', fontSize: 10 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mediaPreview: {
    width: 72,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconPreview: {
    width: 44,
    height: 44,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaInfo: {
    flex: 1,
    gap: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  emptyTeam: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  teamRow: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  teamInfo: {
    gap: 2,
  },
  teamActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  miniBtn: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
});
