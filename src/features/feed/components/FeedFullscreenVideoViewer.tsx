import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { SocialText } from '@/features/feed/components/SocialText';
import { FeedAuthorAvatar } from '@/features/feed/components/FeedAuthorAvatar';
import { PostActions } from '@/features/feed/components/PostActions';
import { CommentSheet } from '@/features/feed/components/CommentSheet';
import { BusinessVerifiedTick } from '@/features/profile/components/BusinessVerifiedTick';
import { authorPublicName } from '@/features/profile/services/businessIdentity';
import { navigateToAuthorProfile } from '@/features/feed/services/feedNavigation';
import { FeedFullscreenVideoPlayer } from '@/features/feed/components/FeedFullscreenVideoPlayer';
import { VideoProcessingOverlay } from '@/components/media/VideoProcessingOverlay';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { useLocalVideoPreviewStore } from '@/features/feed/store/localVideoPreviewStore';
import { warmLocalVideoPoster } from '@/features/feed/services/warmLocalVideoPoster';
import { parseProcessingVideoId } from '@/lib/media/videoProcessingUrl';
import { isPlayableVideoUrl } from '@/lib/media/videoSource';
import { resolvePlaybackUrl } from '@/lib/media/resolvePlaybackUrl';
import { resolveVideoThumbnailUrl } from '@/lib/media/videoThumbnailUrl';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import type { FeedItem } from '@/features/feed/types';
import type { LocalVideoPreviewEntry } from '@/features/feed/store/localVideoPreviewStore';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type FeedFullscreenVideoViewerProps = {
  item: FeedItem;
  visible: boolean;
  mediaIndex?: number;
  onClose: () => void;
  onUpdate: (patch: Partial<FeedItem>) => void;
  onQuotePress?: () => void;
};

function resolveViewerVideoUri(
  url: string,
  localById: Record<string, LocalVideoPreviewEntry>,
): string | null {
  const videoId = parseProcessingVideoId(url);
  if (videoId) {
    const local = localById[videoId]?.uri;
    if (local && isPlayableVideoUrl(local)) return normalizeLocalFileUri(local);
    return null;
  }
  const playback = resolvePlaybackUrl(url);
  if (playback && isPlayableVideoUrl(playback)) return playback;
  if (isPlayableVideoUrl(url)) return url;
  return null;
}

function resolveViewerPosterUri(
  url: string,
  localById: Record<string, LocalVideoPreviewEntry>,
): string | null {
  const videoId = parseProcessingVideoId(url);
  if (videoId) {
    const entry = localById[videoId];
    if (entry?.posterUri) return entry.posterUri;
    if (entry?.uri) warmLocalVideoPoster(videoId, entry.uri);
    return null;
  }
  return resolveVideoThumbnailUrl(url);
}

/**
 * Feed video tam ekran:
 * - Tıklayınca kapanmaz
 * - Beğeni / yorum / diğer aksiyonlar görünür
 * - Sola veya sağa kaydırınca çıkar
 */
export function FeedFullscreenVideoViewer({
  item,
  visible,
  mediaIndex = 0,
  onClose,
  onUpdate,
  onQuotePress,
}: FeedFullscreenVideoViewerProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const localById = useLocalVideoPreviewStore((s) => s.byVideoId);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const videoUrl = useMemo(() => {
    const atIndex = item.mediaUrls[mediaIndex];
    if (atIndex && isVideoUrl(atIndex)) return atIndex;
    return item.mediaUrls.find((u) => isVideoUrl(u)) ?? '';
  }, [item.mediaUrls, mediaIndex]);

  const playableUri = useMemo(
    () => (videoUrl ? resolveViewerVideoUri(videoUrl, localById) : null),
    [videoUrl, localById],
  );

  const posterUri = useMemo(
    () => (videoUrl ? resolveViewerPosterUri(videoUrl, localById) : null),
    [videoUrl, localById],
  );

  useEffect(() => {
    if (!visible) {
      setCommentsOpen(false);
      setReady(false);
      return;
    }
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, [visible]);

  const requestClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!visible) return null;

  const caption = [item.title, item.content].filter(Boolean).join('\n\n').trim();
  const displayName = authorPublicName(item.author);
  const showVerifiedTick = item.author.isVerified && !item.author.isBusinessVerified;

  const openAuthorProfile = () => {
    if (item.author.id.startsWith('demo-')) return;
    requestClose();
    navigateToAuthorProfile(item.author);
  };

  const normalizedPoster = posterUri ? normalizeLocalFileUri(posterUri) : null;
  const localPoster =
    normalizedPoster &&
    (normalizedPoster.startsWith('file://') || normalizedPoster.startsWith('content://'));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onShow={() => setReady(true)}
      onRequestClose={requestClose}
    >
      <StatusBar style="light" />
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.videoStage} collapsable={false}>
          {ready && playableUri ? (
            <FeedFullscreenVideoPlayer
              key={playableUri}
              uri={playableUri}
              posterUri={posterUri}
              style={StyleSheet.absoluteFill}
              muted={!!item.videoOriginalMuted}
              onSwipeDismiss={requestClose}
            />
          ) : normalizedPoster ? (
            localPoster ? (
              <Image
                source={{ uri: normalizedPoster }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            ) : (
              <OptimizedImage
                uri={normalizedPoster}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                tier="thumb"
                recyclingKey={`fs-poster-only-${normalizedPoster}`}
              />
            )
          ) : (
            <VideoProcessingOverlay style={StyleSheet.absoluteFill} animationOnly />
          )}
        </View>

        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
          <View style={styles.topSpacer} />
          <Pressable
            onPress={requestClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>

        <View
          style={[
            styles.bottomOverlay,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
          pointerEvents="box-none"
        >
          <Pressable onPress={openAuthorProfile} style={styles.authorRow} hitSlop={6}>
            <FeedAuthorAvatar author={item.author} size={30} />
            <View style={styles.authorNameWrap}>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {displayName}
                </Text>
                {item.author.isBusinessVerified ? (
                  <BusinessVerifiedTick size={13} />
                ) : showVerifiedTick ? (
                  <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                ) : null}
              </View>
              <Text style={styles.authorUsername} numberOfLines={1}>
                @{item.author.username}
              </Text>
            </View>
          </Pressable>

          {caption ? (
            <SocialText content={caption} light numberOfLines={3} style={styles.caption} />
          ) : null}

          <View style={styles.actionsWrap}>
            <PostActions
              item={item}
              onUpdate={onUpdate}
              onCommentPress={() => setCommentsOpen(true)}
              onQuotePress={() => {
                if (onQuotePress) {
                  onQuotePress();
                  return;
                }
                setCommentsOpen(true);
              }}
            />
          </View>
        </View>

        <CommentSheet
          visible={commentsOpen}
          postId={item.sourceId}
          postAuthorId={item.author.id}
          onClose={() => setCommentsOpen(false)}
          onCommentAdded={() => onUpdate({ commentCount: item.commentCount + 1 })}
          onCommentDeleted={() =>
            onUpdate({ commentCount: Math.max(0, item.commentCount - 1) })
          }
        />
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoStage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 5,
  },
  topSpacer: {
    flex: 1,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.32)',
    zIndex: 5,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  authorNameWrap: {
    minWidth: 0,
    flexShrink: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  authorName: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 17,
    flexShrink: 1,
  },
  authorUsername: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11.5,
    lineHeight: 14,
  },
  caption: {
    fontSize: 14,
    lineHeight: 19,
  },
  actionsWrap: {
    marginTop: 2,
  },
});
