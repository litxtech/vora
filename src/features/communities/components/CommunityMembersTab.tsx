import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { CommunityInviteSheet } from '@/features/communities/components/CommunityInviteSheet';
import { COMMUNITY_ROLE_LABELS, communityMemberProfilePath } from '@/features/communities/constants';
import {
  canAssignCommunityRoles,
  canManageCommunity,
  removeCommunityMember,
  updateCommunityMemberRole,
} from '@/features/communities/services/communityData';
import type { CommunityDetail, CommunityMember, CommunityMemberRole } from '@/features/communities/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type CommunityMembersTabProps = {
  detail: CommunityDetail;
  currentUserId: string | null;
  onChanged: () => void;
};

export function CommunityMembersTab({ detail, currentUserId, onChanged }: CommunityMembersTabProps) {
  const { colors } = useTheme();
  const [inviteOpen, setInviteOpen] = useState(false);
  const canManage = canManageCommunity(detail.myRole);
  const canAssign = canAssignCommunityRoles(detail.myRole);

  const openProfile = (member: CommunityMember) => {
    router.push(communityMemberProfilePath(member.userId) as never);
  };

  const handleMemberPress = (member: CommunityMember) => {
    if (!canManage || member.userId === currentUserId) {
      openProfile(member);
      return;
    }

    const options: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [
      { text: 'Profili Gör', onPress: () => openProfile(member) },
    ];

    if (canAssign && member.role !== 'owner') {
      if (member.role !== 'admin') {
        options.push({ text: 'Yönetici Yap', onPress: () => changeRole(member, 'admin') });
      }
      if (member.role !== 'moderator') {
        options.push({ text: 'Moderatör Yap', onPress: () => changeRole(member, 'moderator') });
      }
      if (member.role !== 'member') {
        options.push({ text: 'Üye Yap', onPress: () => changeRole(member, 'member') });
      }
    }

    if (canManage && member.role !== 'owner' && (canAssign || member.role === 'member')) {
      options.push({
        text: 'Topluluktan Çıkar',
        style: 'destructive',
        onPress: () => confirmRemove(member),
      });
    }

    options.push({ text: 'İptal', style: 'cancel' });
    Alert.alert(member.fullName ?? member.username, 'Üye işlemleri', options);
  };

  const changeRole = async (member: CommunityMember, role: CommunityMemberRole) => {
    const { error } = await updateCommunityMemberRole(detail.id, member.userId, role);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    onChanged();
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

  if (detail.members.length === 0) {
    return (
      <>
        <GlassCard style={styles.empty}>
          <Ionicons name="people-outline" size={36} color={colors.textMuted} />
          <Text secondary>Henüz üye yok.</Text>
          {canManage ? (
            <Pressable
              style={[styles.addBtn, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
              onPress={() => setInviteOpen(true)}
            >
              <Ionicons name="person-add-outline" size={16} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                Üye Ekle
              </Text>
            </Pressable>
          ) : null}
        </GlassCard>
        <CommunityInviteSheet
          visible={inviteOpen}
          detail={detail}
          onClose={() => setInviteOpen(false)}
          onAdded={onChanged}
        />
      </>
    );
  }

  return (
    <>
      <View style={styles.list}>
        <View style={styles.header}>
          <Text variant="label">{detail.memberCount} üye</Text>
          {canManage ? (
            <Pressable onPress={() => setInviteOpen(true)} style={styles.addLink}>
              <Ionicons name="person-add-outline" size={16} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                Üye Ekle
              </Text>
            </Pressable>
          ) : canAssign ? (
            <Text secondary variant="caption">
              Rol ataması kurucuya özel
            </Text>
          ) : null}
        </View>

        {detail.members.map((member) => (
          <Pressable key={member.userId} onPress={() => handleMemberPress(member)}>
            <GlassCard style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: `${colors.primary}22` }]}>
                {member.avatarUrl ? (
                  <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={20} color={colors.primary} />
                )}
              </View>
              <View style={styles.info}>
                <Text variant="label" numberOfLines={1}>
                  {member.fullName ?? member.username}
                </Text>
                <Text variant="caption" secondary>
                  @{member.username}
                </Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: `${roleColor(member.role, colors)}22` }]}>
                <Text variant="caption" style={{ color: roleColor(member.role, colors) }}>
                  {COMMUNITY_ROLE_LABELS[member.role]}
                </Text>
              </View>
              {canManage && member.role !== 'owner' && member.userId !== currentUserId ? (
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              )}
            </GlassCard>
          </Pressable>
        ))}
      </View>

      <CommunityInviteSheet
        visible={inviteOpen}
        detail={detail}
        onClose={() => setInviteOpen(false)}
        onAdded={onChanged}
      />
    </>
  );
}

function roleColor(role: CommunityMemberRole, colors: ReturnType<typeof useTheme>['colors']): string {
  if (role === 'owner') return colors.warning;
  if (role === 'admin') return colors.primary;
  if (role === 'moderator') return colors.success;
  return colors.textMuted;
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
});
