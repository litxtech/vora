import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { useSharedValue } from 'react-native-reanimated';
import { KeyboardSheetLayout, KeyboardPersistButton } from '@/components/keyboard';
import { CommentActionMenu, useCommentTapGestures, type CommentAction } from '@/components/comments';
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
import type { FeedComment } from '@/features/feed/types';
import { formatFeedTime } from '@/features/feed/utils';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { FEED_FEATURE } from '@/features/feed/featureFlags';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

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

  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
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
      setReplyTo(null);
      setEditing(null);
      submitLock.current = false;
    }
  }, [visible]);

  const handleStartEdit = useCallback(
    (comment: FeedComment) => {
      if (!user || user.id !== comment.author.id) return;
      setReplyTo(null);
      setEditing(comment);
      setText(comment.content);
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
  };

  const handleSubmit = async () => {
    if (submitLock.current || submitting) return;
    if (!(await requireAuth('Yorum'))) return;
    if (!user || !text.trim()) return;

    if (editing) {
      const newContent = text.trim();
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
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    const { error } = await addComment(postId, user.id, text.trim(), replyTo?.id);
    submitLock.current = false;
    setSubmitting(false);

    if (error) return;

    setText('');
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

      <View style={[styles.inputRow, { borderColor: colors.border }]}>
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
        {showCommentSubmit ? (
          <KeyboardPersistButton
            onPress={handleSubmit}
            disabled={submitting || !text.trim()}
            hitSlop={SEND_HIT_SLOP}
            style={[styles.sendBtn, { opacity: submitting || !text.trim() ? 0.45 : 1 }]}
            accessibilityLabel={editing ? 'Düzenlemeyi kaydet' : 'Yorum gönder'}
          >
            <Ionicons name={editing ? 'checkmark' : 'send'} size={22} color={colors.primary} />
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
    </Modal>
  );
}

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

  const actions: CommentAction[] = [];
  if (canReply && showMenuReply) {
    actions.push({ id: 'reply', label: 'Yanıtla', icon: 'arrow-undo-outline', onPress: () => onReply(comment) });
  }
  if (isOwnComment && showMenuEdit) {
    actions.push({ id: 'edit', label: 'Düzenle', icon: 'create-outline', onPress: () => onEdit(comment) });
  }
  if (showMenuCopy) {
    actions.push({ id: 'copy', label: 'Kopyala', icon: 'copy-outline', onPress: () => onCopy(comment) });
  }
  if (isOwnComment && showMenuDelete) {
    actions.push({ id: 'delete', label: 'Sil', icon: 'trash-outline', destructive: true, onPress: () => onDelete(comment) });
  } else if (!isOwnComment && showMenuReport) {
    actions.push({ id: 'report', label: 'Şikayet', icon: 'flag-outline', onPress: () => onReport(comment) });
  }

  const tapGestures = useCommentTapGestures({
    onDoubleTap: canReply ? () => onReply(comment) : undefined,
    onLongPress: isOwnComment && showMenuEdit
      ? () => onEdit(comment)
      : canReply && showMenuReply
        ? () => onReply(comment)
        : showMenuCopy
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
      <Pressable {...tapGestures} style={styles.commentBody}>
        <Text style={styles.commentText}>{comment.content}</Text>
      </Pressable>
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
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 16,
    paddingVertical: spacing.sm,
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
  comment: { gap: spacing.xs, marginBottom: spacing.md, overflow: 'visible' },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    overflow: 'visible',
  },
  commentHeaderBadge: { flex: 1, overflow: 'visible' },
  commentBody: { marginTop: spacing.xs },
  commentText: {},
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
