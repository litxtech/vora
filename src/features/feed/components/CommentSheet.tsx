import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { useSharedValue } from 'react-native-reanimated';
import { KeyboardSheetLayout, KeyboardPersistButton } from '@/components/keyboard';
import { CommentActionMenu, useCommentTapGestures, type CommentAction } from '@/components/comments';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { RichText, CommentLinkAttachment, ComposerLinkPreview } from '@/features/richtext';
import { firstUrlInText } from '@/features/richtext/utils/textSegments';
import { Text } from '@/components/ui/Text';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { ReportSheet } from '@/features/feed/components/ReportSheet';
import {
  addComment,
  deleteComment,
  editComment,
  fetchPostComments,
  toggleCommentLike,
} from '@/features/feed/services/engagement';
import {
  MAX_COMMENT_IMAGES,
  uploadCommentMedia,
} from '@/features/feed/services/commentMediaUpload';
import type { FeedComment } from '@/features/feed/types';
import { formatFeedTime } from '@/features/feed/utils';
import { CapsPickerSheet, CapAttachment } from '@/features/caps';
import type { Cap } from '@/features/caps/types';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { FEED_FEATURE } from '@/features/feed/featureFlags';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useCloseModalOnRouteChange } from '@/hooks/useCloseModalOnRouteChange';

type CommentSheetProps = {
  visible: boolean;
  postId: string;
  postAuthorId?: string;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
};

export function CommentSheet({ visible, postId, postAuthorId, onClose, onCommentAdded, onCommentDeleted }: CommentSheetProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const extraContentPadding = useSharedValue(0);
  const [footerOffset, setFooterOffset] = useState(96);
  useCloseModalOnRouteChange(visible, onClose);

  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [pendingCap, setPendingCap] = useState<Cap | null>(null);
  const [capsPickerOpen, setCapsPickerOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null);
  const [editing, setEditing] = useState<FeedComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const submitLock = useRef(false);
  const showCommentSubmit = useFeatureVisible(FEED_FEATURE.commentSubmit);
  const showCommentLike = useFeatureVisible(FEED_FEATURE.commentLike);
  const showCommentReply = useFeatureVisible(FEED_FEATURE.commentReply);
  const showMenuReply = useFeatureVisible(FEED_FEATURE.commentMenuReply);
  const showMenuEdit = useFeatureVisible(FEED_FEATURE.commentMenuEdit);
  const showMenuCopy = useFeatureVisible(FEED_FEATURE.commentMenuCopy);
  const showMenuDelete = useFeatureVisible(FEED_FEATURE.commentMenuDelete);
  const showMenuReport = useFeatureVisible(FEED_FEATURE.commentMenuReport);

  useEffect(() => {
    if (!visible || !postId) return;

    setLoading(true);
    fetchPostComments(postId, user?.id ?? null, postAuthorId)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [visible, postId, postAuthorId, user?.id]);

  useEffect(() => {
    if (!visible) {
      setText('');
      setMediaUris([]);
      setPendingCap(null);
      setReplyTo(null);
      setEditing(null);
      submitLock.current = false;
    }
  }, [visible]);

  const canSend = text.trim().length > 0 || mediaUris.length > 0 || Boolean(pendingCap);

  const pickCommentImage = useCallback(async () => {
    if (editing) return;
    if (mediaUris.length >= MAX_COMMENT_IMAGES) {
      Alert.alert('Limit', `En fazla ${MAX_COMMENT_IMAGES} görsel ekleyebilirsin.`);
      return;
    }
    if (!(await requireAuth('Yorum'))) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Galeriden görsel seçmek için izin vermelisin.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: MAX_COMMENT_IMAGES - mediaUris.length,
      // HEIC vb. formatlarda manipulator "image content has been lost" vermesin
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });

    if (result.canceled) return;
    const next = result.assets
      .map((asset) => asset.uri)
      .filter(Boolean)
      .slice(0, MAX_COMMENT_IMAGES - mediaUris.length);
    if (next.length === 0) return;
    setMediaUris((prev) => [...prev, ...next].slice(0, MAX_COMMENT_IMAGES));
  }, [editing, mediaUris.length, requireAuth]);

  const handleStartEdit = useCallback(
    (comment: FeedComment) => {
      if (!user || user.id !== comment.author.id) return;
      setReplyTo(null);
      setMediaUris([]);
      setEditing(comment);
      setText(comment.content === 'Medya paylaşımı' ? '' : comment.content);
    },
    [user],
  );

  const handleReply = useCallback((comment: FeedComment) => {
    setEditing(null);
    setReplyTo(comment);
  }, []);

  const cancelEdit = () => {
    setEditing(null);
    setText('');
    setMediaUris([]);
  };

  const handleSubmit = async () => {
    if (submitLock.current || submitting) return;
    if (!(await requireAuth('Yorum'))) return;
    if (!user) return;

    if (editing) {
      const newContent = text.trim();
      if (!newContent) return;
      submitLock.current = true;
      setSubmitting(true);
      const { error } = await editComment(editing.id, user.id, newContent);
      submitLock.current = false;
      setSubmitting(false);

      if (error) {
        Alert.alert('Hata', error);
        return;
      }

      const updateTree = (list: FeedComment[]): FeedComment[] =>
        list.map((c) => {
          if (c.id === editing.id) {
            return { ...c, content: newContent, isEdited: true };
          }
          if (c.replies?.length) return { ...c, replies: updateTree(c.replies) };
          return c;
        });

      setComments((prev) => updateTree(prev));
      setEditing(null);
      setText('');
      setMediaUris([]);
      setPendingCap(null);
      return;
    }

    if (!text.trim() && mediaUris.length === 0 && !pendingCap) return;

    submitLock.current = true;
    setSubmitting(true);

    let uploadedUrls: string[] = [];
    if (mediaUris.length > 0 && !pendingCap) {
      const upload = await uploadCommentMedia(user.id, mediaUris);
      if (upload.error) {
        submitLock.current = false;
        setSubmitting(false);
        Alert.alert('Hata', upload.error);
        return;
      }
      uploadedUrls = upload.urls;
    }

    const capUrls = pendingCap ? [pendingCap.imageUrl] : uploadedUrls;

    const { error } = await addComment(
      postId,
      user.id,
      text.trim(),
      replyTo?.id,
      capUrls,
      pendingCap?.id ?? null,
    );
    submitLock.current = false;
    setSubmitting(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    setText('');
    setMediaUris([]);
    setPendingCap(null);
    setReplyTo(null);
    onCommentAdded?.();

    const refreshed = await fetchPostComments(postId, user.id, postAuthorId);
    setComments(refreshed);
  };

  const handleCopy = useCallback((comment: FeedComment) => {
    void Clipboard.setStringAsync(comment.content);
  }, []);

  const handleReportComment = useCallback(
    async (comment: FeedComment) => {
      if (!(await requireAuth('Şikayet'))) return;
      Alert.alert('Yorumu şikayet et', `@${comment.author.username}`, [
        { text: 'Şikayet Et', onPress: () => setReportCommentId(comment.id) },
        { text: 'İptal', style: 'cancel' },
      ]);
    },
    [requireAuth],
  );

  const handleDelete = useCallback((comment: FeedComment) => {
    if (!user || user.id !== comment.author.id) return;

    Alert.alert('Yorumu Sil', 'Bu yorum kalıcı olarak silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteComment(comment.id, user.id);
          if (error) {
            Alert.alert('Hata', error);
            return;
          }

          const removeFromTree = (list: FeedComment[]): FeedComment[] =>
            list
              .filter((c) => c.id !== comment.id)
              .map((c) => ({
                ...c,
                replies: c.replies?.length ? removeFromTree(c.replies) : c.replies,
              }));

          setComments((prev) => removeFromTree(prev));
          onCommentDeleted?.();
        },
      },
    ]);
  }, [user, onCommentDeleted]);

  const handleLike = useCallback(
    async (comment: FeedComment) => {
      if (!(await requireAuth('Beğeni'))) return;
      if (!user) return;

      const next = !comment.isLiked;
      const updateTree = (list: FeedComment[]): FeedComment[] =>
        list.map((c) => {
          if (c.id === comment.id) {
            return { ...c, isLiked: next, likeCount: c.likeCount + (next ? 1 : -1) };
          }
          if (c.replies?.length) return { ...c, replies: updateTree(c.replies) };
          return c;
        });

      setComments((prev) => updateTree(prev));
      await toggleCommentLike(comment.id, user.id, comment.isLiked);
    },
    [requireAuth, user],
  );

  const footer = (
    <View
      onLayout={(e) => {
        const height = e.nativeEvent.layout.height;
        extraContentPadding.value = height;
        setFooterOffset(height);
      }}
    >
      {editing ? (
        <View style={[styles.replyBar, { backgroundColor: colors.surfaceElevated }]}>
          <Text variant="caption" secondary>
            Yorum düzenleniyor
          </Text>
          <Pressable onPress={cancelEdit}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : replyTo ? (
        <View style={[styles.replyBar, { backgroundColor: colors.surfaceElevated }]}>
          <Text variant="caption" secondary>
            @{replyTo.author.username} yanıtlanıyor
          </Text>
          <Pressable onPress={() => setReplyTo(null)}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <ComposerLinkPreview content={text} />

      {!editing && pendingCap ? (
        <View style={styles.pendingCapWrap}>
          <Image
            source={{ uri: pendingCap.thumbUrl ?? pendingCap.imageUrl }}
            style={styles.pendingThumb}
            contentFit="contain"
          />
          <Pressable
            style={styles.pendingRemove}
            onPress={() => setPendingCap(null)}
            hitSlop={6}
            accessibilityLabel="Caps kaldır"
          >
            <Ionicons name="close-circle" size={18} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      {!editing && !pendingCap && mediaUris.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pendingMediaRow}
        >
          {mediaUris.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.pendingThumbWrap}>
              <Image source={{ uri }} style={styles.pendingThumb} />
              <Pressable
                style={styles.pendingRemove}
                onPress={() => setMediaUris((prev) => prev.filter((_, i) => i !== index))}
                hitSlop={6}
                accessibilityLabel="Görseli kaldır"
              >
                <Ionicons name="close-circle" size={18} color="#fff" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={[styles.inputRow, { borderColor: colors.border }]}>
        {!editing ? (
          <>
            <Pressable
              onPress={() => void pickCommentImage()}
              hitSlop={8}
              disabled={submitting || mediaUris.length >= MAX_COMMENT_IMAGES || Boolean(pendingCap)}
              accessibilityLabel="Galeriden görsel ekle"
              style={styles.mediaBtn}
            >
              <Ionicons
                name="image-outline"
                size={22}
                color={
                  mediaUris.length >= MAX_COMMENT_IMAGES || pendingCap
                    ? colors.textMuted
                    : colors.primary
                }
              />
            </Pressable>
          </>
        ) : null}
        <View style={[styles.commentInputWrap, { backgroundColor: colors.surfaceElevated }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={editing ? 'Yorumu düzenle...' : 'Yorum yaz...'}
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            submitBehavior="submit"
            returnKeyType="send"
            enterKeyHint="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSubmit}
          />
          {!editing ? (
            <Pressable
              onPress={() => setCapsPickerOpen(true)}
              hitSlop={8}
              disabled={submitting}
              accessibilityLabel="Caps ekle"
              style={styles.inlineCapsBtn}
            >
              <Ionicons name="happy-outline" size={20} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
        {showCommentSubmit ? (
          <KeyboardPersistButton
            onPress={handleSubmit}
            disabled={submitting || !canSend}
            hitSlop={SEND_HIT_SLOP}
            style={[styles.sendBtn, { opacity: submitting || !canSend ? 0.45 : 1 }]}
            accessibilityLabel={editing ? 'Düzenlemeyi kaydet' : 'Yorum gönder'}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name={editing ? 'checkmark' : 'send'} size={22} color={colors.primary} />
            )}
          </KeyboardPersistButton>
        ) : null}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Kapat">
        <Pressable
          style={[styles.sheetWrap, { backgroundColor: colors.surface }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="h3">Yorumlar</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <KeyboardSheetLayout
              backgroundColor={colors.surface}
              footer={footer}
              footerOffset={footerOffset}
              extraContentPadding={extraContentPadding}
            >
              <View style={styles.commentList}>
                {comments.length === 0 ? (
                  <Text secondary style={styles.empty}>
                    İlk yorumu sen yap.
                  </Text>
                ) : (
                  comments.map((comment) => (
                    <CommentRow
                      key={comment.id}
                      comment={comment}
                      currentUserId={user?.id ?? null}
                      onReply={handleReply}
                      onEdit={handleStartEdit}
                      onLike={handleLike}
                      onReport={handleReportComment}
                      onDelete={handleDelete}
                      onCopy={handleCopy}
                      onAuthorNavigate={onClose}
                      depth={0}
                      showLike={showCommentLike}
                      showReply={showCommentReply}
                      showMenuReply={showMenuReply}
                      showMenuEdit={showMenuEdit}
                      showMenuCopy={showMenuCopy}
                      showMenuDelete={showMenuDelete}
                      showMenuReport={showMenuReport}
                    />
                  ))
                )}
              </View>
            </KeyboardSheetLayout>
          )}
        </Pressable>
      </Pressable>

      {reportCommentId ? (
        <ReportSheet
          visible={!!reportCommentId}
          targetType="comment"
          targetId={reportCommentId}
          onClose={() => setReportCommentId(null)}
        />
      ) : null}
      <CapsPickerSheet
        visible={capsPickerOpen}
        onClose={() => setCapsPickerOpen(false)}
        onSelect={(cap) => {
          setPendingCap(cap);
          setMediaUris([]);
        }}
      />
    </Modal>
  );
}

const COMMENT_MEDIA_GAP = 4;
const COMMENT_SHEET_H_PAD = spacing.lg * 2;

const CommentMediaGrid = memo(function CommentMediaGrid({
  urls,
  depth,
  onOpen,
}: {
  urls: string[];
  depth: number;
  onOpen: (index: number) => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const available = Math.max(
    200,
    windowWidth - COMMENT_SHEET_H_PAD - depth * spacing.lg - spacing.md,
  );
  const count = urls.length;

  if (count === 1) {
    return (
      <Pressable
        onPress={() => onOpen(0)}
        style={[styles.mediaSolo, { width: available }]}
        accessibilityRole="imagebutton"
        accessibilityLabel="Yorum görselini aç"
      >
        <Image source={{ uri: urls[0] }} style={styles.mediaSoloImage} contentFit="cover" recyclingKey={urls[0]} />
      </Pressable>
    );
  }

  if (count === 2) {
    const cell = (available - COMMENT_MEDIA_GAP) / 2;
    return (
      <View style={[styles.mediaRow, { width: available }]}>
        {urls.map((url, index) => (
          <Pressable
            key={`${url}-${index}`}
            onPress={() => onOpen(index)}
            style={[styles.mediaCell, { width: cell, height: cell * 1.15 }]}
          >
            <Image source={{ uri: url }} style={styles.mediaFill} contentFit="cover" recyclingKey={url} />
          </Pressable>
        ))}
      </View>
    );
  }

  // 3+: 2 sütun grid, daha büyük hücreler
  const cell = (available - COMMENT_MEDIA_GAP) / 2;
  const preview = urls.slice(0, 4);
  return (
    <View style={[styles.mediaGrid, { width: available }]}>
      {preview.map((url, index) => (
        <Pressable
          key={`${url}-${index}`}
          onPress={() => onOpen(index)}
          style={[styles.mediaCell, { width: cell, height: cell }]}
        >
          <Image source={{ uri: url }} style={styles.mediaFill} contentFit="cover" recyclingKey={url} />
          {index === 3 && count > 4 ? (
            <View style={styles.mediaMoreOverlay}>
              <Text style={styles.mediaMoreText}>+{count - 4}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
});

const CommentRow = memo(function CommentRow({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onLike,
  onReport,
  onDelete,
  onCopy,
  onAuthorNavigate,
  depth,
  showLike,
  showReply,
  showMenuReply,
  showMenuEdit,
  showMenuCopy,
  showMenuDelete,
  showMenuReport,
}: {
  comment: FeedComment;
  currentUserId: string | null;
  onReply: (comment: FeedComment) => void;
  onEdit: (comment: FeedComment) => void;
  onLike: (comment: FeedComment) => void;
  onReport: (comment: FeedComment) => void;
  onDelete: (comment: FeedComment) => void;
  onCopy: (comment: FeedComment) => void;
  onAuthorNavigate: () => void;
  depth: number;
  showLike: boolean;
  showReply: boolean;
  showMenuReply: boolean;
  showMenuEdit: boolean;
  showMenuCopy: boolean;
  showMenuDelete: boolean;
  showMenuReport: boolean;
}) {
  const { colors } = useTheme();
  const isOwnComment = currentUserId === comment.author.id;
  const canReply = depth < 2 && showReply;
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const mediaUrls = comment.mediaUrls ?? [];
  const showText =
    comment.content.trim().length > 0 &&
    comment.content !== 'Medya paylaşımı' &&
    comment.content !== 'Caps';
  const showCap = Boolean(comment.cap);

  const actions: CommentAction[] = [];
  if (canReply && showMenuReply) {
    actions.push({ id: 'reply', label: 'Yanıtla', icon: 'arrow-undo-outline', onPress: () => onReply(comment) });
  }
  if (isOwnComment && showMenuEdit) {
    actions.push({ id: 'edit', label: 'Düzenle', icon: 'create-outline', onPress: () => onEdit(comment) });
  }
  if (showMenuCopy && showText) {
    actions.push({ id: 'copy', label: 'Kopyala', icon: 'copy-outline', onPress: () => onCopy(comment) });
  }
  if (isOwnComment && showMenuDelete) {
    actions.push({ id: 'delete', label: 'Sil', icon: 'trash-outline', destructive: true, onPress: () => onDelete(comment) });
  } else if (!isOwnComment && showMenuReport) {
    actions.push({ id: 'report', label: 'Şikayet', icon: 'flag-outline', onPress: () => onReport(comment) });
  }

  const hasLink = showText && Boolean(firstUrlInText(comment.content));
  const tapGestures = useCommentTapGestures({
    onDoubleTap: canReply && !hasLink ? () => onReply(comment) : undefined,
    onLongPress: hasLink
      ? undefined
      : isOwnComment && showMenuEdit
        ? () => onEdit(comment)
        : canReply && showMenuReply
          ? () => onReply(comment)
          : showMenuCopy && showText
            ? () => onCopy(comment)
            : undefined,
  });

  return (
    <View style={[styles.comment, { marginLeft: depth * spacing.lg }]}>
      <View style={styles.commentHeader}>
        <View style={styles.commentHeaderBadge}>
          <UserBadge
            author={comment.author}
            timeLabel={`${formatFeedTime(comment.createdAt)}${comment.isEdited ? ' · düzenlendi' : ''}`}
            onBeforeNavigate={onAuthorNavigate}
            linkToProfile
          />
        </View>
        <CommentActionMenu actions={actions} iconColor={colors.textMuted} iconSize={16} />
      </View>
      {showText ? (
        hasLink ? (
          <View style={styles.commentBody}>
            <RichText
              content={comment.content}
              style={styles.commentText}
              linkColor={colors.accent}
              enableMentions
              enableHashtags
              mentionColor={colors.primary}
              hashtagColor={colors.accent}
              onBeforeOpen={onAuthorNavigate}
            />
          </View>
        ) : (
          <Pressable {...tapGestures} style={styles.commentBody}>
            <RichText
              content={comment.content}
              style={styles.commentText}
              linkColor={colors.accent}
              enableMentions
              enableHashtags
              mentionColor={colors.primary}
              hashtagColor={colors.accent}
              onBeforeOpen={onAuthorNavigate}
            />
          </Pressable>
        )
      ) : null}
      {showText ? (
        <CommentLinkAttachment content={comment.content} onBeforeOpen={onAuthorNavigate} />
      ) : null}
      {showCap && comment.cap ? (
        <View style={styles.capWrap}>
          <CapAttachment
            capId={comment.cap.id}
            imageUrl={comment.cap.thumbUrl ?? comment.cap.imageUrl}
            videoUrl={comment.cap.videoUrl}
            width={comment.cap.width}
            height={comment.cap.height}
            startMs={comment.cap.startMs}
            endMs={comment.cap.endMs}
            overlay={comment.cap.overlay}
            creator={comment.cap.creator}
            autoplay={false}
          />
        </View>
      ) : mediaUrls.length > 0 ? (
        <CommentMediaGrid
          urls={mediaUrls}
          depth={depth}
          onOpen={(index) => {
            setViewerIndex(index);
            setViewerOpen(true);
          }}
        />
      ) : null}
      <View style={styles.commentActions}>
        {showLike ? (
          <Pressable
            onPress={() => onLike(comment)}
            hitSlop={COMMENT_ACTION_HIT_SLOP}
            style={styles.commentActionBtn}
          >
            <Ionicons
              name={comment.isLiked ? 'heart' : 'heart-outline'}
              size={14}
              color={comment.isLiked ? colors.danger : colors.textMuted}
            />
            {comment.likeCount > 0 ? (
              <Text variant="caption" secondary>
                {comment.likeCount}
              </Text>
            ) : null}
          </Pressable>
        ) : null}
        {canReply ? (
          <Pressable
            onPress={() => onReply(comment)}
            hitSlop={COMMENT_ACTION_HIT_SLOP}
            style={styles.commentActionBtn}
          >
            <Ionicons name="arrow-undo-outline" size={14} color={colors.textMuted} />
            <Text variant="caption" secondary>
              Yanıtla
            </Text>
          </Pressable>
        ) : null}
      </View>
      {comment.replies?.map((reply) => (
        <CommentRow
          key={reply.id}
          comment={reply}
          currentUserId={currentUserId}
          onReply={onReply}
          onEdit={onEdit}
          onLike={onLike}
          onReport={onReport}
          onDelete={onDelete}
          onCopy={onCopy}
          onAuthorNavigate={onAuthorNavigate}
          depth={depth + 1}
          showLike={showLike}
          showReply={showReply}
          showMenuReply={showMenuReply}
          showMenuEdit={showMenuEdit}
          showMenuCopy={showMenuCopy}
          showMenuDelete={showMenuDelete}
          showMenuReport={showMenuReport}
        />
      ))}
      <FullScreenMediaViewer
        visible={viewerOpen}
        urls={mediaUrls}
        startIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
});

const COMMENT_ACTION_HIT_SLOP = { top: 12, bottom: 12, left: 10, right: 10 };
const SEND_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    height: '85%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loader: { marginVertical: spacing.xl },
  empty: { textAlign: 'center', marginVertical: spacing.xl },
  replyBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  mediaBtn: {
    minWidth: 40,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  pendingMediaRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  pendingCapWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  pendingThumbWrap: {
    position: 'relative',
  },
  pendingThumb: {
    width: 72,
    height: 72,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  pendingRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  capWrap: {
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  commentInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    minHeight: 42,
    paddingLeft: spacing.md,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  inlineCapsBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentList: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  comment: { gap: spacing.xs, marginBottom: spacing.md },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentHeaderBadge: { flex: 1 },
  commentBody: { marginTop: spacing.xs },
  commentText: {},
  mediaSolo: {
    marginTop: spacing.xs,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.06)',
    height: 220,
  },
  mediaSoloImage: {
    width: '100%',
    height: '100%',
  },
  mediaRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    gap: COMMENT_MEDIA_GAP,
  },
  mediaGrid: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COMMENT_MEDIA_GAP,
  },
  mediaCell: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  mediaFill: {
    width: '100%',
    height: '100%',
  },
  mediaMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaMoreText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  commentActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
});
