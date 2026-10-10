import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useSharedValue } from 'react-native-reanimated';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { KeyboardPersistButton, KeyboardSheetLayout } from '@/components/keyboard';
import { CommentActionMenu, useCommentTapGestures, type CommentAction } from '@/components/comments';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { CommentSheet } from '@/features/feed/components/CommentSheet';
import { CommentLinkAttachment, ComposerLinkPreview, RichText } from '@/features/richtext';
import { firstUrlInText } from '@/features/richtext/utils/textSegments';
import { CanlarAuthorRow } from '@/features/vora-canlar/components/CanlarAuthor';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import {
  addCanlarComment,
  deleteCanlarComment,
  editCanlarComment,
  loadPostDetail,
  toggleCanlarCommentLike,
} from '@/features/vora-canlar/services/api';
import { formatCanlarCommentTime } from '@/features/vora-canlar/services/contentKind';
import { useCloseModalOnRouteChange } from '@/hooks/useCloseModalOnRouteChange';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type CanlarThreadComment = {
  id: string;
  body: string;
  created_at?: string;
  edited_at?: string | null;
  parent_id?: string | null;
  like_count?: number;
  liked?: boolean;
  author_id?: string | null;
  author_label?: string | null;
  replies?: CanlarThreadComment[];
};

const MAX_REPLY_DEPTH = 2;
const COMMENT_ACTION_HIT_SLOP = { top: 12, bottom: 12, left: 10, right: 10 };
const SEND_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

function nestComments(flat: CanlarThreadComment[]): CanlarThreadComment[] {
  const childrenOf = (id: string): CanlarThreadComment[] =>
    flat.filter((item) => item.parent_id === id).map((item) => ({ ...item, replies: childrenOf(item.id) }));
  return flat.filter((item) => !item.parent_id).map((item) => ({ ...item, replies: childrenOf(item.id) }));
}

function updateCommentTree(
  list: CanlarThreadComment[],
  id: string,
  patch: Partial<CanlarThreadComment>,
): CanlarThreadComment[] {
  return list.map((item) => {
    if (item.id === id) return { ...item, ...patch };
    if (item.replies?.length) return { ...item, replies: updateCommentTree(item.replies, id, patch) };
    return item;
  });
}

function removeFromCommentTree(list: CanlarThreadComment[], id: string): CanlarThreadComment[] {
  return list
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      replies: item.replies?.length ? removeFromCommentTree(item.replies, id) : item.replies,
    }));
}

export function CanlarPostComments({
  visible,
  postId,
  voraPostId,
  authorId,
  onClose,
}: {
  visible: boolean;
  postId: string;
  voraPostId?: string | null;
  authorId?: string | null;
  onClose: () => void;
}) {
  if (voraPostId) {
    return (
      <CommentSheet
        visible={visible}
        postId={voraPostId}
        postAuthorId={authorId ?? undefined}
        onClose={onClose}
      />
    );
  }
  return <CanlarCommentSheet visible={visible} postId={postId} postAuthorId={authorId} onClose={onClose} />;
}

export function CanlarCommentSheet({
  visible,
  postId,
  postAuthorId,
  onClose,
}: {
  visible: boolean;
  postId: string;
  postAuthorId?: string | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const extraContentPadding = useSharedValue(96);
  const footerHeightRef = useRef(96);
  const [footerOffset, setFooterOffset] = useState(96);
  const submitLock = useRef(false);
  useCloseModalOnRouteChange(visible, onClose);

  const [comments, setComments] = useState<CanlarThreadComment[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CanlarThreadComment | null>(null);
  const [editing, setEditing] = useState<CanlarThreadComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const result = await loadPostDetail(postId);
    const data = result.data as { comments?: CanlarThreadComment[] } | null;
    setComments(nestComments(data?.comments ?? []));
  }, [postId]);

  useEffect(() => {
    if (!visible) {
      setText('');
      setReplyTo(null);
      setEditing(null);
      submitLock.current = false;
      return;
    }
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [visible, reload]);

  const cancelComposer = () => {
    setReplyTo(null);
    setEditing(null);
    setText('');
  };

  const send = async () => {
    const body = text.trim();
    if (submitLock.current || busy || !body) return;
    if (!(await requireAuth('Yorum'))) return;
    if (!user) return;

    if (editing) {
      submitLock.current = true;
      setBusy(true);
      const result = await editCanlarComment(editing.id, body);
      submitLock.current = false;
      setBusy(false);
      if (result.error) {
        Alert.alert('Yorum', result.error);
        return;
      }
      setComments((list) => updateCommentTree(list, editing.id, { body, edited_at: new Date().toISOString() }));
      setEditing(null);
      setText('');
      return;
    }

    const parent = replyTo;
    const parentId = parent?.id ?? null;
    submitLock.current = true;
    setBusy(true);
    setText('');
    setReplyTo(null);
    const result = await addCanlarComment(postId, body, parentId);
    if (result.error) {
      setText(body);
      if (parent) setReplyTo(parent);
      submitLock.current = false;
      setBusy(false);
      Alert.alert('Yorum', result.error);
      return;
    }
    await reload();
    submitLock.current = false;
    setBusy(false);
  };

  const remove = (comment: CanlarThreadComment) => {
    Alert.alert('Yorumu sil', 'Bu yorum ve yanıtları kalkar.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const result = await deleteCanlarComment(comment.id);
            if (result.error) {
              Alert.alert('Yorum', result.error);
              return;
            }
            setComments((list) => removeFromCommentTree(list, comment.id));
          })();
        },
      },
    ]);
  };

  const like = async (comment: CanlarThreadComment) => {
    if (!(await requireAuth('Beğeni'))) return;
    const nextLiked = !comment.liked;
    const prevCount = comment.like_count ?? 0;
    setComments((list) =>
      updateCommentTree(list, comment.id, {
        liked: nextLiked,
        like_count: Math.max(0, prevCount + (nextLiked ? 1 : -1)),
      }),
    );
    const result = await toggleCanlarCommentLike(comment.id);
    if (result.error) {
      setComments((list) =>
        updateCommentTree(list, comment.id, { liked: Boolean(comment.liked), like_count: prevCount }),
      );
      Alert.alert('Beğeni', result.error);
    }
  };

  const composerLabel = editing
    ? 'Yorum düzenleniyor'
    : replyTo
      ? `@${replyTo.author_label || 'Üye'} yanıtlanıyor`
      : null;

  const footer = (
    <View
      onLayout={(event) => {
        const height = event.nativeEvent.layout.height;
        extraContentPadding.value = height;
        if (Math.abs(height - footerHeightRef.current) > 2) {
          footerHeightRef.current = height;
          setFooterOffset(height);
        }
      }}
    >
      {composerLabel ? (
        <View style={[styles.replyBar, { backgroundColor: colors.surfaceElevated }]}>
          <Text variant="caption" secondary>{composerLabel}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Vazgeç" onPress={cancelComposer}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
      <ComposerLinkPreview content={text} />
      <View style={[styles.footer, { borderColor: colors.border }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={editing ? 'Yorumu düzenle...' : replyTo ? 'Yanıt yaz...' : 'Yorum yaz...'}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
          multiline
          submitBehavior="submit"
          returnKeyType="send"
          enterKeyHint="send"
          blurOnSubmit={false}
          onSubmitEditing={() => void send()}
        />
        <KeyboardPersistButton
          accessibilityLabel={editing ? 'Düzenlemeyi kaydet' : 'Yorum gönder'}
          onPress={() => void send()}
          disabled={busy || !text.trim()}
          hitSlop={SEND_HIT_SLOP}
          style={[styles.sendBtn, { opacity: busy || !text.trim() ? 0.4 : 1 }]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={CANLAR_ACCENT} />
          ) : (
            <Ionicons name={editing ? 'checkmark' : 'send'} size={22} color={CANLAR_ACCENT} />
          )}
        </KeyboardPersistButton>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Kapat">
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <Text variant="h3">Yorumlar</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color={CANLAR_ACCENT} style={{ marginTop: 24 }} />
          ) : (
            <KeyboardSheetLayout backgroundColor={colors.surface} footer={footer} footerOffset={footerOffset} extraContentPadding={extraContentPadding}>
              <View style={styles.list}>
                {comments.length === 0 ? <Text secondary style={styles.empty}>İlk yorumu sen yap.</Text> : null}
                {comments.map((comment) => (
                  <CommentRow
                    key={comment.id}
                    comment={comment}
                    depth={0}
                    currentUserId={user?.id ?? null}
                    postAuthorId={postAuthorId ?? null}
                    onReply={(item) => { setEditing(null); setReplyTo(item); setText(''); }}
                    onEdit={(item) => { setReplyTo(null); setEditing(item); setText(item.body); }}
                    onDelete={remove}
                    onLike={(item) => void like(item)}
                    onBeforeOpen={onClose}
                  />
                ))}
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
  depth,
  currentUserId,
  postAuthorId,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onBeforeOpen,
}: {
  comment: CanlarThreadComment;
  depth: number;
  currentUserId: string | null;
  postAuthorId: string | null;
  onReply: (comment: CanlarThreadComment) => void;
  onEdit: (comment: CanlarThreadComment) => void;
  onDelete: (comment: CanlarThreadComment) => void;
  onLike: (comment: CanlarThreadComment) => void;
  onBeforeOpen: () => void;
}) {
  const { colors } = useTheme();
  const isOwn = Boolean(currentUserId && currentUserId === comment.author_id);
  const canDelete = isOwn || Boolean(currentUserId && currentUserId === postAuthorId);
  const canReply = depth < MAX_REPLY_DEPTH;
  const time = formatCanlarCommentTime(comment.created_at);
  const copy = () => { void Clipboard.setStringAsync(comment.body); };
  const actions: CommentAction[] = [];
  if (canReply) actions.push({ id: 'reply', label: 'Yanıtla', icon: 'arrow-undo-outline', onPress: () => onReply(comment) });
  if (isOwn) actions.push({ id: 'edit', label: 'Düzenle', icon: 'create-outline', onPress: () => onEdit(comment) });
  actions.push({ id: 'copy', label: 'Kopyala', icon: 'copy-outline', onPress: copy });
  if (canDelete) actions.push({ id: 'delete', label: 'Sil', icon: 'trash-outline', destructive: true, onPress: () => onDelete(comment) });

  const hasLink = Boolean(firstUrlInText(comment.body));
  const tapGestures = useCommentTapGestures({
    onDoubleTap: canReply && !hasLink ? () => onReply(comment) : undefined,
    onLongPress: hasLink ? undefined : isOwn ? () => onEdit(comment) : canReply ? () => onReply(comment) : copy,
  });

  return (
    <View style={depth > 0 ? { marginLeft: spacing.lg } : undefined}>
      <View style={styles.itemHead}>
        <View style={{ flex: 1 }}>
          <CanlarAuthorRow
            name={comment.author_label || 'Üye'}
            meta={[time, comment.edited_at ? 'düzenlendi' : null].filter(Boolean).join(' · ')}
            userId={comment.author_id}
            onBeforeOpen={onBeforeOpen}
          />
        </View>
        <CommentActionMenu actions={actions} iconColor={colors.textMuted} iconSize={16} />
      </View>
      {hasLink ? (
        <View style={styles.bodyWrap}>
          <RichText
            content={comment.body}
            style={styles.body}
            linkColor={colors.accent}
            enableMentions
            enableHashtags
            mentionColor={colors.primary}
            hashtagColor={colors.accent}
            onBeforeOpen={onBeforeOpen}
          />
        </View>
      ) : (
        <Pressable {...tapGestures} style={styles.bodyWrap}>
          <RichText
            content={comment.body}
            style={styles.body}
            linkColor={colors.accent}
            enableMentions
            enableHashtags
            mentionColor={colors.primary}
            hashtagColor={colors.accent}
            onBeforeOpen={onBeforeOpen}
          />
        </Pressable>
      )}
      <View style={styles.bodyWrap}>
        <CommentLinkAttachment content={comment.body} onBeforeOpen={onBeforeOpen} />
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={comment.liked ? 'Beğeniyi geri al' : 'Beğen'}
          onPress={() => onLike(comment)}
          hitSlop={COMMENT_ACTION_HIT_SLOP}
          style={styles.action}
        >
          <Ionicons name={comment.liked ? 'heart' : 'heart-outline'} size={14} color={comment.liked ? colors.danger : colors.textMuted} />
          {(comment.like_count ?? 0) > 0 ? (
            <Text variant="caption" secondary>{comment.like_count}</Text>
          ) : null}
        </Pressable>
        {canReply ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yanıtla"
            onPress={() => onReply(comment)}
            hitSlop={COMMENT_ACTION_HIT_SLOP}
            style={styles.action}
          >
            <Ionicons name="arrow-undo-outline" size={14} color={colors.textMuted} />
            <Text variant="caption" secondary>Yanıtla</Text>
          </Pressable>
        ) : null}
      </View>
      {comment.replies?.map((reply) => (
        <CommentRow
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          currentUserId={currentUserId}
          postAuthorId={postAuthorId}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onLike={onLike}
          onBeforeOpen={onBeforeOpen}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingTop: spacing.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.full },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  empty: { textAlign: 'center', marginVertical: spacing.lg },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bodyWrap: { marginLeft: 48 },
  body: { fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: spacing.md, marginLeft: 48, marginTop: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  replyBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 16,
    paddingVertical: 8,
  },
  sendBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
