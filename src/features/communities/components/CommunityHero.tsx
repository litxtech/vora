import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  COMMUNITY_MEMBER_PREVIEW_LIMIT,
  COMMUNITY_ROLE_LABELS,
  communityCategoryLabel,
  communityMemberProfilePath,
} from '@/features/communities/constants';
import {
  canEditCommunityBranding,
} from '@/features/communities/services/communityData';
import type { CommunityDetail, CommunityMember } from '@/features/communities/types';
import { REGIONS } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type CommunityHeroProps = {
  detail: CommunityDetail;
  actionLoading?: boolean;
  onJoinToggle: () => void;
  onShare: () => void;
  onChat?: () => void;
  onManage?: () => void;
  onMembersPress: () => void;
  onEditBranding?: () => void;
};

export function CommunityHero({
  detail,
  actionLoading,
  onJoinToggle,
  onShare,
  onChat,
  onManage,
  onMembersPress,
  onEditBranding,
}: CommunityHeroProps) {
  const { colors } = useTheme();
  const canEditBranding = canEditCommunityBranding(detail.myRole);
  const canManage = canEditBranding;
  const owner = detail.members.find((m) => m.role === 'owner');
  const regionName = detail.regionId
    ? (REGIONS.find((r) => r.id === detail.regionId)?.name ?? detail.regionId)
    : 'Karadeniz Geneli';
  const previewMembers = detail.members.slice(0, COMMUNITY_MEMBER_PREVIEW_LIMIT);
  const overflowCount = Math.max(0, detail.memberCount - previewMembers.length);

  return (
    <View style={styles.wrap}>
      <View style={styles.coverWrap}>
        {detail.coverUrl ? (
          <Image source={{ uri: detail.coverUrl }} style={styles.cover} />
        ) : (
          <LinearGradient
            colors={[`${colors.primary}55`, `${colors.primary}22`, colors.surfaceElevated]}
            style={styles.cover}
          />
        )}
        <LinearGradient
          colors={['transparent', `${colors.background}EE`]}
          style={styles.coverFade}
          pointerEvents="none"
        />

        {canEditBranding && onEditBranding ? (
          <Pressable
            style={[styles.editCoverBtn, { backgroundColor: `${colors.background}CC` }]}
            onPress={onEditBranding}
            hitSlop={8}
          >
            <Ionicons name="camera-outline" size={16} color={colors.text} />
          </Pressable>
        ) : null}

        <View style={styles.avatarWrap}>
          <View style={[styles.avatarRing, { borderColor: colors.background, backgroundColor: colors.surface }]}>
            {detail.iconUrl ? (
              <Image source={{ uri: detail.iconUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${colors.primary}22` }]}>
                <Ionicons name="people" size={28} color={colors.primary} />
              </View>
            )}
          </View>
          {canEditBranding && onEditBranding ? (
            <Pressable
              style={[styles.editAvatarBtn, { backgroundColor: colors.primary }]}
              onPress={onEditBranding}
              hitSlop={6}
            >
              <Ionicons name="camera" size={12} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.info}>
        <Text variant="h2" numberOfLines={2} style={styles.title}>
          {detail.name}
        </Text>
        <Text secondary variant="caption">
          {communityCategoryLabel(detail.category)} · {regionName}
        </Text>

        <View style={styles.metaRow}>
          <MetaPill icon="people-outline" label={`${detail.memberCount} üye`} colors={colors} />
          <MetaPill icon="newspaper-outline" label={`${detail.postCount} gönderi`} colors={colors} />
          {owner ? (
            <MetaPill
              icon="star-outline"
              label={owner.fullName ?? owner.username}
              colors={colors}
              accent={colors.warning}
            />
          ) : null}
          {detail.myRole ? (
            <MetaPill
              icon="shield-outline"
              label={COMMUNITY_ROLE_LABELS[detail.myRole]}
              colors={colors}
              accent={colors.primary}
            />
          ) : null}
        </View>

        {detail.description ? (
          <Text secondary variant="caption" style={styles.description} numberOfLines={3}>
            {detail.description}
          </Text>
        ) : null}

        {detail.members.length > 0 ? (
          <View style={styles.memberStrip}>
            <View style={styles.avatarStack}>
              {previewMembers.map((member, index) => (
                <MemberAvatar
                  key={member.userId}
                  member={member}
                  index={index}
                  colors={colors}
                  onPress={() => router.push(communityMemberProfilePath(member.userId) as never)}
                />
              ))}
              {overflowCount > 0 ? (
                <Pressable
                  onPress={onMembersPress}
                  style={[styles.overflowBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                >
                  <Text variant="caption" style={{ fontSize: 10, fontWeight: '700' }}>
                    +{overflowCount}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable style={styles.memberStripAction} onPress={onMembersPress}>
              <Text variant="caption" secondary style={styles.memberStripLabel}>
                Toplulukta kimler var?
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.actions}>
          <ActionChip
            label={detail.isMember ? 'Ayrıl' : 'Katıl'}
            icon={detail.isMember ? 'log-out-outline' : 'add-outline'}
            tone={detail.isMember ? 'default' : 'primary'}
            loading={actionLoading}
            onPress={onJoinToggle}
            colors={colors}
          />
          {detail.isMember ? (
            <ActionChip label="Paylaş" icon="create-outline" onPress={onShare} colors={colors} />
          ) : null}
          {detail.isMember && detail.conversationId && onChat ? (
            <ActionChip label="Sohbet" icon="chatbubbles-outline" onPress={onChat} colors={colors} />
          ) : null}
          {canManage && onManage ? (
            <ActionChip label="Yönet" icon="settings-outline" onPress={onManage} colors={colors} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function MetaPill({
  icon,
  label,
  colors,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  accent?: string;
}) {
  const tone = accent ?? colors.textSecondary;
  return (
    <View style={[styles.metaPill, { backgroundColor: `${tone}14`, borderColor: `${tone}33` }]}>
      <Ionicons name={icon} size={12} color={tone} />
      <Text variant="caption" numberOfLines={1} style={{ color: tone, fontWeight: '600', fontSize: 11, maxWidth: 120 }}>
        {label}
      </Text>
    </View>
  );
}

function MemberAvatar({
  member,
  index,
  colors,
  onPress,
}: {
  member: CommunityMember;
  index: number;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.stackAvatar,
        {
          marginLeft: index === 0 ? 0 : -10,
          borderColor: colors.background,
          backgroundColor: `${colors.primary}22`,
          zIndex: 10 - index,
        },
      ]}
    >
      {member.avatarUrl ? (
        <Image source={{ uri: member.avatarUrl }} style={styles.stackAvatarImage} />
      ) : (
        <Ionicons name="person" size={12} color={colors.primary} />
      )}
    </Pressable>
  );
}

function ActionChip({
  label,
  icon,
  onPress,
  tone = 'default',
  loading,
  colors,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: 'default' | 'primary';
  loading?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const toneColor = tone === 'primary' ? colors.primary : colors.textSecondary;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionChip,
        {
          borderColor: `${toneColor}44`,
          backgroundColor: tone === 'primary' ? `${colors.primary}18` : colors.surfaceElevated,
          opacity: pressed || loading ? 0.7 : 1,
        },
      ]}
      onPress={onPress}
      disabled={loading}
    >
      <Ionicons name={icon} size={14} color={toneColor} />
      <Text variant="caption" style={{ color: toneColor, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  coverWrap: {
    position: 'relative',
    marginBottom: 36,
  },
  cover: {
    width: '100%',
    height: 140,
    borderRadius: radius.xl,
  },
  coverFade: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
  },
  editCoverBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    position: 'absolute',
    left: spacing.md,
    bottom: -36,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 3,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  title: {
    letterSpacing: -0.4,
    paddingTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  description: {
    lineHeight: 18,
  },
  memberStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  memberStripAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stackAvatarImage: {
    width: '100%',
    height: '100%',
  },
  overflowBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  memberStripLabel: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
});
