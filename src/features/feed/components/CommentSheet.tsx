import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import {
  addComment,
  fetchPostComments,
  toggleCommentLike,
} from '@/features/feed/services/engagement';
import type { FeedComment } from '@/features/feed/types';
import { formatFeedTime } from '@/features/feed/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type CommentSheetProps = {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onCommentAdded?: () => void;
};

export function CommentSheet({ visible, postId, onClose, onCommentAdded }: CommentSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();

  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !postId) return;

    setLoading(true);
    fetchPostComments(postId, user?.id ?? null)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [visible, postId, user?.id]);

  const handleSubmit = async () => {
    if (!requireAuth('Yorum')) return;
    if (!user || !text.trim()) return;

    setSubmitting(true);
    const { error } = await addComment(postId, user.id, text.trim(), replyTo?.id);
    setSubmitting(false);

    if (error) return;

    setText('');
    setReplyTo(null);
    onCommentAdded?.();

    const refreshed = await fetchPostComments(postId, user.id);
    setComments(refreshed);
  };

  const handleLike = async (comment: FeedComment) => {
    if (!requireAuth('Beğeni')) return;
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
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.sm },
            ]}
            onPress={(e) => e.stopPropagation()}
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
              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {comments.length === 0 ? (
                  <Text secondary style={styles.empty}>
                    İlk yorumu sen yap.
                  </Text>
                ) : (
                  comments.map((comment) => (
                    <CommentRow
                      key={comment.id}
                      comment={comment}
                      onReply={setReplyTo}
                      onLike={handleLike}
                      depth={0}
                    />
                  ))
                )}
              </ScrollView>
            )}

            {replyTo ? (
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
                placeholder="Yorum yaz..."
                placeholderTextColor={colors.textMuted}
                value={text}
                onChangeText={setText}
                multiline
              />
              <Pressable
                onPress={handleSubmit}
                disabled={submitting || !text.trim()}
                style={{ opacity: submitting || !text.trim() ? 0.5 : 1 }}
              >
                <Ionicons name="send" size={22} color={colors.primary} />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CommentRow({
  comment,
  onReply,
  onLike,
  depth,
}: {
  comment: FeedComment;
  onReply: (comment: FeedComment) => void;
  onLike: (comment: FeedComment) => void;
  depth: number;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.comment, { marginLeft: depth * spacing.lg }]}>
      <UserBadge author={comment.author} timeLabel={formatFeedTime(comment.createdAt)} />
      <Text style={styles.commentText}>{comment.content}</Text>
      <View style={styles.commentActions}>
        <Pressable onPress={() => onLike(comment)} style={styles.commentAction}>
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
          <Pressable onPress={() => onReply(comment)}>
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
          onReply={onReply}
          onLike={onLike}
          depth={depth + 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
  list: { maxHeight: 360 },
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
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  comment: { gap: spacing.xs, marginBottom: spacing.md },
  commentText: { marginTop: spacing.xs },
  commentActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  commentAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
