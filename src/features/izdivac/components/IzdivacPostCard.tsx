import { useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PremiumCallGateSheet } from '@/features/calls/components/PremiumCallGateSheet';
import { MediaCarousel } from '@/features/feed/components/MediaCarousel';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { IzdivacBadgeChips } from '@/features/izdivac/components/IzdivacBadgeChips';
import { IzdivacCommentSheet } from '@/features/izdivac/components/IzdivacCommentSheet';
import { IZDIVAC_ACCENT, IZDIVAC_GRADIENT } from '@/features/izdivac/constants';
import { useIzdivacContactActions } from '@/features/izdivac/hooks/useIzdivacContactActions';
import {
  deleteIzdivacPost,
  joinIzdivacPost,
  joinIzdivacSpace,
  toggleIzdivacPostLike,
} from '@/features/izdivac/services/izdivacEcosystem';
import { openIzdivacChat } from '@/features/izdivac/services/izdivacMessagingNavigation';
import type { IzdivacPost } from '@/features/izdivac/types';
import { izdivacDisplayName } from '@/features/izdivac/utils';
import { fetchProfileById } from '@/features/profile/services/profileData';
import type { FeedAuthor } from '@/features/feed/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useUserCard } from '@/providers/UserCardProvider';
import { isVideoUrl } from '@/lib/media/isVideoUrl';

type Props = {
  post: IzdivacPost;
  currentUserId?: string | null;
  onUpdate: (patch: Partial<IzdivacPost>) => void;
  onDelete: () => void;
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

function postAuthorToFeedAuthor(
  post: IzdivacPost,
  profile: Awaited<ReturnType<typeof fetchProfileById>>,
): FeedAuthor {
  const authorName = izdivacDisplayName({
    firstName: post.authorFirstName,
    lastName: post.authorLastName,
  });
  return {
    id: post.authorId,
    username: profile?.username ?? 'kullanici',
    fullName: profile?.fullName ?? profile?.displayName ?? authorName,
    avatarUrl: post.authorAvatarUrl ?? profile?.avatarUrl ?? null,
    role: profile?.role ?? 'user',
    isVerified: profile?.isVerified ?? false,
    isBusinessVerified: profile?.isBusinessVerified,
    businessId: profile?.businessId ?? null,
    accountType: profile?.accountType ?? 'personal',
    isPlatformCharm: profile?.isPlatformCharm ?? false,
    isPioneer: profile?.isPioneer ?? false,
    isPlatformSupporter: profile?.isPlatformSupporter ?? false,
    gender: profile?.gender ?? null,
    accountStatus: profile?.accountStatus ?? 'active',
  };
}

export function IzdivacPostCard({ post, currentUserId, onUpdate, onDelete }: Props) {
  const { colors, isDark } = useTheme();
  const { openUserCard } = useUserCard();
  const { sendMessage, messaging, gateVisible, gateCallType, closeGate } = useIzdivacContactActions();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const isInvite = post.kind === 'invite';
  const isOwner = Boolean(currentUserId && post.authorId === currentUserId);
  const canMessage = Boolean(currentUserId && !isOwner);
  const hasVideo = useMemo(() => post.mediaUrls.some(isVideoUrl), [post.mediaUrls]);

  const authorName = izdivacDisplayName({
    firstName: post.authorFirstName,
    lastName: post.authorLastName,
  });

  // Şeffaf kart: uygulama gönderi kartı gibi cam/kabuk yok; iç yüzeyler tema tabanlı ince tonlar
  const surface = useMemo(
    () => ({
      inset: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.025)',
      insetBorder: colors.border,
      pill: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    }),
    [isDark, colors.border],
  );

  const confirmDelete = () => {
    Alert.alert('Paylaşımı kaldır', 'Bu paylaşım İzdivaç duvarından silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const { error } = await deleteIzdivacPost(post.postId);
            if (error) {
              Alert.alert('Silinemedi', error);
              return;
            }
            onDelete();
          })();
        },
      },
    ]);
  };

  const openPostMenu = () => {
    if (!isOwner) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Vazgeç', 'Paylaşımı kaldır'], destructiveButtonIndex: 1, cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) confirmDelete();
        },
      );
      return;
    }
    confirmDelete();
  };

  const openAuthorCard = () => {
    void (async () => {
      const profile = await fetchProfileById(post.authorId);
      openUserCard(postAuthorToFeedAuthor(post, profile));
    })();
  };

  const toggleLike = async () => {
    const { liked, error } = await toggleIzdivacPostLike(post.postId);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    onUpdate({
      likedByMe: liked,
      likeCount: Math.max(0, post.likeCount + (liked ? 1 : -1)),
    });
  };

  const join = async () => {
    const { spaceId, error } = await joinIzdivacPost(post.postId);
    if (error) {
      Alert.alert('Katılım', error);
      return;
    }
    onUpdate({ joinedByMe: true, joinCount: post.joinCount + 1 });
    if (spaceId) {
      const joinRes = await joinIzdivacSpace(spaceId);
      if (joinRes.conversationId) openIzdivacChat(joinRes.conversationId);
    }
  };

  const openSpace = async () => {
    if (!post.spaceId) return;
    const joinRes = await joinIzdivacSpace(post.spaceId);
    if (joinRes.error) {
      Alert.alert('Oda', joinRes.error);
      return;
    }
    if (joinRes.conversationId) openIzdivacChat(joinRes.conversationId);
  };

  return (
    <>
      <View style={[styles.card, { borderBottomColor: colors.border }]}>
        {isInvite ? (
          <LinearGradient
            colors={[...IZDIVAC_GRADIENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.inviteStripe}
          />
        ) : null}

        <View style={styles.inner}>
          <Pressable
            onPress={openAuthorCard}
            style={({ pressed }) => [styles.header, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${authorName} profilini aç`}
          >
            {post.authorAvatarUrl ? (
              <Image source={{ uri: post.authorAvatarUrl }} style={[styles.avatar, { borderColor: surface.insetBorder }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${IZDIVAC_ACCENT}16`, borderColor: surface.insetBorder }]}>
                <Ionicons name="person" size={15} color={IZDIVAC_ACCENT} />
              </View>
            )}

            <View style={styles.headerCopy}>
              <View style={styles.nameRow}>
                <Text variant="caption" style={styles.authorName} numberOfLines={1}>
                  {authorName}
                </Text>
                {post.authorSpecialBadges.length > 0 ? (
                  <IzdivacBadgeChips badges={post.authorSpecialBadges} size="sm" />
                ) : null}
              </View>
              <Text secondary variant="caption" style={styles.timeLabel}>
                {formatRelativeTime(post.createdAt)}
              </Text>
            </View>

            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: isInvite ? `${IZDIVAC_ACCENT}16` : surface.pill,
                  borderColor: isInvite ? `${IZDIVAC_ACCENT}28` : surface.insetBorder,
                },
              ]}
            >
              <Ionicons
                name={isInvite ? 'calendar-outline' : post.kind === 'media' ? 'images-outline' : 'chatbox-outline'}
                size={11}
                color={isInvite || post.kind === 'media' ? IZDIVAC_ACCENT : colors.textMuted}
              />
              <Text
                variant="caption"
                style={[
                  styles.typeBadgeText,
                  { color: isInvite || post.kind === 'media' ? IZDIVAC_ACCENT : colors.textMuted },
                ]}
              >
                {isInvite ? 'Davet' : post.kind === 'media' ? 'Medya' : 'Paylaşım'}
              </Text>
            </View>

            {isOwner ? (
              <Pressable onPress={openPostMenu} hitSlop={10} style={styles.menuBtn}>
                <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </Pressable>

          {post.body.trim() ? (
            <Text variant="body" style={styles.body}>
              {post.body}
            </Text>
          ) : null}

          {post.mediaUrls.length > 0 ? (
            <View style={[styles.mediaShell, { borderColor: surface.insetBorder, backgroundColor: surface.inset }]}>
              <MediaCarousel
                urls={post.mediaUrls}
                variant="inline"
                inlineVideo={hasVideo}
                videoMounted
                videoActive={false}
                videoMuted
                maxHeight={280}
                onMediaPress={(i) => {
                  setViewerIndex(i);
                  setViewerVisible(true);
                }}
              />
            </View>
          ) : null}

          {isInvite && (post.inviteMeta?.when || post.inviteMeta?.where || post.joinCount > 0) ? (
            <View
              style={[
                styles.inviteMetaBox,
                {
                  backgroundColor: isDark ? 'rgba(233,30,99,0.1)' : 'rgba(233,30,99,0.06)',
                  borderColor: 'rgba(233,30,99,0.2)',
                },
              ]}
            >
              {post.inviteMeta?.when ? (
                <View style={[styles.metaChip, { backgroundColor: surface.inset, borderColor: surface.insetBorder }]}>
                  <Ionicons name="time-outline" size={13} color={IZDIVAC_ACCENT} />
                  <Text variant="caption" style={styles.metaText} numberOfLines={2}>
                    {post.inviteMeta.when}
                  </Text>
                </View>
              ) : null}
              {post.inviteMeta?.where ? (
                <View style={[styles.metaChip, { backgroundColor: surface.inset, borderColor: surface.insetBorder }]}>
                  <Ionicons name="location-outline" size={13} color={IZDIVAC_ACCENT} />
                  <Text variant="caption" style={styles.metaText} numberOfLines={2}>
                    {post.inviteMeta.where}
                  </Text>
                </View>
              ) : null}
              {post.joinCount > 0 ? (
                <View style={[styles.metaChip, { backgroundColor: surface.inset, borderColor: surface.insetBorder }]}>
                  <Ionicons name="people-outline" size={13} color={IZDIVAC_ACCENT} />
                  <Text variant="caption" style={styles.metaText}>
                    {post.joinCount} kişi katıldı
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {post.likeCount > 0 || post.commentCount > 0 || (isInvite && post.joinCount > 0) ? (
            <View style={styles.statsRow}>
              {post.likeCount > 0 ? (
                <Text secondary variant="caption" style={styles.statLabel}>
                  {post.likeCount} beğeni
                </Text>
              ) : null}
              {post.commentCount > 0 ? (
                <Text secondary variant="caption" style={styles.statLabel}>
                  {post.commentCount} yorum
                </Text>
              ) : null}
              {isInvite && post.joinCount > 0 ? (
                <Text secondary variant="caption" style={styles.statLabel}>
                  {post.joinCount} katılım
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.actionsBar, { backgroundColor: surface.inset, borderColor: surface.insetBorder }]}>
            <Pressable
              onPress={() => void toggleLike()}
              style={({ pressed }) => [styles.actionPill, { backgroundColor: surface.pill }, pressed && styles.pressed]}
            >
              <Ionicons
                name={post.likedByMe ? 'heart' : 'heart-outline'}
                size={15}
                color={post.likedByMe ? IZDIVAC_ACCENT : colors.textMuted}
              />
              <Text variant="caption" style={[styles.actionLabel, post.likedByMe && { color: IZDIVAC_ACCENT }]}>
                {post.likeCount > 0 ? post.likeCount : 'Beğen'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setCommentsOpen(true)}
              style={({ pressed }) => [styles.actionPill, { backgroundColor: surface.pill }, pressed && styles.pressed]}
            >
              <Ionicons name="chatbubble-outline" size={15} color={colors.primary} />
              <Text variant="caption" style={styles.actionLabel}>
                {post.commentCount > 0 ? post.commentCount : 'Yorum'}
              </Text>
            </Pressable>

            {canMessage ? (
              <Pressable
                onPress={() => void sendMessage(post.authorId)}
                disabled={messaging}
                style={({ pressed }) => [styles.actionPill, { backgroundColor: surface.pill }, pressed && styles.pressed]}
              >
                <Ionicons name="paper-plane-outline" size={15} color={IZDIVAC_ACCENT} />
                <Text variant="caption" style={[styles.actionLabel, { color: IZDIVAC_ACCENT }]}>
                  Mesaj
                </Text>
              </Pressable>
            ) : null}

            {isInvite ? (
              <Pressable
                onPress={() => void join()}
                disabled={post.joinedByMe}
                style={({ pressed }) => [
                  styles.joinPill,
                  {
                    backgroundColor: post.joinedByMe ? surface.pill : IZDIVAC_ACCENT,
                    borderColor: post.joinedByMe ? surface.insetBorder : 'transparent',
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={post.joinedByMe ? 'checkmark-circle' : 'add-circle-outline'}
                  size={14}
                  color={post.joinedByMe ? colors.textMuted : '#fff'}
                />
                <Text
                  variant="caption"
                  style={{
                    color: post.joinedByMe ? colors.textMuted : '#fff',
                    fontWeight: '800',
                    fontSize: 11,
                  }}
                >
                  {post.joinedByMe ? 'Katıldınız' : 'Katıl'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {post.spaceId && (post.joinedByMe || isOwner) ? (
            <Pressable
              onPress={() => void openSpace()}
              style={({ pressed }) => [
                styles.spaceLink,
                { backgroundColor: surface.inset, borderColor: surface.insetBorder },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="chatbubbles-outline" size={14} color={IZDIVAC_ACCENT} />
              <Text variant="caption" style={{ color: IZDIVAC_ACCENT, fontWeight: '700', fontSize: 11 }}>
                Görüşme odasına git
              </Text>
              <Ionicons name="chevron-forward" size={14} color={IZDIVAC_ACCENT} />
            </Pressable>
          ) : null}

        </View>
      </View>

      <PremiumCallGateSheet visible={gateVisible} callType={gateCallType} onClose={closeGate} />

      <IzdivacCommentSheet
        visible={commentsOpen}
        postId={post.postId}
        commentCount={post.commentCount}
        onClose={() => setCommentsOpen(false)}
        onCommentAdded={() => onUpdate({ commentCount: post.commentCount + 1 })}
        onCommentDeleted={() => onUpdate({ commentCount: Math.max(0, post.commentCount - 1) })}
      />

      {post.mediaUrls.length > 0 ? (
        <FullScreenMediaViewer
          urls={post.mediaUrls}
          visible={viewerVisible}
          startIndex={viewerIndex}
          onClose={() => setViewerVisible(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inviteStripe: {
    height: 3,
    width: '100%',
  },
  inner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  authorName: {
    fontWeight: '800',
    fontSize: 13,
  },
  timeLabel: {
    fontSize: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  typeBadgeText: {
    fontWeight: '700',
    fontSize: 9,
  },
  menuBtn: {
    padding: 2,
  },
  body: {
    lineHeight: 21,
    fontSize: 14,
  },
  mediaShell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  inviteMetaBox: {
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: IZDIVAC_ACCENT,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 6,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  joinPill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  spaceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
