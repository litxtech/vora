import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { IZDIVAC_ACCENT } from '@/features/izdivac/constants';
import {
  addIzdivacPostComment,
  deleteIzdivacPostComment,
  editIzdivacPostComment,
  fetchIzdivacPostComments,
} from '@/features/izdivac/services/izdivacEcosystem';
import type { IzdivacPostComment } from '@/features/izdivac/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type Props = {
  visible: boolean;
  postId: string;
  commentCount: number;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
};

const MAX_REPLY_DEPTH = 2;

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

function updateCommentTree(
  list: IzdivacPostComment[],
  id: string,
  patch: Partial<IzdivacPostComment>,
): IzdivacPostComment[] {
  return list.map((c) => {
    if (c.commentId === id) return { ...c, ...patch };
    if (c.replies?.length) return { ...c, replies: updateCommentTree(c.replies, id, patch) };
    return c;
  });
}

function removeFromCommentTree(list: IzdivacPostComment[], id: string): IzdivacPostComment[] {
  return list
    .filter((c) => c.commentId !== id)
    .map((c) => ({
      ...c,
      replies: c.replies?.length ? removeFromCommentTree(c.replies, id) : c.replies,
    }));
}

export function IzdivacCommentSheet({
  visible,
  postId,
  commentCount,
  onClose,
  onCommentAdded,
  onCommentDeleted,
}: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const extraContentPadding = useSharedValue(96);
  const footerHeightRef = useRef(96);
  const [footerOffset, setFooterOffset] = useState(96);

  const [comments, setComments] = useState<IzdivacPostComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<IzdivacPostComment | null>(null);
  const [replyTo, setReplyTo] = useState<IzdivacPostComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!visible || !postId) return;
    setLoading(true);
    void fetchIzdivacPostComments(postId)
      .then((result) => setComments(result.comments))
      .finally(() => setLoading(false));
  }, [visible, postId]);

  useEffect(() => {
    if (!visible) {
      setText('');
      setEditing(null);
      setReplyTo(null);
      submitLock.current = false;
    }
  }, [visible]);

  const handleStartReply = useCallback((comment: IzdivacPostComment) => {
    setEditing(null);
    setReplyTo(comment);
    setText('');
  }, []);

  const handleStartEdit = useCallback(
    (comment: IzdivacPostComment) => {
      if (!user || user.id !== comment.authorId) return;
      setReplyTo(null);
      setEditing(comment);
      setText(comment.body);
    },
    [user],
  );

  const cancelComposer = () => {
    setEditing(null);
    setReplyTo(null);
    setText('');
  };

  const handleCopy = useCallback((comment: IzdivacPostComment) => {
    void Clipboard.setStringAsync(comment.body);
  }, []);

  const handleDelete = useCallback(
    (comment: IzdivacPostComment) => {
      if (!user || user.id !== comment.authorId) return;
      Alert.alert('Yorumu Sil', 'Bu yorum ve yanıtları kalıcı olarak silinecek.', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const { error } = await deleteIzdivacPostComment(comment.commentId);
              if (error) {
                Alert.alert('Hata', error);
                return;
              }
              setComments((prev) => removeFromCommentTree(prev, comment.commentId));
              onCommentDeleted?.();
            })();
          },
        },
      ]);
    },
    [user, onCommentDeleted],
  );

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (submitLock.current || submitting || !trimmed) return;

    if (editing) {
      submitLock.current = true;
      setSubmitting(true);
      const { error } = await editIzdivacPostComment(editing.commentId, trimmed);
      submitLock.current = false;
      setSubmitting(false);

      if (error) {
        Alert.alert('Hata', error);
        return;
      }

      setComments((prev) =>
        updateCommentTree(prev, editing.commentId, { body: trimmed, isEdited: true }),
      );
      setEditing(null);
      setText('');
      return;
    }

    submitLock.current = true;
    setSubmitting(true);

    const parentId = replyTo?.commentId ?? null;
    setText('');
    setReplyTo(null);

    const { error } = await addIzdivacPostComment(postId, trimmed, parentId);
    if (error) {
      setText(trimmed);
      if (parentId && replyTo) setReplyTo(replyTo);
      submitLock.current = false;
      setSubmitting(false);
      Alert.alert('Yorum', error);
      return;
    }

    onCommentAdded?.();
    const refreshed = await fetchIzdivacPostComments(postId);
    setComments(refreshed.comments);
    submitLock.current = false;
    setSubmitting(false);
  };

  const composerLabel = editing
    ? 'Yorum düzenleniyor'
    : replyTo
      ? `${replyTo.authorFirstName} yanıtlanıyor`
      : null;

  const footer = (
    <View
      onLayout={(e) => {
        const height = e.nativeEvent.layout.height;
        extraContentPadding.value = height;
        if (Math.abs(height - footerHeightRef.current) > 2) {
          footerHeightRef.current = height;
          setFooterOffset(height);
        }
      }}
    >
      {composerLabel ? (
        <View style={[styles.editBar, { backgroundColor: colors.surfaceElevated }]}>
          <Text variant="caption" secondary>
            {composerLabel}
          </Text>
          <Pressable onPress={cancelComposer}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.inputRow, { borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={editing ? 'Yorumu düzenle...' : replyTo ? 'Yanıt yaz...' : 'Yorum yaz...'}
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
          <Ionicons name={editing ? 'checkmark' : 'send'} size={22} color={IZDIVAC_ACCENT} />
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
            <Text variant="h3">Yorumlar{commentCount > 0 ? ` · ${commentCount}` : ''}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={IZDIVAC_ACCENT} style={styles.loader} />
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
                      key={comment.commentId}
                      comment={comment}
                      currentUserId={user?.id ?? null}
                      depth={0}
                      onReply={handleStartReply}
                      onEdit={handleStartEdit}
                      onDelete={handleDelete}
                      onCopy={handleCopy}
                    />
                  ))
                )}
              </View>
            </KeyboardSheetLayout>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CommentRow = memo(function CommentRow({
  comment,
  currentUserId,
  depth,
  onReply,
  onEdit,
  onDelete,
  onCopy,
}: {
  comment: IzdivacPostComment;
  currentUserId: string | null;
  depth: number;
  onReply: (comment: IzdivacPostComment) => void;
  onEdit: (comment: IzdivacPostComment) => void;
  onDelete: (comment: IzdivacPostComment) => void;
  onCopy: (comment: IzdivacPostComment) => void;
}) {
  const { colors } = useTheme();
  const isPending = comment.commentId.startsWith('temp-');
  const isOwn = Boolean(currentUserId && currentUserId === comment.authorId);
  const canReply = depth < MAX_REPLY_DEPTH;

  const actions: CommentAction[] = [];
  if (canReply && !isPending) {
    actions.push({ id: 'reply', label: 'Yanıtla', icon: 'arrow-undo-outline', onPress: () => onReply(comment) });
  }
  if (isOwn && !isPending) {
    actions.push({ id: 'edit', label: 'Düzenle', icon: 'create-outline', onPress: () => onEdit(comment) });
  }
  actions.push({ id: 'copy', label: 'Kopyala', icon: 'copy-outline', onPress: () => onCopy(comment) });
  if (isOwn && !isPending) {
    actions.push({ id: 'delete', label: 'Sil', icon: 'trash-outline', destructive: true, onPress: () => onDelete(comment) });
  }

  const tapGestures = useCommentTapGestures({
    onDoubleTap: canReply && !isPending ? () => onReply(comment) : undefined,
    onLongPress: !isPending
      ? () => (isOwn ? onEdit(comment) : canReply ? onReply(comment) : onCopy(comment))
      : undefined,
  });

  return (
    <View style={[styles.commentWrap, depth > 0 && { marginLeft: spacing.lg }]}>
      <View style={[styles.comment, isPending && styles.commentPending]}>
        <View style={styles.commentHead}>
          {comment.authorAvatarUrl ? (
            <Image source={{ uri: comment.authorAvatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: `${IZDIVAC_ACCENT}16` }]}>
              <Ionicons name="person" size={13} color={IZDIVAC_ACCENT} />
            </View>
          )}
          <Text variant="caption" style={styles.authorName} numberOfLines={1}>
            {comment.authorFirstName}
          </Text>
          <Text secondary variant="caption" style={styles.time}>
            {formatRelativeTime(comment.createdAt)}
            {comment.isEdited ? ' · düzenlendi' : ''}
          </Text>
          {!isPending ? (
            <CommentActionMenu actions={actions} iconColor={colors.textMuted} iconSize={16} />
          ) : null}
        </View>
        <Pressable {...tapGestures} style={styles.commentBody}>
          <Text style={styles.commentText}>{comment.body}</Text>
        </Pressable>
      </View>

      {comment.replies?.map((reply) => (
        <CommentRow
          key={reply.commentId}
          comment={reply}
          currentUserId={currentUserId}
          depth={depth + 1}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onCopy={onCopy}
        />
      ))}
    </View>
  );
});

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
  editBar: {
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
  commentWrap: { marginBottom: spacing.md },
  comment: { gap: spacing.xs },
  commentPending: { opacity: 0.55 },
  commentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    fontWeight: '800',
    fontSize: 13,
  },
  time: {
    fontSize: 10,
    marginLeft: 'auto',
  },
  commentBody: {
    marginTop: 2,
  },
  commentText: {
    lineHeight: 20,
  },
});
