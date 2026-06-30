import { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CallAvatar } from '@/features/calls/components/CallAvatar';
import { Button } from '@/components/ui/Button';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fetchConversationDetail } from '../services/conversationData';
import { uploadGroupAvatar } from '../services/groupAvatarUpload';
import {
  canAssignRoles,
  canDeleteGroup,
  canEditGroup,
  canManageMembers,
  canRemoveMembers,
  deleteGroupConversation,
  removeGroupMember,
  ROLE_LABELS,
  updateGroupConversation,
  updateGroupMemberRole,
} from '../services/groupData';
import type { ConversationMember, ConversationMemberRole } from '../types';
import { groupMemberLabel } from '../utils';

export function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [myRole, setMyRole] = useState<ConversationMemberRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const load = useCallback(async () => {
    if (!id || !user?.id) return;
    setLoading(true);
    const detail = await fetchConversationDetail(id, user.id);
    if (!detail || detail.type !== 'group') {
      setLoading(false);
      return;
    }
    setTitle(detail.title ?? '');
    setAvatarUrl(detail.avatarUrl);
    setMembers(detail.members);
    setMyRole(detail.myRole);
    setLoading(false);
  }, [id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleSaveTitle = async () => {
    if (!id || !canEditGroup(myRole)) return;
    setSaving(true);
    const { error } = await updateGroupConversation(id, { title: title.trim() });
    setSaving(false);
    if (error) Alert.alert('Kaydedilemedi', error);
    else Alert.alert('Grup güncellendi');
  };

  const handleAvatarPress = () => {
    if (!id || !user?.id || !canEditGroup(myRole)) return;

    const options = avatarUrl
      ? ['Fotoğraf Seç', 'Fotoğrafı Kaldır', 'İptal']
      : ['Fotoğraf Seç', 'İptal'];
    const cancelIndex = options.length - 1;
    const removeIndex = avatarUrl ? 1 : -1;

    const run = async (index: number) => {
      if (index === cancelIndex) return;

      if (index === removeIndex) {
        setUploadingAvatar(true);
        const { error } = await updateGroupConversation(id, { removeAvatar: true });
        setUploadingAvatar(false);
        if (error) Alert.alert('Kaldırılamadı', error);
        else {
          setAvatarUrl(null);
          Alert.alert('Grup fotoğrafı kaldırıldı');
        }
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('İzin gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploadingAvatar(true);
      const { url, error: uploadError } = await uploadGroupAvatar(
        user.id,
        id,
        result.assets[0].uri,
      );
      if (uploadError || !url) {
        setUploadingAvatar(false);
        Alert.alert('Yüklenemedi', uploadError ?? 'Bilinmeyen hata');
        return;
      }

      const { error } = await updateGroupConversation(id, { avatarUrl: url });
      setUploadingAvatar(false);
      if (error) Alert.alert('Kaydedilemedi', error);
      else setAvatarUrl(url);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: removeIndex >= 0 ? removeIndex : undefined },
        run,
      );
    } else {
      Alert.alert('Grup Fotoğrafı', undefined, [
        { text: 'Fotoğraf Seç', onPress: () => run(0) },
        ...(avatarUrl
          ? [{ text: 'Fotoğrafı Kaldır', style: 'destructive' as const, onPress: () => run(1) }]
          : []),
        { text: 'İptal', style: 'cancel' as const },
      ]);
    }
  };

  const handleAddMembers = () => {
    if (!id || !canManageMembers(myRole)) return;
    const exclude = members.map((m) => m.userId).join(',');
    router.push(`/chat/${id}/add-members?exclude=${encodeURIComponent(exclude)}`);
  };

  const handleDeleteGroup = () => {
    if (!id || !canDeleteGroup(myRole)) return;

    Alert.alert(
      'Grubu Sil',
      'Bu grup kalıcı olarak silinecek. Tüm mesajlar ve üyelikler kaldırılır. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Grubu Sil',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteGroupConversation(id);
            if (error) Alert.alert('Silinemedi', error);
            else router.replace('/(tabs)/messages');
          },
        },
      ],
    );
  };

  const handleMemberAction = (member: ConversationMember) => {
    if (!id || !user?.id) return;
    const isSelf = member.userId === user.id;

    if (isSelf) {
      Alert.alert('Gruptan Ayrıl', 'Bu gruptan ayrılmak istediğinize emin misiniz?', [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ayrıl',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeGroupMember(id, user.id);
            if (error) Alert.alert('Hata', error);
            else router.replace('/(tabs)/messages');
          },
        },
      ]);
      return;
    }

    const actions = ['Profili Gör'];
    if (canAssignRoles(myRole) && member.role !== 'founder') {
      if (member.role === 'admin') {
        actions.push('Üye Yap');
      } else {
        actions.push('Yönetici Yap');
      }
    }
    if (canRemoveMembers(myRole) && member.role !== 'founder') {
      actions.push('Gruptan Çıkar');
    }
    actions.push('İptal');

    const run = async (index: number) => {
      const action = actions[index];
      if (action === 'Profili Gör') {
        router.push(`/user/${member.userId}`);
        return;
      }
      if (action === 'Gruptan Çıkar') {
        Alert.alert(
          'Gruptan Çıkar',
          `${member.fullName?.trim() || member.username} gruptan çıkarılsın mı?`,
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Çıkar',
              style: 'destructive',
              onPress: async () => {
                const { error } = await removeGroupMember(id, member.userId);
                if (error) Alert.alert('Hata', error);
                else await load();
              },
            },
          ],
        );
        return;
      }
      if (action === 'Yönetici Yap') {
        const { error } = await updateGroupMemberRole(id, member.userId, 'admin');
        if (error) Alert.alert('Hata', error);
        else await load();
        return;
      }
      if (action === 'Üye Yap') {
        const { error } = await updateGroupMemberRole(id, member.userId, 'member');
        if (error) Alert.alert('Hata', error);
        else await load();
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: actions,
          cancelButtonIndex: actions.length - 1,
          destructiveButtonIndex: actions.indexOf('Gruptan Çıkar'),
        },
        run,
      );
    } else {
      Alert.alert(member.fullName?.trim() || member.username, undefined, [
        { text: 'Profili Gör', onPress: () => run(0) },
        ...(canAssignRoles(myRole) && member.role !== 'founder'
          ? member.role === 'admin'
            ? [{ text: 'Üye Yap', onPress: () => run(actions.indexOf('Üye Yap')) }]
            : [{ text: 'Yönetici Yap', onPress: () => run(actions.indexOf('Yönetici Yap')) }]
          : []),
        ...(canRemoveMembers(myRole) && member.role !== 'founder'
          ? [
              {
                text: 'Gruptan Çıkar',
                style: 'destructive' as const,
                onPress: () => run(actions.indexOf('Gruptan Çıkar')),
              },
            ]
          : []),
        { text: 'İptal', style: 'cancel' as const },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenBackButton />
        <Text variant="h3">Grup Bilgisi</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summary}>
          <Pressable
            onPress={handleAvatarPress}
            disabled={!canEditGroup(myRole) || uploadingAvatar}
            style={styles.avatarWrap}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.groupAvatarImage} />
            ) : (
              <View style={[styles.groupAvatar, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="people" size={32} color={colors.primary} />
              </View>
            )}
            {canEditGroup(myRole) ? (
              <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
                {uploadingAvatar ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="camera" size={14} color="#fff" />
                )}
              </View>
            ) : null}
          </Pressable>

          {canEditGroup(myRole) ? (
            <TextInput
              style={[
                styles.titleInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Grup adı"
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <Text variant="h3">{title || 'Grup Sohbeti'}</Text>
          )}

          <Text secondary>{groupMemberLabel(members.length)}</Text>

          {myRole ? (
            <View style={[styles.roleBadge, { backgroundColor: `${colors.primary}18` }]}>
              <Text variant="caption" style={{ color: colors.primary }}>
                Siz: {ROLE_LABELS[myRole]}
              </Text>
            </View>
          ) : null}

          {canEditGroup(myRole) ? (
            <Button title="Kaydet" variant="outline" loading={saving} onPress={handleSaveTitle} />
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="label">Üyeler</Text>
          {canManageMembers(myRole) ? (
            <Pressable onPress={handleAddMembers}>
              <Text style={{ color: colors.primary }}>+ Üye Ekle</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.list}>
          {members.map((item) => (
            <Pressable
              key={item.userId}
              style={[styles.memberRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleMemberAction(item)}
            >
              <CallAvatar
                participant={{
                  id: item.userId,
                  username: item.username,
                  full_name: item.fullName,
                  avatar_url: item.avatarUrl,
                }}
                size={44}
                showName={false}
              />
              <View style={styles.memberInfo}>
                <Text variant="label">{item.fullName?.trim() || item.username}</Text>
                <Text muted>@{item.username}</Text>
              </View>
              <View style={[styles.memberRoleBadge, { backgroundColor: `${colors.primary}18` }]}>
                <Text variant="caption" style={{ color: colors.primary }}>
                  {ROLE_LABELS[item.role]}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {canDeleteGroup(myRole) ? (
          <View style={styles.dangerZone}>
            <Button title="Grubu Sil" variant="outline" onPress={handleDeleteGroup} />
            <Text muted variant="caption" style={styles.dangerHint}>
              Grup kalıcı olarak silinir. Yalnızca kurucu bu işlemi yapabilir.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerSpacer: { width: 24 },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  summary: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  avatarWrap: {
    position: 'relative',
  },
  groupAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  roleBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  memberInfo: { flex: 1 },
  memberRoleBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  dangerZone: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  dangerHint: {
    textAlign: 'center',
  },
});
