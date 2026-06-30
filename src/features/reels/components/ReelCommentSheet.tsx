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
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { useSharedValue } from 'react-native-reanimated';
import { KeyboardSheetLayout, KeyboardPersistButton } from '@/components/keyboard';
import { SocialText } from '@/features/feed/components/SocialText';
import { Text } from '@/components/ui/Text';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { ReportSheet } from '@/features/feed/components/ReportSheet';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import {
  addReelComment,
  deleteReelComment,
  editReelComment,
  fetchReelComments,
  toggleReelCommentLike,
} from '@/features/reels/services/reelComments';
import type { ReelComment } from '@/features/reels/types';
import { formatFeedTime } from '@/features/feed/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type ReelCommentSheetProps = {
  visible: boolean;
  reelId: string;
  reelAuthorId: string;
  caption?: string | null;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
};

export function ReelCommentSheet({
  visible,
  reelId,
  reelAuthorId,
  caption,
  onClose,
  onCommentAdded,
  onCommentDeleted,
}: ReelCommentSheetProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const extraContentPadding = useSharedValue(0);
  const [footerOffset, setFooterOffset] = useState(96);

  const [comments, setComments] = useState<ReelComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ReelComment | null>(null);
  const [editing, setEditing] = useState<ReelComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!visible || !reelId) return;

    setLoading(true);
    fetchReelComments(reelId, user?.id ?? null, reelAuthorId)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [visible, reelId, reelAuthorId, user?.id]);

  useEffect(() => {
    if (!visible) {
      setText('');
      setReplyTo(null);
      setEditing(null);
      submitLock.current = false;
    }
  }, [visible]);

  const handleStartEdit = useCallback(
    (comment: ReelComment) => {
      if (!user || user.id !== comment.author.id) return;
      setReplyTo(null);
      setEditing(comment);
      setText(comment.content);
    },
    [user],
  );

  const handleReply = useCallback((comment: ReelComment) => {
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
      const { error } = await editReelComment(editing.id, user.id, newContent);
      submitLock.current = false;
      setSubmitting(false);

      if (error) {
        Alert.alert('Hata', error);
        return;
      }

      const updateTree = (list: ReelComment[]): ReelComment[] =>
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
    const { error } = await addReelComment(reelId, user.id, text.trim(), replyTo?.id);
    submitLock.current = false;
    setSubmitting(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    setText('');
    setReplyTo(null);
    onCommentAdded?.();

    const refreshed = await fetchReelComments(reelId, user.id, reelAuthorId);
    setComments(refreshed);
  };

  const handleDelete = useCallback(
    (comment: ReelComment) => {
      if (!user || user.id !== comment.author.id) return;

      Alert.alert('Yorumu Sil', 'Bu yorum kalıcı olarak silinecek.', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteReelComment(comment.id, user.id);
            if (error) {
              Alert.alert('Hata', error);
              return;
            }

            const removeFromTree = (list: ReelComment[]): ReelComment[] =>
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
    },
    [user, onCommentDeleted],
  );

  const handleReport = useCallback(
    async (commentId: string) => {
      if (!(await requireAuth('Şikayet'))) return;
      setReportCommentId(commentId);
    },
    [requireAuth],
  );

  const handleLike = useCallback(
    async (comment: ReelComment) => {
      if (!(await requireAuth('Beğeni'))) return;
      if (!user) return;

      const next = !comment.isLiked;
      const updateTree = (list: ReelComment[]): ReelComment[] =>
        list.map((c) => {
          if (c.id === comment.id) {
            return { ...c, isLiked: next, likeCount: c.likeCount + (next ? 1 : -1) };
          }
          if (c.replies?.length) return { ...c, replies: updateTree(c.replies) };
          return c;
        });

      setComments((prev) => updateTree(prev));
      await toggleReelCommentLike(comment.id, user.id, comment.isLiked);
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
          placeholder={editing ? 'Yorumu düzenle...' : 'Yorum yaz... @kullanici #etiket'}
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
        <KeyboardPersistButton
          onPress={handleSubmit}
          disabled={submitting || !text.trim()}
          hitSlop={SEND_HIT_SLOP}
          style={[styles.sendBtn, { opacity: submitting || !text.trim() ? 0.45 : 1 }]}
          accessibilityLabel={editing ? 'Düzenlemeyi kaydet' : 'Yorum gönder'}
        >
          <Ionicons name={editing ? 'checkmark' : 'send'} size={22} color={colors.primary} />
        </KeyboardPersistButton>
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

          {caption ? (
            <View style={[styles.captionBox, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
              <SocialText content={caption} numberOfLines={3} />
            </View>
          ) : null}

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
                    İlk yorumu sen yap. @mention ve #etiket kullanabilirsin.
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
                      onReport={handleReport}
                      onDelete={handleDelete}
                      onAuthorNavigate={onClose}
                      depth={0}
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
  onAuthorNavigate,
  depth,
}: {
  comment: ReelComment;
  currentUserId: string | null;
  onReply: (comment: ReelComment) => void;
  onEdit: (comment: ReelComment) => void;
  onLike: (comment: ReelComment) => void;
  onReport: (commentId: string) => void;
  onDelete: (comment: ReelComment) => void;
  onAuthorNavigate: () => void;
  depth: number;
}) {
  const { colors } = useTheme();
  const isOwnComment = currentUserId === comment.author.id;

  return (
    <View style={[styles.comment, { marginLeft: depth * spacing.lg }]}>
      <View style={styles.commentHeader}>
        <UserBadge
          author={comment.author}
          timeLabel={`${formatFeedTime(comment.createdAt)}${comment.isEdited ? ' · düzenlendi' : ''}`}
          onBeforeNavigate={onAuthorNavigate}
          linkToProfile
        />
      </View>
      <SocialText content={comment.content} style={styles.commentText} />
      <View style={styles.commentActions}>
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
        {depth < 2 ? (
          <Pressable
            onPress={() => onReply(comment)}
            hitSlop={COMMENT_ACTION_HIT_SLOP}
            style={styles.commentActionBtn}
          >
            <Text variant="caption" secondary>
              Yanıtla
            </Text>
          </Pressable>
        ) : null}
        {isOwnComment ? (
          <>
            <Pressable
              onPress={() => onEdit(comment)}
              hitSlop={COMMENT_ACTION_HIT_SLOP}
              style={styles.commentActionBtn}
            >
              <Ionicons name="create-outline" size={14} color={colors.textMuted} />
              <Text variant="caption" secondary>
                Düzenle
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onDelete(comment)}
              hitSlop={COMMENT_ACTION_HIT_SLOP}
              style={styles.commentActionBtn}
            >
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text variant="caption" style={{ color: colors.danger }}>
                Sil
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => onReport(comment.id)}
            hitSlop={COMMENT_ACTION_HIT_SLOP}
            style={styles.commentActionBtn}
          >
            <Text variant="caption" secondary>
              Şikayet
            </Text>
          </Pressable>
        )}
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
          onAuthorNavigate={onAuthorNavigate}
          depth={depth + 1}
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
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetWrap: {
    height: '75%',
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
    marginBottom: spacing.sm,
  },
  captionBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
  commentHeader: { overflow: 'visible' },
  commentText: { marginTop: spacing.xs },
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
