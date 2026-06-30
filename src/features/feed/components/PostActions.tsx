import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { InstantPressable } from '@/components/ui/InstantPressable';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { togglePostLike, togglePostSave } from '@/features/feed/services/engagement';
import { ShareToChatSheet } from '@/features/messaging/components/ShareToChatSheet';
import { SaveCollectionSheet } from '@/features/profile/components/SaveCollectionSheet';
import { LikersSheet } from '@/features/feed/components/LikersSheet';
import { moveSavedPostToCollection } from '@/features/profile/services/savedPosts';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { FEED_FEATURE } from '@/features/feed/featureFlags';
import { PostShareSheet } from '@/features/feed/components/PostShareSheet';
import { ShareCardSheet } from '@/features/vcts/components/ShareCardSheet';
import type { FeedItem } from '@/features/feed/types';
import { formatCount } from '@/features/feed/utils';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { resolveVideoThumbnailUrl } from '@/lib/media/videoThumbnailUrl';

type PostActionsProps = {
  item: FeedItem;
  onUpdate: (patch: Partial<FeedItem>) => void;
  onCommentPress: () => void;
  onQuotePress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const ICON_SIZE = 18;
const LIKE_LONG_PRESS_MS = 1000;

export function PostActions({ item, onUpdate, onCommentPress, onQuotePress }: PostActionsProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const scale = useSharedValue(1);
  const likeInFlight = useRef(false);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [shareChatOpen, setShareChatOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [saveSheetMounted, setSaveSheetMounted] = useState(false);
  const [shareChatMounted, setShareChatMounted] = useState(false);
  const [shareSheetMounted, setShareSheetMounted] = useState(false);
  const [shareCardMounted, setShareCardMounted] = useState(false);
  const [likersMounted, setLikersMounted] = useState(false);
  const showVcts = useFeatureVisible('vcts');
  const showComment = useFeatureVisible(FEED_FEATURE.comment);
  const showQuote = useFeatureVisible(FEED_FEATURE.quote);
  const showLike = useFeatureVisible(FEED_FEATURE.like);
  const showSave = useFeatureVisible(FEED_FEATURE.save);
  const showShare = useFeatureVisible(FEED_FEATURE.share);
  const showShareChat = useFeatureVisible(FEED_FEATURE.shareChat);

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

    if (nextLiked) {
      scale.value = withSequence(withSpring(1.25), withSpring(1));
    }

    try {
      const { error } = await togglePostLike(item.sourceId, user.id, wasLiked);
      if (error) {
        onUpdate({ isLiked: wasLiked, likeCount: item.likeCount });
        Alert.alert('Hata', 'Beğeni kaydedilemedi.');
      }
    } finally {
      likeInFlight.current = false;
    }
  };

  const handleSave = async () => {
    if (!(await requireAuth('Kaydetme'))) return;
    if (!user) return;

    if (item.isSaved) {
      onUpdate({ isSaved: false, saveCount: item.saveCount - 1 });
      const { error } = await togglePostSave(item.sourceId, user.id, true);
      if (error) {
        onUpdate({ isSaved: true, saveCount: item.saveCount });
        Alert.alert('Hata', 'Kayıt kaldırılamadı.');
      }
      return;
    }

    setSaveSheetMounted(true);
    setSaveSheetOpen(true);
  };

  const handleSaveToCollection = async (collectionId: string | null) => {
    if (!user) return;
    setSaveSheetOpen(false);

    onUpdate({ isSaved: true, saveCount: item.saveCount + 1 });
    const { error } = await togglePostSave(item.sourceId, user.id, false, collectionId);
    if (error) {
      onUpdate({ isSaved: false, saveCount: item.saveCount });
      Alert.alert('Hata', 'Kayıt işlemi başarısız.');
    }
  };

  const handleChangeCollection = async () => {
    if (!(await requireAuth('Kaydetme'))) return;
    if (!user || !item.isSaved) return;
    setSaveSheetMounted(true);
    setSaveSheetOpen(true);
  };

  const handleMoveToCollection = async (collectionId: string | null) => {
    if (!user) return;
    setSaveSheetOpen(false);
    const { error } = await moveSavedPostToCollection(user.id, item.sourceId, collectionId);
    if (error) Alert.alert('Hata', 'Koleksiyon güncellenemedi.');
  };

  const handleShare = () => {
    setShareSheetMounted(true);
    setShareSheetOpen(true);
  };

  const handleShareCard = () => {
    if (!item.vctsTrustCode) {
      Alert.alert('VCTS', 'Bu gönderi için henüz güven kaydı oluşturulmamış.');
      return;
    }
    setShareCardMounted(true);
    setShareCardOpen(true);
  };

  const handleShowLikers = () => {
    if (item.likeCount <= 0) return;
    setLikersMounted(true);
    setLikersOpen(true);
  };

  const renderAction = (
    key: string,
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    onPress: () => void,
    count?: number,
    animated = false,
    onLongPress?: () => void,
  ) => {
    const inner = (
      <>
        <Ionicons name={icon} size={ICON_SIZE} color={color} />
        {count && count > 0 ? (
          <Text variant="caption" style={[styles.count, { color: colors.textMuted }]}>
            {formatCount(count)}
          </Text>
        ) : null}
      </>
    );

    if (animated) {
      return (
        <AnimatedPressable
          key={key}
          style={[styles.action, likeStyle]}
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={LIKE_LONG_PRESS_MS}
          hitSlop={HIT_SLOP}
          {...getAndroidInstantPressableProps()}
        >
          {inner}
        </AnimatedPressable>
      );
    }

    return (
      <InstantPressable
        key={key}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        onPress={onPress}
        onLongPress={onLongPress}
        hitSlop={HIT_SLOP}
      >
        {inner}
      </InstantPressable>
    );
  };

  return (
    <View style={styles.bar}>
      <View style={styles.group}>
        {showComment
          ? renderAction(
              'comment',
              'chatbubble-outline',
              colors.textMuted,
              onCommentPress,
              item.commentCount,
            )
          : null}
        {showQuote
          ? renderAction(
              'quote',
              'repeat-outline',
              colors.textMuted,
              () => {
                void (async () => {
                  if (!(await requireAuth('Alıntı'))) return;
                  onQuotePress();
                })();
              },
              item.quoteCount,
            )
          : null}
        {showLike
          ? renderAction(
              'like',
              item.isLiked ? 'heart' : 'heart-outline',
              item.isLiked ? colors.danger : colors.textMuted,
              handleLike,
              item.likeCount,
              true,
              handleShowLikers,
            )
          : null}
      </View>

      <View style={styles.group}>
        {showSave
          ? renderAction(
              'save',
              item.isSaved ? 'bookmark' : 'bookmark-outline',
              item.isSaved ? colors.primary : colors.textMuted,
              () => {
                void (async () => {
                  if (!(await requireAuth('Kaydetme'))) return;
                  void handleSave();
                })();
              },
              undefined,
              false,
              item.isSaved ? handleChangeCollection : undefined,
            )
          : null}
        {showShare ? renderAction('share', 'share-outline', colors.textMuted, handleShare) : null}
        {showShareChat
          ? renderAction(
              'shareChat',
              'paper-plane-outline',
              colors.textMuted,
              () => {
                void (async () => {
                  if (!(await requireAuth('Mesaj'))) return;
                  setShareChatMounted(true);
                  setShareChatOpen(true);
                })();
              },
            )
          : null}
        {showVcts && item.vctsTrustCode
          ? renderAction('shareCard', 'shield-checkmark-outline', colors.accent, handleShareCard)
          : null}
      </View>

      {shareSheetMounted ? (
        <PostShareSheet visible={shareSheetOpen} item={item} onClose={() => setShareSheetOpen(false)} />
      ) : null}

      {user ? (
        <>
          {saveSheetMounted ? (
            <SaveCollectionSheet
              visible={saveSheetOpen}
              userId={user.id}
              onClose={() => setSaveSheetOpen(false)}
              onSelect={item.isSaved ? handleMoveToCollection : handleSaveToCollection}
            />
          ) : null}
          {shareChatMounted ? (
            <ShareToChatSheet
              visible={shareChatOpen}
              senderId={user.id}
              card={{
                cardType: 'post',
                targetId: item.sourceId,
                title: item.title,
                preview: item.content,
                imageUrl: item.mediaUrls[0]
                  ? resolveVideoThumbnailUrl(item.mediaUrls[0]) ?? item.mediaUrls[0]
                  : null,
                mediaUrl: item.mediaUrls[0] ?? null,
                mediaType: item.mediaUrls[0]
                  ? isVideoUrl(item.mediaUrls[0])
                    ? 'video'
                    : 'image'
                  : null,
                username: item.author.username,
                fullName: item.author.fullName ?? null,
                avatarUrl: item.author.avatarUrl ?? null,
              }}
              onClose={() => setShareChatOpen(false)}
            />
          ) : null}
          {shareCardMounted && showVcts && item.vctsTrustCode ? (
            <ShareCardSheet
              visible={shareCardOpen}
              item={item}
              trustCode={item.vctsTrustCode}
              onClose={() => setShareCardOpen(false)}
            />
          ) : null}
        </>
      ) : null}

      {likersMounted ? (
        <LikersSheet
          visible={likersOpen}
          targetType="post"
          targetId={item.sourceId}
          likeCount={item.likeCount}
          onClose={() => setLikersOpen(false)}
        />
      ) : null}
    </View>
  );
}

const HIT_SLOP = { top: 6, bottom: 6, left: 4, right: 4 };

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginLeft: -4,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minHeight: 28,
  },
  actionPressed: { opacity: 0.55 },
  count: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 12,
  },
});
