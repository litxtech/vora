import { useState, useRef } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shareReelLink } from '@/lib/sharing/shareContent';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SocialText } from '@/features/feed/components/SocialText';
import { Text } from '@/components/ui/Text';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { FollowButton } from '@/features/feed/components/FollowButton';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { REELS_FEATURE } from '@/features/reels/featureFlags';
import { formatCount } from '@/features/feed/utils';
import {
  deleteReel,
  recordReelShare,
  toggleReelLike,
  toggleReelSave,
} from '@/features/reels/services/reelsEngagement';
import { ShareToChatSheet } from '@/features/messaging/components/ShareToChatSheet';
import { ReportSheet } from '@/features/feed/components/ReportSheet';
import { UserSafetySheet } from '@/features/moderation/components/UserSafetySheet';
import { NewsVerificationIndicator } from '@/features/news-verification/components/NewsVerificationIndicator';
import { supportsNewsVerification } from '@/features/news-verification/constants';
import { MusicAttributionBadge } from '@/features/music/components/MusicAttributionBadge';

import { ReelCommentSheet } from '@/features/reels/components/ReelCommentSheet';
import { ReelMenuSheet } from '@/features/reels/components/ReelMenuSheet';
import { LikersSheet } from '@/features/feed/components/LikersSheet';
import type { ReelItem } from '@/features/reels/types';
import { spacing } from '@/constants/theme';
import { getMuxPlaybackUrl } from '@/lib/mux/client';
import { useAuth } from '@/providers/AuthProvider';

type ReelOverlayProps = {
  item: ReelItem;
  onUpdate: (patch: Partial<ReelItem>) => void;
  onDeleted?: () => void;
  /** Extra bottom inset to keep controls above the tab bar (0 in fullscreen modals). */
  tabBarInset?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const LIKE_LONG_PRESS_MS = 1000;

export function ReelOverlay({ item, onUpdate, onDeleted, tabBarInset = 0 }: ReelOverlayProps) {
  const insets = useSafeAreaInsets();
  const tabBarClearance =
    tabBarInset > 0 ? tabBarInset + Math.max(insets.bottom, 12) : Math.max(insets.bottom, 12);
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const showLike = useFeatureVisible(REELS_FEATURE.like);
  const showComment = useFeatureVisible(REELS_FEATURE.comment);
  const showShare = useFeatureVisible(REELS_FEATURE.share);
  const showShareChat = useFeatureVisible(REELS_FEATURE.shareChat);
  const showSave = useFeatureVisible(REELS_FEATURE.save);
  const showMore = useFeatureVisible(REELS_FEATURE.more);
  const showFollow = useFeatureVisible(REELS_FEATURE.follow);
  const scale = useSharedValue(1);
  const likeInFlight = useRef(false);
  const saveInFlight = useRef(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [shareChatOpen, setShareChatOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwner = item.author.id === user?.id;

  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleLike = async () => {
    if (!(await requireAuth('Beğeni'))) return;
    if (!user || likeInFlight.current) return;

    const wasLiked = item.isLiked;
    const nextLiked = !wasLiked;
    likeInFlight.current = true;
    onUpdate({
      isLiked: nextLiked,
      likeCount: item.likeCount + (nextLiked ? 1 : -1),
    });
    if (nextLiked) scale.value = withSequence(withSpring(1.4), withSpring(1));

    try {
      const { error } = await toggleReelLike(item.id, user.id, wasLiked);
      if (error) {
        onUpdate({ isLiked: wasLiked, likeCount: item.likeCount });
      }
    } finally {
      likeInFlight.current = false;
    }
  };

  const handleShare = async () => {
    await shareReelLink({
      reelId: item.id,
      caption: item.caption,
      authorUsername: item.author.username,
      authorDisplayName: item.author.fullName,
    });
    onUpdate({ shareCount: item.shareCount + 1 });
    await recordReelShare(item.id, user?.id);
  };

  const handleSave = async () => {
    if (!(await requireAuth('Kaydetme'))) return;
    if (!user || saveInFlight.current) return;

    const wasSaved = item.isSaved;
    const nextSaved = !wasSaved;
    saveInFlight.current = true;
    onUpdate({ isSaved: nextSaved, saveCount: item.saveCount + (nextSaved ? 1 : -1) });

    try {
      const { error } = await toggleReelSave(item.id, user.id, wasSaved);
      if (error) {
        onUpdate({ isSaved: wasSaved, saveCount: item.saveCount });
      }
    } finally {
      saveInFlight.current = false;
    }
  };

  const handleOpenComments = async () => {
    if (!(await requireAuth('Yorum'))) return;
    setCommentsOpen(true);
  };

  const handleShowLikers = () => {
    if (item.likeCount <= 0) return;
    setLikersOpen(true);
  };

  const handleDelete = () => {
    if (!user || item.author.id !== user.id) return;

    Alert.alert('Reeli Sil', 'Bu reel kalıcı olarak silinecek. Devam edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteReel(item.id, user.id);
          if (error) {
            Alert.alert('Hata', error);
            return;
          }
          onDeleted?.();
        },
      },
    ]);
  };

  const sideActionsBottom = tabBarClearance + spacing.lg;
  const bottomInfoBottom = tabBarClearance + spacing.md;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.sideActions, { bottom: sideActionsBottom }]} pointerEvents="auto">
        {showLike ? (
          <AnimatedPressable
            style={[styles.actionBtn, likeStyle]}
            onPress={handleLike}
            onLongPress={handleShowLikers}
            delayLongPress={LIKE_LONG_PRESS_MS}
            hitSlop={REEL_ACTION_HIT_SLOP}
          >
            <Ionicons
              name={item.isLiked ? 'heart' : 'heart-outline'}
              size={30}
              color={item.isLiked ? '#EF5350' : '#fff'}
            />
            <Text variant="caption" style={styles.actionLabel}>
              {formatCount(item.likeCount)}
            </Text>
          </AnimatedPressable>
        ) : null}

        {showComment ? (
          <Pressable
            style={styles.actionBtn}
            onPress={handleOpenComments}
            hitSlop={REEL_ACTION_HIT_SLOP}
            accessibilityLabel="Yorumlar"
            accessibilityRole="button"
          >
            <Ionicons name="chatbubble-outline" size={28} color="#fff" />
            <Text variant="caption" style={styles.actionLabel}>
              {formatCount(item.commentCount)}
            </Text>
          </Pressable>
        ) : null}

        {showShare ? (
          <Pressable style={styles.actionBtn} onPress={handleShare} hitSlop={REEL_ACTION_HIT_SLOP}>
            <Ionicons name="share-outline" size={28} color="#fff" />
            <Text variant="caption" style={styles.actionLabel}>
              {formatCount(item.shareCount)}
            </Text>
          </Pressable>
        ) : null}

        {showShareChat ? (
          <Pressable
            style={styles.actionBtn}
            onPress={async () => {
              if (!(await requireAuth('Mesaj'))) return;
              setShareChatOpen(true);
            }}
            hitSlop={REEL_ACTION_HIT_SLOP}
          >
            <Ionicons name="paper-plane-outline" size={26} color="#fff" />
          </Pressable>
        ) : null}

        {showSave ? (
          <Pressable style={styles.actionBtn} onPress={handleSave} hitSlop={REEL_ACTION_HIT_SLOP}>
            <Ionicons
              name={item.isSaved ? 'bookmark' : 'bookmark-outline'}
              size={26}
              color={item.isSaved ? '#FFB300' : '#fff'}
            />
            <Text variant="caption" style={styles.actionLabel}>
              {formatCount(item.saveCount)}
            </Text>
          </Pressable>
        ) : null}

        {showMore ? (
          <Pressable
            style={styles.actionBtn}
            onPress={() => setMenuOpen(true)}
            hitSlop={REEL_ACTION_HIT_SLOP}
            accessibilityLabel="Daha fazla"
            accessibilityRole="button"
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.bottomInfo, { bottom: bottomInfoBottom }]} pointerEvents="auto">
        <View style={styles.authorRow}>
          <View style={styles.authorBadge}>
            <UserBadge author={item.author} isFollowing={item.isFollowing} linkToProfile />
          </View>
          {showFollow ? (
            <FollowButton
              authorId={item.author.id}
              businessId={item.author.businessId}
              username={item.author.username}
              isFollowing={item.isFollowing}
              hideWhenFollowing
              onToggle={(next) => onUpdate({ isFollowing: next })}
            />
          ) : null}
        </View>

        {item.locationLabel ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#fff" />
            <Text variant="caption" style={styles.metaText}>
              {item.locationLabel}
              {item.district ? ` · ${item.district}` : ''}
            </Text>
          </View>
        ) : null}

        {!item.isDemo && supportsNewsVerification(item.category) ? (
          <NewsVerificationIndicator
            target={{ type: 'reel', id: item.id, regionId: item.regionId }}
            variant="reel"
            compact
          />
        ) : null}

        {item.caption ? (
          <View style={styles.captionWrap}>
            <SocialText content={item.caption} style={styles.caption} numberOfLines={4} light />
          </View>
        ) : null}

        {item.music ? <MusicAttributionBadge music={item.music} light /> : null}

        <Text variant="caption" style={styles.views}>
          {formatCount(item.viewCount)} görüntülenme
        </Text>
      </View>

      <ReelMenuSheet
        visible={menuOpen}
        isOwner={isOwner}
        onClose={() => setMenuOpen(false)}
        onReport={async () => {
          if (!(await requireAuth('Şikayet'))) return;
          setShowReport(true);
        }}
        onSafety={async () => {
          if (!(await requireAuth('Güvenlik'))) return;
          setShowSafety(true);
        }}
        onDelete={handleDelete}
      />

      <ReelCommentSheet
        visible={commentsOpen}
        reelId={item.id}
        reelAuthorId={item.author.id}
        caption={item.caption}
        onClose={() => setCommentsOpen(false)}
        onCommentAdded={() => onUpdate({ commentCount: item.commentCount + 1 })}
        onCommentDeleted={() => onUpdate({ commentCount: Math.max(0, item.commentCount - 1) })}
      />

      <ReportSheet
        visible={showReport}
        targetType="reel"
        targetId={item.id}
        onClose={() => setShowReport(false)}
      />

      <UserSafetySheet
        visible={showSafety}
        userId={item.author.id}
        username={item.author.username}
        onReport={() => setShowReport(true)}
        onClose={() => setShowSafety(false)}
      />

      {user ? (
        <ShareToChatSheet
          visible={shareChatOpen}
          senderId={user.id}
          card={{
            cardType: 'reel',
            targetId: item.id,
            preview: item.caption,
            imageUrl: item.thumbnailUrl ?? null,
            mediaUrl: item.playbackId ? getMuxPlaybackUrl(item.playbackId) : null,
            mediaType: 'video',
            username: item.author.username,
            fullName: item.author.fullName ?? null,
            avatarUrl: item.author.avatarUrl ?? null,
            title: item.author.fullName ?? item.author.username,
          }}
          onClose={() => setShareChatOpen(false)}
        />
      ) : null}

      <LikersSheet
        visible={likersOpen}
        targetType="reel"
        targetId={item.id}
        likeCount={item.likeCount}
        onClose={() => setLikersOpen(false)}
      />
    </View>
  );
}

const REEL_ACTION_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  sideActions: {
    position: 'absolute',
    right: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 48,
    minHeight: 48,
  },
  actionLabel: { color: '#fff', fontWeight: '600' },
  bottomInfo: {
    position: 'absolute',
    left: spacing.md,
    right: 80,
    gap: spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  authorBadge: {
    flex: 1,
    minWidth: 0,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  metaText: { color: '#fff' },
  captionWrap: {
    marginTop: spacing.xs,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  views: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
  },
});
