import { memo, useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { getAndroidInstantPressableProps, resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { StickyKeyboardFooter, keyboardPersistPress } from '@/components/keyboard';
import { router, useIsFocused } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { CommentSheet } from '@/features/feed/components/CommentSheet';
import { FeedAuthorAvatar } from '@/features/feed/components/FeedAuthorAvatar';
import { FollowButton } from '@/features/feed/components/FollowButton';
import { HashtagText } from '@/features/feed/components/HashtagText';
import { MediaCarousel } from '@/features/feed/components/MediaCarousel';
import { FeedPostMediaOverlay } from '@/features/feed/components/FeedPostMediaOverlay';
import { PostActions } from '@/features/feed/components/PostActions';
import { QuotedPostPreview } from '@/features/feed/components/QuotedPostPreview';
import { ReportSheet } from '@/features/feed/components/ReportSheet';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { CATEGORY_STYLES, FEED_DETAIL_VIDEO_MAX_HEIGHT } from '@/features/feed/constants';
import { AdminPostActionsSheet } from '@/features/admin/components/shared/AdminPostActionsSheet';
import { createQuotePost, deletePost } from '@/features/feed/services/engagement';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { useFeedMediaViewerStore } from '@/features/feed/store/feedMediaViewerStore';
import { useFeedMusicSoundStore } from '@/features/feed/store/feedMusicSoundStore';
import { useFeedVideoPlaybackStore } from '@/features/feed/store/feedVideoPlaybackStore';
import { SensitiveMediaWrapper } from '@/features/moderation/components/SensitiveMediaWrapper';
import { MisinfoBadge } from '@/features/moderation/components/MisinfoBadge';
import { MisinfoFlagSheet } from '@/features/moderation/components/MisinfoFlagSheet';
import { UserSafetySheet } from '@/features/moderation/components/UserSafetySheet';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { FEED_FEATURE } from '@/features/feed/featureFlags';
import { NewsVerificationIndicator } from '@/features/news-verification/components/NewsVerificationIndicator';
import { supportsNewsVerification } from '@/features/news-verification/constants';
import { FeatureGate } from '@/features/feature-flags/components/FeatureGate';
import { VctsBadge } from '@/features/vcts/components/VctsBadge';
import { schedulePostView } from '@/features/feed/services/postViewTracker';
import {
  navigateToAuthorProfile,
  navigateToFeedDetail,
  prefetchFeedDetail,
} from '@/features/feed/services/feedNavigation';
import { formatPinExpiry } from '@/features/feed/services/postPinning';
import { useStandaloneMusicPlayer } from '@/features/music/hooks/useStandaloneMusicPlayer';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { focusMapOnCoordinate } from '@/features/map/services/mapNavigation';
import type { FeedItem } from '@/features/feed/types';
import { formatFeedTime } from '@/features/feed/utils';
import { canModerate } from '@/constants/roles';
import { REGIONS } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type FeedPostCardProps = {
  item: FeedItem;
  preferDirectMediaPlayback?: boolean;
  /** Liste ekranından geçirilirse her kart ayrı useIsFocused aboneliği açmaz. */
  isScreenFocused?: boolean;
  /** Akış listesinde satır görünür mü (Android ses/video durdurma) */
  isRowVisible?: boolean;
  /** Detay sayfasında tam alıntı kartı ve kenarlıksız düzen */
  mode?: 'feed' | 'detail';
  /** Detayda videoyu otomatik oynat (X tarzı gönderi açılışı) */
  focusVideo?: boolean;
  initialMediaIndex?: number;
  onUpdate: (patch: Partial<FeedItem>) => void;
  onDeleted?: () => void;
};

const AVATAR_SIZE = 40;

export function FeedPostCard(props: FeedPostCardProps) {
  if (props.isScreenFocused !== undefined) {
    return <FeedPostCardInnerMemo {...props} isScreenFocused={props.isScreenFocused} />;
  }
  return <FeedPostCardWithRouteFocus {...props} />;
}

function FeedPostCardWithRouteFocus(props: Omit<FeedPostCardProps, 'isScreenFocused'>) {
  const isScreenFocused = useIsFocused();
  return <FeedPostCardInnerMemo {...props} isScreenFocused={isScreenFocused} />;
}

const FeedPostCardInnerMemo = memo(function FeedPostCardInner({
  item,
  preferDirectMediaPlayback = false,
  isScreenFocused,
  isRowVisible = true,
  mode = 'feed',
  focusVideo = false,
  initialMediaIndex = 0,
  onUpdate,
  onDeleted,
}: FeedPostCardProps & { isScreenFocused: boolean }) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();

  const [showComments, setShowComments] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const quoteSubmitLock = useRef(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAdminActions, setShowAdminActions] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [showMisinfo, setShowMisinfo] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState<number | null>(null);
  const [mediaSlideIndex, setMediaSlideIndex] = useState(initialMediaIndex);
  const [fullscreenMusicEnabled, setFullscreenMusicEnabled] = useState(false);
  const postId = item.sourceId;
  const toggleFeedSound = useFeedMusicSoundStore((s) => s.togglePost);
  const toggleVideoSound = useFeedVideoPlaybackStore((s) => s.toggleUnmuted);
  const isFeedSoundOn = useFeedMusicSoundStore((s) => s.postId === postId);
  const isActiveVideoPost = useFeedVideoPlaybackStore((s) => s.activePostId === postId);
  const isVideoSoundOn = useFeedVideoPlaybackStore((s) => s.unmutedPostId === postId);
  const isFeedScrolling = useFeedVideoPlaybackStore((s) => s.isScrolling);
  const dismissToken = useFeedMediaViewerStore((s) => s.dismissToken);
  const showPostMoreMenu = useFeatureVisible(FEED_FEATURE.postMoreMenu);
  const showPostCardFollow = useFeatureVisible(FEED_FEATURE.postCardFollow);
  const showPostMenuDelete = useFeatureVisible(FEED_FEATURE.postMenuDelete);
  const showPostMenuReport = useFeatureVisible(FEED_FEATURE.postMenuReport);
  const showPostMenuMisinfo = useFeatureVisible(FEED_FEATURE.postMenuMisinfo);
  const showPostMenuSafety = useFeatureVisible(FEED_FEATURE.postMenuSafety);
  const showPostMenuModeration = useFeatureVisible(FEED_FEATURE.postMenuModeration);

  useEffect(() => {
    if (focusVideo && initialMediaIndex > 0) {
      setMediaSlideIndex(initialMediaIndex);
    }
  }, [focusVideo, initialMediaIndex, item.sourceId]);

  useEffect(() => {
    setMediaViewerIndex(null);
  }, [dismissToken]);

  useEffect(() => {
    if (!isScreenFocused) {
      setMediaViewerIndex(null);
      setFullscreenMusicEnabled(false);
    }
  }, [isScreenFocused]);

  useEffect(() => {
    if (isRowVisible) return;
    if (isFeedSoundOn) {
      useFeedMusicSoundStore.getState().clear();
    }
    if (isVideoSoundOn) {
      useFeedVideoPlaybackStore.getState().toggleUnmuted(postId);
    }
  }, [isRowVisible, isFeedSoundOn, isVideoSoundOn, postId]);

  const isDetail = mode === 'detail';
  const isPost = item.sourceType === 'post';
  const isOwnPost = user?.id === item.author.id && isPost && !item.isDemo;
  const canModeratePost = Boolean(profile?.role && canModerate(profile.role) && isPost && !item.isDemo);
  const showVerification = isPost && supportsNewsVerification(item.category);

  const handleDeletePost = () => {
    if (!user || !isOwnPost) return;

    setShowMenu(false);
    Alert.alert('Gönderiyi Sil', 'Bu gönderi kalıcı olarak silinecek. Devam edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deletePost(item.sourceId, user.id);
          if (error) {
            Alert.alert('Hata', error);
            return;
          }
          onDeleted?.();
        },
      },
    ]);
  };

  useEffect(() => {
    if (!isScreenFocused || item.isDemo || item.sourceType !== 'post') return;
    schedulePostView(item.sourceId);
  }, [isScreenFocused, item.sourceId, item.isDemo, item.sourceType]);

  const regionName = REGIONS.find((r) => r.id === item.regionId)?.name;
  const locationParts = [item.locationLabel, item.district, regionName].filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );
  const hasMapCoords = item.latitude != null && item.longitude != null;
  const categoryStyle = CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.general;
  const isHighlighted = item.isSponsored || item.isFeatured || item.isPinned || item.isAuthorBoosted;
  const hasMedia = item.mediaUrls.length > 0;
  const isBusinessCard = item.sourceType === 'business' || item.category === 'business';
  const isImageOnlyPost =
    isPost &&
    hasMedia &&
    item.mediaUrls.every((url) => !isVideoUrl(url));
  const hasVideo = hasMedia && item.mediaUrls.some((url) => isVideoUrl(url));
  const hasPostMusic = isImageOnlyPost && Boolean(item.musicPlayback);
  const rowInScope = isScreenFocused && isRowVisible;
  const isTargetVideoPost = isDetail || focusVideo || isActiveVideoPost;
  // Tek VideoView — görünür satırlarda eşzamanlı decode/GPU yükünü önler (Reels modeli).
  const videoMounted =
    hasVideo && rowInScope && isTargetVideoPost && (isDetail || focusVideo || !isFeedScrolling);
  const videoActive = videoMounted && (isDetail || focusVideo || !isFeedScrolling);
  const inFullscreen = mediaViewerIndex !== null;
  const musicUiEnabled = inFullscreen ? fullscreenMusicEnabled : isFeedSoundOn;
  const musicScopeActive = rowInScope && hasPostMusic;
  const musicPlaying = musicScopeActive && musicUiEnabled;
  const showMediaSoundToggle = hasPostMusic || hasVideo;
  const mediaSoundEnabled = hasPostMusic ? musicUiEnabled : isVideoSoundOn;
  const detailVideoMedia =
    isDetail && hasVideo
      ? {
          width: screenWidth - spacing.md * 4,
          marginLeft: -(AVATAR_SIZE + spacing.sm),
        }
      : null;

  useStandaloneMusicPlayer({
    config: item.musicPlayback,
    scopeActive: musicScopeActive,
    playing: musicPlaying,
  });

  useEffect(() => {
    if (!showQuote) {
      quoteSubmitLock.current = false;
    }
  }, [showQuote]);

  const handleQuote = async () => {
    if (quoteSubmitLock.current) return;
    if (!(await requireAuth('Alıntı'))) return;
    if (!user || !quoteText.trim()) return;

    quoteSubmitLock.current = true;
    const { error } = await createQuotePost(user.id, item.regionId, item.sourceId, quoteText.trim());
    quoteSubmitLock.current = false;

    if (error) {
      Alert.alert('Hata', 'Alıntı paylaşılamadı.');
      return;
    }

    onUpdate({ quoteCount: item.quoteCount + 1 });
    setShowQuote(false);
    setQuoteText('');
    Alert.alert('Paylaşıldı', 'Alıntın akışa eklendi.');
  };

  const openDetail = () => {
    if (isDetail) return;
    if (item.sourceType === 'post') {
      navigateToFeedDetail('post', item.sourceId, item.isDemo);
      return;
    }
    prefetchFeedDetail(item.sourceType, item.sourceId);
    navigateToFeedDetail(item.sourceType, item.sourceId, item.isDemo);
  };

  const openLocation = () => {
    if (!hasMapCoords || item.latitude == null || item.longitude == null) return;
    focusMapOnCoordinate(item.latitude, item.longitude);
  };

  const openAuthor = () => {
    if (item.author.id.startsWith('demo-')) return;
    navigateToAuthorProfile(item.author);
  };

  const handleMediaPress = (index: number) => {
    const url = item.mediaUrls[index];
    const isVideo = url ? isVideoUrl(url) : false;

    if (isVideo) {
      if (preferDirectMediaPlayback) {
        setMediaViewerIndex(index);
        return;
      }
      if (isDetail) {
        setMediaViewerIndex(index);
        return;
      }
      if (isPost) {
        navigateToFeedDetail('post', item.sourceId, item.isDemo, { focusVideo: true, mediaIndex: index });
        return;
      }
    }

    if (isDetail) {
      setMediaViewerIndex(index);
      return;
    }

    if (isPost && hasVideo) {
      openDetail();
      return;
    }

    setMediaViewerIndex(index);
  };

  return (
    <View style={[styles.post, !isDetail && { borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        <Pressable onPress={openAuthor} style={styles.avatarCol} hitSlop={4}>
          <FeedAuthorAvatar author={item.author} size={AVATAR_SIZE} />
        </Pressable>

        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View style={styles.headerBadge} pointerEvents="box-none">
              <UserBadge
                author={item.author}
                timeLabel={formatFeedTime(item.createdAt)}
                isFollowing={item.isFollowing}
                linkToProfile
                variant="post"
                hideAvatar
              />
            </View>
            <View style={styles.headerActions} pointerEvents="box-none">
              {showPostCardFollow ? (
                <FollowButton
                  authorId={item.author.id}
                  businessId={item.author.businessId}
                  username={item.author.username}
                  isFollowing={item.isFollowing}
                  onToggle={(next) => onUpdate({ isFollowing: next })}
                />
              ) : null}
              {showPostMoreMenu ? (
                <Pressable onPress={() => setShowMenu(true)} hitSlop={8} style={styles.menuBtn}>
                  <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {item.quotedPost ? (
            <View style={[styles.quoteRibbon, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}28` }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                Alıntı paylaştı
              </Text>
            </View>
          ) : null}

          {isHighlighted ? (
            <View style={styles.highlightRow}>
              <Ionicons
                name={
                  item.isPinned
                    ? 'pin'
                    : item.isSponsored
                      ? 'star'
                      : item.isAuthorBoosted
                        ? 'rocket'
                        : 'flame'
                }
                size={12}
                color={colors.warning}
              />
              <Text variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>
                {item.isPinned
                  ? `Sabitlenmiş${item.pinnedUntil ? ` · ${formatPinExpiry(item.pinnedUntil)}` : ' · Süresiz'}`
                  : item.isSponsored
                    ? 'Sponsorlu'
                    : item.isAuthorBoosted
                      ? 'Öne çıkan profil'
                      : 'Öne çıkan'}
              </Text>
            </View>
          ) : null}

          {item.category !== 'general' || locationParts.length > 0 ? (
            <View style={styles.metaRow}>
              {item.category !== 'general' ? (
                <View style={[styles.metaChip, { backgroundColor: `${categoryStyle.color}14` }]}>
                  <Ionicons name={categoryStyle.icon} size={11} color={categoryStyle.color} />
                  <Text variant="caption" style={{ color: categoryStyle.color, fontWeight: '600' }}>
                    {categoryStyle.label}
                  </Text>
                </View>
              ) : null}
              {locationParts.length > 0 ? (
                <Pressable
                  style={[styles.metaChip, { backgroundColor: `${colors.textMuted}10` }]}
                  onPress={hasMapCoords ? openLocation : undefined}
                  disabled={!hasMapCoords}
                >
                  <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                  <Text variant="caption" secondary numberOfLines={1}>
                    {locationParts.join(' · ')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {item.title ? (
            <Pressable onPress={openDetail}>
              <Text variant="label" style={styles.title}>
                {item.title}
              </Text>
            </Pressable>
          ) : null}

          <Pressable onPress={openDetail}>
            <HashtagText content={item.content} />
          </Pressable>

          {hasMedia ? (
            <SensitiveMediaWrapper isSensitive={!!item.isSensitive}>
              <View style={[styles.mediaShell, detailVideoMedia]}>
                <MediaCarousel
                  urls={item.mediaUrls}
                  variant="inline"
                  logoFrame={isBusinessCard}
                  imageContentFit="cover"
                  maxHeight={isDetail && hasVideo ? FEED_DETAIL_VIDEO_MAX_HEIGHT : undefined}
                  inlineVideo={hasVideo}
                  videoMounted={videoMounted}
                  videoActive={videoActive}
                  videoMuted={!isVideoSoundOn}
                  onMediaPress={handleMediaPress}
                  onSlideIndexChange={setMediaSlideIndex}
                  overlay={
                    <FeedPostMediaOverlay
                      music={isImageOnlyPost ? item.music : null}
                      musicAnimating={mediaSoundEnabled}
                      slideIndex={mediaSlideIndex}
                      slideCount={item.mediaUrls.length}
                      username={isImageOnlyPost ? item.author.username : undefined}
                      trustCode={item.vctsTrustCode}
                      musicSoundEnabled={mediaSoundEnabled}
                      onMusicSoundToggle={
                        showMediaSoundToggle
                          ? () =>
                              hasPostMusic
                                ? toggleFeedSound(item.sourceId)
                                : toggleVideoSound(item.sourceId)
                          : undefined
                      }
                    />
                  }
                />
              </View>
            </SensitiveMediaWrapper>
          ) : null}

          {showVerification ? (
            <NewsVerificationIndicator
              target={{ type: 'post', id: item.sourceId, regionId: item.regionId }}
            />
          ) : null}

          <MisinfoBadge
            targetType="post"
            targetId={item.sourceId}
            onPress={() => item.sourceType === 'post' && setShowMisinfo(true)}
          />

          {item.vctsTrustCode && !isImageOnlyPost ? (
            <FeatureGate featureId="vcts">
              <Pressable onPress={() => router.push(`/v/${item.vctsTrustCode}` as never)} hitSlop={8}>
                <VctsBadge trustCode={item.vctsTrustCode} status={item.vctsStatus ?? 'verified'} />
              </Pressable>
            </FeatureGate>
          ) : null}

          {item.quotedPost ? (
            <QuotedPostPreview quoted={item.quotedPost} expanded={isDetail} />
          ) : null}

          {item.isDemo ? (
            <View style={[styles.demoBadge, { borderColor: colors.warning, backgroundColor: `${colors.warning}14` }]}>
              <Text variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>
                Örnek içerik
              </Text>
            </View>
          ) : null}

          {isPost ? (
            <PostActions
              item={item}
              onUpdate={onUpdate}
              onCommentPress={() => setShowComments(true)}
              onQuotePress={() => setShowQuote(true)}
            />
          ) : (
            <Button title="Detayı Gör" variant="outline" onPress={openDetail} />
          )}

          {isPost && item.viewCount > 0 ? (
            <Pressable
              onPress={async () => {
                if (user?.id === item.author.id || item.isDemo) {
                  router.push(`/post-viewers/${item.sourceId}?authorId=${item.author.id}` as never);
                }
              }}
            >
              <Text secondary variant="caption" style={styles.views}>
                {item.viewCount.toLocaleString('tr-TR')} görüntülenme
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {isPost ? (
        <CommentSheet
          visible={showComments}
          postId={item.sourceId}
          postAuthorId={item.author.id}
          onClose={() => setShowComments(false)}
          onCommentAdded={() => onUpdate({ commentCount: item.commentCount + 1 })}
          onCommentDeleted={() => onUpdate({ commentCount: Math.max(0, item.commentCount - 1) })}
        />
      ) : null}

      <ReportSheet
        visible={showReport}
        targetType={item.sourceType === 'post' ? 'post' : item.sourceType === 'lost_found' ? 'lost_item' : 'post'}
        targetId={item.sourceId}
        onClose={() => setShowReport(false)}
      />

      <Modal visible={showMenu && showPostMoreMenu} transparent animationType={resolveModalAnimationType('fade')} onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.menu, { backgroundColor: colors.surfaceElevated }]}>
            {isOwnPost && showPostMenuDelete ? (
              <MenuItem icon="trash-outline" label="Gönderiyi Sil" destructive onPress={handleDeletePost} />
            ) : null}
            {canModeratePost && !isOwnPost && showPostMenuModeration ? (
              <MenuItem
                icon="shield-checkmark-outline"
                label="Moderasyon"
                onPress={async () => {
                  setShowMenu(false);
                  setShowAdminActions(true);
                }}
              />
            ) : null}
            {showPostMenuReport ? (
              <MenuItem
                icon="flag-outline"
                label="Şikayet Et"
                onPress={async () => {
                  setShowMenu(false);
                  setShowReport(true);
                }}
              />
            ) : null}
            {showPostMenuMisinfo ? (
              <MenuItem
                icon="alert-circle-outline"
                label="Yanlış bilgi işaretle"
                onPress={async () => {
                  setShowMenu(false);
                  setShowMisinfo(true);
                }}
              />
            ) : null}
            {showPostMenuSafety ? (
              <MenuItem
                icon="shield-outline"
                label="Engelle / Sessize Al"
                onPress={async () => {
                  setShowMenu(false);
                  setShowSafety(true);
                }}
              />
            ) : null}
          </View>
        </Pressable>
      </Modal>

      {canModeratePost ? (
        <AdminPostActionsSheet
          visible={showAdminActions}
          onClose={() => setShowAdminActions(false)}
          postId={item.sourceId}
          authorId={item.author.id}
          authorUsername={item.author.username}
          isPinned={item.isPinned}
          pinnedUntil={item.pinnedUntil}
          onPinnedChange={(pinned, pinnedUntil) =>
            onUpdate({ isPinned: pinned, pinnedUntil: pinnedUntil ?? null })
          }
          onContentRemoved={() => onDeleted?.()}
        />
      ) : null}

      <UserSafetySheet
        visible={showSafety}
        userId={item.author.id}
        username={item.author.username}
        onReport={() => setShowReport(true)}
        onClose={() => setShowSafety(false)}
      />

      <MisinfoFlagSheet
        visible={showMisinfo}
        targetType="post"
        targetId={item.sourceId}
        onClose={() => setShowMisinfo(false)}
      />

      <FullScreenMediaViewer
        urls={item.mediaUrls}
        visible={mediaViewerIndex !== null}
        startIndex={mediaViewerIndex ?? 0}
        onClose={() => setMediaViewerIndex(null)}
        musicSoundEnabled={fullscreenMusicEnabled}
        onMusicSoundToggle={hasPostMusic ? () => setFullscreenMusicEnabled((v) => !v) : undefined}
      />

      <Modal visible={showQuote} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={() => setShowQuote(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowQuote(false)} accessibilityLabel="Kapat">
          <Pressable
            style={[styles.quoteSheet, { backgroundColor: colors.surfaceElevated }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text variant="h3">Alıntı yap</Text>
            <QuotedPostPreview
              quoted={{
                id: item.sourceId,
                authorId: item.author.id,
                authorUsername: item.author.username,
                authorFullName: item.author.fullName,
                authorAvatarUrl: item.author.avatarUrl,
                authorIsVerified: item.author.isVerified,
                authorIsBusinessVerified: item.author.isBusinessVerified,
                title: item.title,
                content: item.content,
                mediaUrls: item.mediaUrls,
                createdAt: item.createdAt,
              }}
              interactive={false}
            />
            <StickyKeyboardFooter backgroundColor={colors.surfaceElevated}>
              <TextInput
                style={[styles.quoteInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Yorumunu ekle..."
                placeholderTextColor={colors.textMuted}
                value={quoteText}
                onChangeText={setQuoteText}
                multiline
                submitBehavior="submit"
                returnKeyType="send"
                enterKeyHint="send"
                blurOnSubmit={false}
                onSubmitEditing={handleQuote}
              />
              <Pressable
                {...getAndroidInstantPressableProps()}
                {...keyboardPersistPress(handleQuote)}
                disabled={!quoteText.trim()}
                style={({ pressed }) => [
                  styles.quoteShareBtn,
                  {
                    backgroundColor: quoteText.trim() ? colors.primary : colors.border,
                    opacity: !quoteText.trim() ? 0.55 : pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Text variant="label" style={{ color: '#fff', textAlign: 'center' }}>
                  Paylaş
                </Text>
              </Pressable>
            </StickyKeyboardFooter>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
});

function MenuItem({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={destructive ? colors.danger : colors.textSecondary} />
      <Text variant="label" style={destructive ? { color: colors.danger } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  post: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  avatarCol: {
    paddingTop: 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  mediaShell: {
    position: 'relative',
  },
  quoteRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  headerBadge: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  menuBtn: {
    padding: 2,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  demoBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  views: {
    marginTop: 2,
    fontSize: 12,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  menu: { borderRadius: radius.lg, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  quoteSheet: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  quotePreview: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  quoteInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  quoteShareBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
});
